<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Carbon\Carbon;

class OrderController extends Controller
{
    public function store(Request $request, $appointmentId)
    {
        try {
            $appointment = Appointment::findOrFail($appointmentId);
    
            $today = \Carbon\Carbon::today();
            $orderCountToday = Order::whereDate('created_at', $today)->count();
            $queueNumber = $orderCountToday + 1;
    
            $order = Order::create([
                'appointment_id' => $appointment->id,
                'queue_number'   => $queueNumber,
                'status'         => 'Pending',
            ]);
    
            // mark appointment accepted
            $appointment->status = 'accepted';
            $appointment->save();
    
            // ✅ Notification: appointment accepted
            try {
                Notification::create([
                    'user_id' => $appointment->user_id,
                    'type'    => 'appointment_accepted',
                    'title'   => 'Your appointment has been accepted by the Admin!',
                    'body'    => null,
                    'data'    => [
                        'appointment_id' => $appointment->id,
                        'order_id'       => $order->id,
                        // include customer's chosen schedule so mobile can show it in Recent Activity after acceptance
                        'appointment_date' => \Carbon\Carbon::parse($appointment->appointment_date)->format('Y-m-d'),
                        'appointment_time' => \Carbon\Carbon::parse($appointment->appointment_time)->format('H:i:s'),
                    ],
                ]);
            } catch (\Exception $e) {
                \Log::error('Failed to create appointment accepted notification', [
                    'error' => $e->getMessage(),
                    'appointment_id' => $appointment->id,
                    'order_id' => $order->id,
                    'user_id' => $appointment->user_id
                ]);
                // Don't fail the entire request if notification creation fails
            }
    
            return response()->json([
                'success' => true,
                'message' => 'Appointment accepted and moved to orders',
                'order'   => $order,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function index()
    {
        $orders = Order::with(['appointment.user'])
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'queue_number' => $order->queue_number,
                    'status' => $order->status,
                    'scheduled_at' => $order->scheduled_at,
                    'completed_at' => $order->completed_at,
                    'total_amount' => $order->total_amount,
                    'check_appointment_date' => $order->check_appointment_date,
                    'check_appointment_time' => $order->check_appointment_time,
                    'pickup_appointment_date' => $order->pickup_appointment_date,
                    'pickup_appointment_time' => $order->pickup_appointment_time,
                    'created_at' => $order->created_at,
                    'appointment' => [
                        'id' => $order->appointment->id,
                        'service_type' => $order->appointment->service_type,
                        'sizes' => $order->appointment->sizes,
                        'total_quantity' => $order->appointment->total_quantity,
                        'notes' => $order->appointment->notes,
                        'design_image' => $order->appointment->design_image,
                        'gcash_proof' => $order->appointment->gcash_proof,
                        'preferred_due_date' => $order->appointment->preferred_due_date,
                        'appointment_date' => $order->appointment->appointment_date,
                        'appointment_time' => $order->appointment->appointment_time,
                        'user' => [
                            'id' => $order->appointment->user->id,
                            'name' => $order->appointment->user->name,
                            'phone' => $order->appointment->user->phone,
                            'email' => $order->appointment->user->email,
                        ]
                    ]
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function updateStatus(Request $request, Order $order)
{
    $validated = $request->validate([
        'status'        => 'required|in:Pending,Ongoing,Ready to Check,Completed',
        'scheduled_at'  => 'nullable|date',     // required for Ready to Check & Completed
        'total_amount'  => 'nullable|numeric',  // required for Completed
        
        // New appointment fields
        'check_appointment_date' => 'nullable|date|required_if:status,Ready to Check',
        'check_appointment_time' => 'nullable|date_format:H:i|required_if:status,Ready to Check',
        'pickup_appointment_date' => 'nullable|date|required_if:status,Completed',
        'pickup_appointment_time' => 'nullable|date_format:H:i|required_if:status,Completed',
    ]);

    $order->status = $validated['status'];
    
    // Store scheduled_at and completed_at if provided
    if ($validated['status'] === 'Ready to Check' && !empty($validated['scheduled_at'])) {
        $order->scheduled_at = $validated['scheduled_at'];
    }
    
    if ($validated['status'] === 'Completed') {
        if (!empty($validated['scheduled_at'])) {
            $order->completed_at = $validated['scheduled_at'];
        }
        if (isset($validated['total_amount'])) {
            $order->total_amount = $validated['total_amount'];
        }
    }
    
    // Store appointment fields based on status
    if ($validated['status'] === 'Ready to Check') {
        $order->check_appointment_date = $validated['check_appointment_date'];
        $order->check_appointment_time = $validated['check_appointment_time'];
    }
    
    if ($validated['status'] === 'Completed') {
        $order->pickup_appointment_date = $validated['pickup_appointment_date'];
        $order->pickup_appointment_time = $validated['pickup_appointment_time'];
    }
    
    $order->save();

    $appointment = $order->appointment;
    $userId = $appointment->user_id;

    if ($validated['status'] === 'Ready to Check') {
        try {
            \Log::info('Creating notification for Ready to Check', [
                'order_id' => $order->id,
                'user_id' => $userId,
                'scheduled_at' => $validated['scheduled_at']
            ]);
            
            // Create notification for Ready to Check
            $notification = Notification::create([
                'user_id' => $userId,
                'type'    => 'ready_to_check',
                'title'   => 'Your order is now ready to be checked',
                'body'    => null,
                'data'    => [
                    'order_id'      => $order->id,
                    'appointment_id'=> $appointment->id,
                    'scheduled_at'  => $validated['scheduled_at'],
                    'check_appointment_date' => $validated['check_appointment_date'],
                    'check_appointment_time' => $validated['check_appointment_time'],
                ],
            ]);
            
            \Log::info('Notification created successfully', [
                'notification_id' => $notification->id,
                'order_id' => $order->id
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create notification for Ready to Check', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            // Don't fail the entire request if notification creation fails
        }
    }

    if ($validated['status'] === 'Completed') {
        if (empty($validated['scheduled_at'])) {
            return response()->json(['message' => 'scheduled_at is required for Completed'], 422);
        }
        if (!isset($validated['total_amount'])) {
            return response()->json(['message' => 'total_amount is required for Completed'], 422);
        }

        try {
            Notification::create([
                'user_id' => $userId,
                'type'    => 'order_completed',
                'title'   => 'Your order is now completed',
                'body'    => null,
                'data'    => [
                    'order_id'      => $order->id,
                    'appointment_id'=> $appointment->id,
                    'scheduled_at'  => $validated['scheduled_at'],
                    'total_amount'  => (float)$validated['total_amount'],
                    'pickup_appointment_date' => $validated['pickup_appointment_date'],
                    'pickup_appointment_time' => $validated['pickup_appointment_time'],
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create notification for Completed', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
                'user_id' => $userId
            ]);
            // Don't fail the entire request if notification creation fails
        }
    }

    return response()->json([
        'success' => true,
        'data'    => $order->fresh(['appointment', 'appointment.user']),
    ]);
}

    // GET /orders/booked-times?date=YYYY-MM-DD&kind=check|pickup
    public function getBookedTimes(Request $request)
    {
        try {
            $validated = $request->validate([
                'date' => 'required|date',
                'kind' => 'required|in:check,pickup',
            ]);

            $date = $validated['date'];
            $kind = $validated['kind'];

            if ($kind === 'check') {
                $times = Order::whereDate('check_appointment_date', $date)
                    ->whereNotNull('check_appointment_time')
                    ->pluck('check_appointment_time')
                    ->map(function ($t) { return \Carbon\Carbon::parse($t)->format('H:i'); })
                    ->unique()
                    ->values()
                    ->all();
            } else {
                $times = Order::whereDate('pickup_appointment_date', $date)
                    ->whereNotNull('pickup_appointment_time')
                    ->pluck('pickup_appointment_time')
                    ->map(function ($t) { return \Carbon\Carbon::parse($t)->format('H:i'); })
                    ->unique()
                    ->values()
                    ->all();
            }

            return response()->json([
                'success' => true,
                'booked_times' => $times,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch booked times', [
                'error' => $e->getMessage(),
                'date' => $request->get('date'),
                'kind' => $request->get('kind')
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booked times',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return the latest order for the authenticated user with related appointment
     */
    public function myLatest(Request $request)
    {
        try {
            $userId = $request->user()->id;
            \Log::info('Fetching latest order for user', ['user_id' => $userId]);
    
            $order = Order::with('appointment.user')
                ->whereHas('appointment', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->orderBy('created_at', 'desc')
                ->first();
    
            if (!$order) {
                \Log::info('No order found for user', ['user_id' => $userId]);
                return response()->json([
                    'success' => true,
                    'data' => null,
                ]);
            }
    
            \Log::info('Latest order fetched successfully', [
                'user_id' => $userId,
                'order_id' => $order->id,
                'status' => $order->status
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id'           => $order->id,
                    'status'       => $order->status,
                    'queue_number' => $order->queue_number,
                    'scheduled_at' => $order->scheduled_at,
                    'completed_at' => $order->completed_at,
                    'appointment'  => [
                        'id'               => $order->appointment->id,
                        'service_type'     => $order->appointment->service_type,
                        'sizes'            => $order->appointment->sizes,
                        'total_quantity'   => $order->appointment->total_quantity,
                        'preferred_due_date' => $order->appointment->preferred_due_date,
                        'notes'            => $order->appointment->notes,
                        'design_image'     => $order->appointment->design_image
                            ? asset('storage/' . $order->appointment->design_image)
                            : null,
                        'gcash_proof'      => $order->appointment->gcash_proof
                            ? asset('storage/' . $order->appointment->gcash_proof)
                            : null,
                        // 👇 these two are what your mobile app needs
                        'appointment_date' => $order->appointment->appointment_date,
                        'appointment_time' => $order->appointment->appointment_time,
                        'user' => $order->appointment->relationLoaded('user') && $order->appointment->user ? [
                            'id' => $order->appointment->user->id,
                            'name' => $order->appointment->user->name,
                            'phone' => $order->appointment->user->phone,
                            'email' => $order->appointment->user->email,
                        ] : null,
                    ],
                    // Add the new appointment fields
                    'check_appointment_date' => $order->check_appointment_date,
                    'check_appointment_time' => $order->check_appointment_time,
                    'pickup_appointment_date' => $order->pickup_appointment_date,
                    'pickup_appointment_time' => $order->pickup_appointment_time,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch latest order', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch latest order',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
    

}
