<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;

class DocumentIngestionService
{
    const CHUNK_SIZE = 500;     // characters per chunk
    const CHUNK_OVERLAP = 50;   // overlap between chunks

    public function ingest(string $content, string $title, int $documentId): void
    {
        // Sanitize the full content first to remove invalid UTF-8 bytes
        $content = $this->sanitizeUtf8($content);

        // 2. Chunk the text
        $chunks = $this->chunkText($content);

        // Bypass SSL locally and point OpenRouter via custom client
        $client = \OpenAI::factory()
            ->withApiKey(env('OPENAI_API_KEY'))
            ->withBaseUri('https://openrouter.ai/api/v1')
            ->withHttpClient(new \GuzzleHttp\Client(['verify' => false]))
            ->make();

        // 3. Embed + store each chunk
        foreach (array_chunk($chunks, 20) as $batch) {
            // Sanitize each chunk in the batch before sending to the API
            $cleanBatch = array_map([$this, 'sanitizeUtf8'], $batch);

            $response = $client->embeddings()->create([
                'model' => env('OPENAI_EMBEDDING_MODEL'),
                'input' => $cleanBatch,
            ]);

            foreach ($response->embeddings as $i => $embedding) {
                $vector = '[' . implode(',', $embedding->embedding) . ']';

                DB::statement("
                    INSERT INTO document_chunks (document_id, chunk_text, embedding, metadata)
                    VALUES (?, ?, ?::vector, ?::jsonb)
                ", [$documentId, $cleanBatch[$i], $vector, json_encode(['chunk_index' => $i])]);
            }
        }
    }

    /**
     * Sanitize a string to valid UTF-8 by removing invalid byte sequences.
     */
    private function sanitizeUtf8(string $text): string
    {
        // Convert any non-UTF-8 encoding to UTF-8
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

        // Remove null bytes and unwanted control characters (keep newlines/tabs)
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        // Final fallback: strip any remaining invalid UTF-8 sequences
        $text = iconv('UTF-8', 'UTF-8//IGNORE', $text);

        return trim($text);
    }

    private function chunkText(string $text): array
    {
        $chunks = [];
        $len    = mb_strlen($text, 'UTF-8');
        $step   = self::CHUNK_SIZE - self::CHUNK_OVERLAP;

        for ($i = 0; $i < $len; $i += $step) {
            // Use mb_substr instead of substr to avoid splitting multibyte characters
            $chunk = mb_substr($text, $i, self::CHUNK_SIZE, 'UTF-8');
            if (trim($chunk)) {
                $chunks[] = $chunk;
            }
        }

        return $chunks;
    }
}