<?php

namespace App\Models\Rag;

use Illuminate\Database\Eloquent\Model;

class Documents extends Model
{
    protected $guarded = [
        'id',
        'created_at',
        'updated_at',
    ];
}
