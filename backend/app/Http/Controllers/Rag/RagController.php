<?php

namespace App\Http\Controllers\Rag;

use App\Http\Controllers\Controller;
use App\Services\RagService;
use App\Services\DocumentIngestionService;
use Illuminate\Http\Request;

class RagController extends Controller
{
    public function search(Request $request, RagService $rag)
    {
        $request->validate([
            'query' => 'required|string|min:3',
            'allow_web_search' => 'nullable|boolean'
        ]);

        $result = $rag->answer($request->input('query'), $request->boolean('allow_web_search'));

        return response()->json($result);
    }

    public function ingest(Request $request, DocumentIngestionService $ingestion)
    {
        $request->validate([
            'content' => 'required|string',
            'title'   => 'required|string',
            'source'  => 'nullable|string',
        ]);

        $ingestion->ingest($request->content, $request->title, $request->source ?? '');

        return response()->json(['message' => 'Ingested successfully']);
    }
}
