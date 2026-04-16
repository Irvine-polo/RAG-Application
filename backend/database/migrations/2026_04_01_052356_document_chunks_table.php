<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('document_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->onDelete('cascade');
            $table->text('chunk_text');
            $table->vector('embedding', 1536);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // for HNSW
        DB::statement('
            CREATE INDEX document_chunks_embedding_idx
            ON document_chunks
            USING hnsw (embedding vector_cosine_ops)
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS document_chunks_embedding_idx');
        Schema::dropIfExists('document_chunks');
    }
};
