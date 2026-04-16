<?php
namespace App\Jobs;

use App\Models\Rag\Documents;
use App\Services\TextExtractorService;
use App\Services\DocumentIngestionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class IngestDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300;

    public function __construct(public Documents $document) {}

    public function handle(
        TextExtractorService    $extractor,
        DocumentIngestionService $ingestion
    ): void {
        $this->document->update(['status' => 'processing']);

        try {
            $fullPath = storage_path('app/private/' . $this->document->file_path);

            // 1. Extract raw text
            $text = $extractor->extract($fullPath, $this->document->mime_type);

            if (empty(trim($text))) {
                throw new \Exception('No text could be extracted from this file.');
            }

            // 2. Chunk + embed + store
            $ingestion->ingest($text, $this->document->title, $this->document->id);

            $this->document->update(['status' => 'ready']);

        } catch (\Throwable $e) {
            $this->document->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}