<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use OpenAI\Laravel\Facades\OpenAI;

class RagService
{
    const TOP_K = 5;

    public function answer(string $question, bool $allowWebSearch = false): array
    {
        // Bypass SSL locally and point OpenRouter via custom client
        $client = \OpenAI::factory()
            ->withApiKey(env('OPENAI_API_KEY'))
            ->withBaseUri('https://openrouter.ai/api/v1')
            ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
            ->make();

        // 1. Embed the question
        $embeddingResp = $client->embeddings()->create([
            'model' => env('OPENAI_EMBEDDING_MODEL'),
            'input' => $question,
        ]);
        $vector = '[' . implode(',', $embeddingResp->embeddings[0]->embedding) . ']';

        // 2. Retrieve top-K similar chunks via cosine similarity
        $chunks = DB::select("
            SELECT chunk_text,
                   1 - (embedding <=> ?::vector) AS similarity
            FROM document_chunks
            ORDER BY embedding <=> ?::vector
            LIMIT ?
        ", [$vector, $vector, self::TOP_K]);

        // 3. Build context from retrieved chunks
        $context = collect($chunks)
            ->map(fn($c) => $c->chunk_text)
            ->implode("\n\n---\n\n");

        // 4. Generate answer with LLM
        $response = $client->chat()->create([
            'model'    => env('OPENAI_LLM_MODEL'),
            'messages' => [
                [
                    'role'    => 'system',
                    'content' => "You are a helpful assistant. Answer the user's question using ONLY the context below. If the answer is not in the context, reply EXACTLY with '__UNKNOWN__'.\n\nContext:\n{$context}",
                ],
                ['role' => 'user', 'content' => $question],
            ],
        ]);

        $answer = trim($response->choices[0]->message->content);
        $sourceType = 'database';
        $actionRequired = null;

        if ($answer === '__UNKNOWN__') {
            \Log::info('RagService: No answer in documents.', ['allow_web_search' => $allowWebSearch]);

            if (!$allowWebSearch) {
                return [
                    'answer' => "I couldn't find the answer in the provided documents. Would you like me to search the internet?",
                    'source_type' => 'database_not_found',
                    'action_required' => 'confirm_web_search',
                    'sources' => []
                ];
            }

            \Log::info('RagService: Triggering web search for: ' . $question);
            $webSearch = new \App\Services\WebSearchService();
            $webContext = $webSearch->search($question);

            \Log::info('RagService: Web search returned length: ' . strlen($webContext));

            if ($webContext) {
                $response = $client->chat()->create([
                    'model'    => env('OPENAI_LLM_MODEL'),
                    'messages' => [
                        [
                            'role'    => 'system',
                            'content' => "You are a helpful assistant. Answer the user's question using ONLY the provided Web Search Context. If you absolutely cannot answer it, apologize.\n\nWeb Search Context:\n{$webContext}",
                        ],
                        ['role' => 'user', 'content' => $question],
                    ],
                ]);
                $answer = trim($response->choices[0]->message->content);
                $sourceType = 'web';
                \Log::info('RagService: Web answer: ' . substr($answer, 0, 100));
            } else {
                \Log::error('RagService: Web search returned empty context.');
                $answer = "I'm sorry, I couldn't find the answer in your documents and my web search failed.";
            }
        }

        return [
            'answer'          => $answer,
            'source_type'     => $sourceType,
            'action_required' => $actionRequired,
            'sources'         => $sourceType === 'database' ? $chunks : [],
        ];
    }
}