<?php
namespace App\Http\Controllers\Rag;

use App\Http\Controllers\Controller;
use App\Jobs\IngestDocumentJob;
use App\Models\Rag\Documents;
use App\Models\Rag\DocumentChunks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class KnowledgeBaseController extends Controller
{
    public function upload(Request $request)
    {

        $request->validate([
            'file'  => 'required|file|mimes:pdf,docx,txt|max:20480', // 20MB max
            'title' => 'nullable|string|max:255',
        ]);

        $file     = $request->file('file');
        $path     = $file->store('knowledge-base');  // storage/app/knowledge-base/

        $data = [
            'title'             => $request->input('title', $file->getClientOriginalName()),
            'original_filename' => $file->getClientOriginalName(),
            'file_path'         => $path,
            'mime_type'         => $file->getMimeType(),
            'status'            => 'pending',
            'user_id'           => 1,
        ];

        Log::info($data);

        $document = Documents::create($data);

        // Dispatch background job
        IngestDocumentJob::dispatch($document);

        return response()->json([
            'id'      => $document->id,
            'title'   => $document->title,
            'status'  => $document->status,
        ], 201);
    }

    public function status(Documents $document)
    {
        return response()->json([
            'id'            => $document->id,
            'status'        => $document->status,
            'error_message' => $document->error_message,
        ]);
    }

    public function index()
    {
        return response()->json(
            Documents::where('user_id', auth()->id())
                ->select('id', 'title', 'status', 'created_at')
                ->latest()
                ->get()
        );
    }

    public function destroy(Documents $document)
    {
        DB::beginTransaction();

        $deleteDoc = Documents::where('id', $document->id)->delete();

        if ($deleteDoc) {
            $deleteVector = DocumentChunks::where('document_id', $document->id)->delete();
            DB::commit();
            return response()->json(['message' => 'Deleted']);
        }

        DB::rollBack();
        return response()->json(['message' => 'Failed to delete'], 500);
    }
}