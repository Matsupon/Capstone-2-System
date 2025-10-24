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
        'scheduled_at', 
        'completed_at',
        'total_amount',
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

    // Custom accessors to return time as simple time strings
    public function getCheckAppointmentTimeAttribute($value)
    {
        if (!$value) return null;
        // If it's already a time string, return it
        if (is_string($value) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
            return substr($value, 0, 5); // Return HH:MM format
        }
        // If it's a Carbon instance, format it
        if ($value instanceof \Carbon\Carbon) {
            return $value->format('H:i');
        }
        return $value;
    }

    public function getPickupAppointmentTimeAttribute($value)
    {
        if (!$value) return null;
        // If it's already a time string, return it
        if (is_string($value) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
            return substr($value, 0, 5); // Return HH:MM format
        }
        // If it's a Carbon instance, format it
        if ($value instanceof \Carbon\Carbon) {
            return $value->format('H:i');
        }
        return $value;
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function feedback()
    {
        return $this->hasOne(Feedback::class);
    }

}
