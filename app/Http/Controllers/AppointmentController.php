<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'service_type' => 'required|string',
                'sizes' => 'required|string',
                'total_quantity' => 'required|integer',
                'notes' => 'nullable|string',
                'design_image' => 'nullable|file|image|max:2048',
                'gcash_proof' => 'required|file|image|max:2048',
                'preferred_due_date' => 'required|date',
                'appointment_date' => 'required|date|after:today',
                'appointment_time' => 'required|date_format:H:i',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        }

        $conflict = Appointment::where('appointment_date', $validated['appointment_date'])
            ->where('appointment_time', $validated['appointment_time'])
            ->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'This time slot is already taken.',
                'errors' => ['appointment_time' => ['Already booked.']]
            ], 422);
        }

        $designImagePath = null;
        if ($request->hasFile('design_image')) {
            $designImagePath = $request->file('design_image')->store('designs', 'public');
        }

        $gcashProofPath = $request->file('gcash_proof')->store('gcash_proofs', 'public');

        $appointment = Appointment::create([
            'service_type' => $validated['service_type'],
            'sizes' => $validated['sizes'],
            'total_quantity' => $validated['total_quantity'],
            'notes' => $validated['notes'] ?? null,
            'design_image' => $designImagePath,
            'gcash_proof' => $gcashProofPath,
            'preferred_due_date' => $validated['preferred_due_date'],
            'appointment_date' => $validated['appointment_date'],
            'appointment_time' => $validated['appointment_time'],
        ]);

        return response()->json(['message' => 'Appointment booked successfully', 'appointment' => $appointment], 201);
    }

    public function getAvailableSlots(Request $request)
    {
        $validated = $request->validate(['date' => 'required|date|after:today']);
        $date = $validated['date'];
    
        // Generate all possible time slots
        $allSlots = [];
        for ($hour = 5; $hour <= 22; $hour++) {
            $allSlots[] = sprintf('%02d:00', $hour);
        }
    
        // Get booked slots
        $bookedSlots = Appointment::where('appointment_date', $date)
            ->pluck('appointment_time')
            ->map(function ($time) {
                return \Carbon\Carbon::parse($time)->format('H:i');
            })
            ->toArray();
    
        // Return all slots with availability status
        return response()->json([
            'available_slots' => array_values(array_diff($allSlots, $bookedSlots))
        ]);
    }
}
