<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use App\Models\Notification;

class AppointmentController extends Controller
{
    // Test method for debugging
    public function test()
    {
        return response()->json([
            'message' => 'AppointmentController is working!',
            'timestamp' => now(),
            'user_id' => auth()->id(),
            'authenticated' => auth()->check()
        ]);
    }

    public function store(Request $request)
    {
        try {
            // Log the incoming request data for debugging
            \Log::info('Appointment booking request received', [
                'headers' => $request->headers->all(),
                'data' => $request->all(),
                'files' => $request->allFiles(),
                'user_id' => auth()->id()
            ]);

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

            \Log::info('Validation passed', $validated);
        } catch (ValidationException $e) {
            \Log::error('Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        }
    
        $conflict = Appointment::where('appointment_date', $validated['appointment_date'])
            ->where('appointment_time', $validated['appointment_time'])
            ->exists();
    
        if ($conflict) {
            \Log::warning('Double booking attempt', [
                'date' => $validated['appointment_date'],
                'time' => $validated['appointment_time']
            ]);
            
            return response()->json([
                'message' => 'This time slot is already taken.',
                'errors' => ['appointment_time' => ['Already booked.']]
            ], 422);
        }
    
        try {
            $designImagePath = null;
            if ($request->hasFile('design_image')) {
                $designImagePath = $request->file('design_image')->store('designs', 'public');
                \Log::info('Design image uploaded', ['path' => $designImagePath]);
            }
        
            $gcashProofPath = $request->file('gcash_proof')->store('gcash_proofs', 'public');
            \Log::info('GCash proof uploaded', ['path' => $gcashProofPath]);
        
            $appointment = Appointment::create([
                'user_id' => auth()->id(),
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

            \Log::info('Appointment created successfully', [
                'appointment_id' => $appointment->id,
                'user_id' => $appointment->user_id
            ]);
        
            Notification::create([
                'user_id' => $appointment->user_id,
                'type'    => 'appointment_booked',
                'title'   => 'You have successfully booked an appointment!',
                'body'    => null,
                'data'    => [
                    'appointment_id'  => $appointment->id,
                    'appointment_date'=> $appointment->appointment_date,
                    'appointment_time'=> $appointment->appointment_time,
                    'created_by'      => 'customer',
                ],
            ]);
        
            return response()->json([
                'message' => 'Appointment booked successfully',
                'appointment' => $appointment
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Error creating appointment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'validated_data' => $validated
            ]);
            
            return response()->json([
                'message' => 'Failed to create appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    
    

    public function getAvailableSlots(Request $request)
    {
        $validated = $request->validate(['date' => 'required|date|after_or_equal:today']);
        $date = $validated['date'];
    
        $allSlots = [];
        for ($hour = 5; $hour <= 22; $hour++) {
            $allSlots[] = sprintf('%02d:00', $hour);
        }
    
        $bookedSlots = Appointment::where('appointment_date', $date)
            ->pluck('appointment_time')
            ->map(function ($time) {
                return \Carbon\Carbon::parse($time)->format('H:i');
            })
            ->toArray();
    
        return response()->json([
            'available_slots' => array_values(array_diff($allSlots, $bookedSlots))
        ]);
    }

public function adminGetAllAppointments()
{
    try {
        $appointments = Appointment::with('user')
    ->where('status', 'pending') 
    ->orderBy('created_at', 'desc')
    ->get()
    ->map(function ($appointment) {
        return [
            'id' => $appointment->id,
            'service_type' => $appointment->service_type,
            'sizes' => json_decode($appointment->sizes, true),
            'total_quantity' => $appointment->total_quantity ?? 'N/A',
            'preferred_due_date' => $appointment->preferred_due_date 
                ? \Carbon\Carbon::parse($appointment->preferred_due_date)->format('Y-m-d H:i:s') 
                : 'N/A',
            'appointment_date' => $appointment->appointment_date 
                ? \Carbon\Carbon::parse($appointment->appointment_date)->format('Y-m-d') 
                : 'N/A',
            'appointment_time' => $appointment->appointment_time 
                ? \Carbon\Carbon::parse($appointment->appointment_time)->format('H:i')
                : 'N/A',
            'notes' => $appointment->notes ?? 'No notes provided.',
            'design_image' => $appointment->design_image 
                ? asset('storage/' . $appointment->design_image) 
                : null,
            'gcash_proof' => $appointment->gcash_proof 
                ? asset('storage/' . $appointment->gcash_proof) 
                : null,
            'status' => $appointment->status,
            'created_at' => $appointment->created_at->toDateTimeString(),
            'user' => [
                'id' => $appointment->user->id,
                'name' => $appointment->user->name,
                'phone' => $appointment->user->phone,
                'email' => $appointment->user->email,
            ]
        ];
    });

        return response()->json([
            'success' => true,
            'data' => $appointments
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch appointments',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function adminGetAcceptedAppointments()
{
    try {
        $appointments = Appointment::with(['user', 'order'])
            ->where('status', 'accepted')
            ->whereHas('order', function($query) {
                $query->where('status', '!=', 'Finished');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'service_type' => $appointment->service_type,
                    'sizes' => json_decode($appointment->sizes, true),
                    'total_quantity' => $appointment->total_quantity ?? 'N/A',
                    'preferred_due_date' => $appointment->preferred_due_date 
                        ? \Carbon\Carbon::parse($appointment->preferred_due_date)->format('Y-m-d H:i:s') 
                        : 'N/A',
                    'appointment_date' => $appointment->appointment_date 
                        ? \Carbon\Carbon::parse($appointment->appointment_date)->format('Y-m-d') 
                        : 'N/A',
                    'appointment_time' => $appointment->appointment_time 
                        ? \Carbon\Carbon::parse($appointment->appointment_time)->format('H:i')
                        : 'N/A',
                    'notes' => $appointment->notes ?? 'No notes provided.',
                    'design_image' => $appointment->design_image 
                        ? asset('storage/' . $appointment->design_image) 
                        : null,
                    'gcash_proof' => $appointment->gcash_proof 
                        ? asset('storage/' . $appointment->gcash_proof) 
                        : null,
                    'status' => $appointment->status,
                    'order_status' => $appointment->order->status ?? 'N/A',
                    'created_at' => $appointment->created_at->toDateTimeString(),
                    'user' => [
                        'id' => $appointment->user->id,
                        'name' => $appointment->user->name,
                        'phone' => $appointment->user->phone,
                        'email' => $appointment->user->email,
                    ]
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $appointments
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch accepted appointments',
            'error' => $e->getMessage()
        ], 500);
    }
}


public function adminGetAppointmentById($id)
{
    try {
        $appointment = Appointment::with('user')->findOrFail($id);

        $sizes = [];
        if (!empty($appointment->sizes)) {
            $decodedSizes = json_decode($appointment->sizes, true);
            if (is_array($decodedSizes)) {
                foreach ($decodedSizes as $size => $qty) {
                    if ($qty > 0) {
                        $sizes[] = "$size - {$qty} pcs.";
                    }
                }
            }
        }

        $formattedAppointment = [
            'id'                 => $appointment->id,
            'user_name'          => $appointment->user->name ?? 'N/A',
            'phone_number'       => $appointment->user->phone ?? 'N/A',
            'service_type'       => $appointment->service_type ?? 'N/A',
            'sizes'              => $sizes ?: ['No sizes provided'],
            'total_quantity'     => $appointment->total_quantity ?? 'N/A',

            'appointment_date'   => $appointment->appointment_date 
                                    ?? ($appointment->appointment_time 
                                        ? \Carbon\Carbon::parse($appointment->appointment_time)->format('Y-m-d') 
                                        : 'N/A'),

            'preferred_due_date' => $appointment->preferred_due_date 
                                    ? \Carbon\Carbon::parse($appointment->preferred_due_date)->format('Y-m-d H:i:s') 
                                    : 'N/A',
            'appointment_time'   => $appointment->appointment_time 
                                    ? \Carbon\Carbon::parse($appointment->appointment_time)->format('H:i:s') 
                                    : 'N/A',
            'notes'              => $appointment->notes ?? 'No notes provided',
            'design_image'       => $appointment->design_image 
                                    ? asset('storage/' . $appointment->design_image) 
                                    : null,
            'gcash_proof'        => $appointment->gcash_proof 
                                    ? asset('storage/' . $appointment->gcash_proof) 
                                    : null,
            'created_at'         => $appointment->created_at->toDateTimeString(),
        ];

        return response()->json([
            'success' => true,
            'data' => $formattedAppointment
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Appointment not found',
            'error' => $e->getMessage()
        ], 404);
    }
}


public function dashboard()
{
    $today = Carbon::today()->toDateString();

    $todaysAppointments = Appointment::whereDate('appointment_date', $today)->count();

    $appointmentsList = Appointment::whereDate('appointment_date', $today)->get();

    return view('dashboard', compact('todaysAppointments', 'appointmentsList'));
}



    public function adminRejectAppointment($id)
    {
        try {
            $appointment = Appointment::findOrFail($id);
            $appointment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Appointment rejected and deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }



    public function index()
    {
        try {
            $appointments = Appointment::with('user')->get();
            return response()->json($appointments);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch appointments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $appointment = Appointment::findOrFail($id);
            $appointment->delete();

            return response()->json(['message' => 'Appointment rejected and deleted.']);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function getNextAppointment(Request $request)
    {
        $userId = $request->user()->id;

        $appointment = \App\Models\Appointment::where('user_id', $userId)
            ->whereDate('appointment_date', '>=', now()->toDateString())
            ->orderBy('appointment_date', 'asc')
            ->orderBy('appointment_time', 'asc')
            ->first();

        if (!$appointment) {
            return response()->json([]);
        }

        return response()->json([
            'id' => $appointment->id,
            'service_type' => $appointment->service_type,
            'appointment_date' => \Carbon\Carbon::parse($appointment->appointment_date)->format('Y-m-d'),
            'appointment_time' => \Carbon\Carbon::parse($appointment->appointment_time)->format('H:i:s'),
        ]);
    }

    public function getNextAppointmentByOrderStatus(Request $request)
    {
        $userId = $request->user()->id;

        $latestOrder = \App\Models\Order::with('appointment')
            ->whereHas('appointment', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$latestOrder) {
            return $this->getNextAppointment($request);
        }

        $status = $latestOrder->status;
        $appointmentDate = null;
        $appointmentTime = null;

        if ($status === 'Pending') {
            $appointmentDate = $latestOrder->appointment->appointment_date;
            $appointmentTime = $latestOrder->appointment->appointment_time;
        } elseif ($status === 'Ready to Check') {
            $appointmentDate = $latestOrder->check_appointment_date;
            $appointmentTime = $latestOrder->check_appointment_time;
        } elseif ($status === 'Completed') {
            $appointmentDate = $latestOrder->pickup_appointment_date;
            $appointmentTime = $latestOrder->pickup_appointment_time;
        }

        if (!$appointmentDate || !$appointmentTime) {
            return response()->json([]);
        }

        return response()->json([
            'id' => $latestOrder->appointment->id,
            'service_type' => $latestOrder->appointment->service_type,
            'appointment_date' => \Carbon\Carbon::parse($appointmentDate)->format('Y-m-d'),
            'appointment_time' => \Carbon\Carbon::parse($appointmentTime)->format('H:i:s'),
            'order_status' => $status,
        ]);
    }



}
