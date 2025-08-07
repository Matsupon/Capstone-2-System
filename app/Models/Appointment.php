<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'service_type',
        'sizes',
        'total_quantity',
        'notes',
        'design_image',
        'gcash_proof',
        'preferred_due_date',
        'appointment_date',
        'appointment_time',
    ];

    protected $casts = [
        'sizes' => 'array',
        'preferred_due_date' => 'date',
        'appointment_date' => 'date',
        'appointment_time' => 'datetime:H:i',
    ];
}
