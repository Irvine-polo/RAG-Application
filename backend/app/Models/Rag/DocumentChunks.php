<?php

namespace App\Models\Rag;

use Illuminate\Database\Eloquent\Model;

class DocumentChunks extends Model
{
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];
}
