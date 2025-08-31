<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'appointment_id',
        'queue_number',
        'status',
        'scheduled_at', // Add this
        'completed_at', // Add this
        'total_amount', // Add this
        'check_appointment_date',
        'check_appointment_time',
        'pickup_appointment_date',
        'pickup_appointment_time',
    ];
    
    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
        'total_amount' => 'decimal:2',
        'check_appointment_date' => 'date',
        'pickup_appointment_date' => 'date',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }


}

