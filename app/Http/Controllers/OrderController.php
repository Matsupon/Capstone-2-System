<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class OrderController extends Controller
{
    public function store(Request $request, $appointmentId)
    {
        try {
            $appointment = Appointment::findOrFail($appointmentId);
    
            // Get queue number based on appointment date and time (chronological order)
            $appointmentDate = \Carbon\Carbon::parse($appointment->appointment_date)->toDateString();
            $appointmentTime = $appointment->appointment_time;
            
            // Count orders for the same appointment date that have earlier appointment times
            $ordersForSameDate = Order::whereHas('appointment', function($query) use ($appointmentDate, $appointmentTime) {
                $query->whereDate('appointment_date', $appointmentDate)
                      ->where('appointment_time', '<', $appointmentTime);
            })->count();
            
            $queueNumber = $ordersForSameDate + 1;
    
            $order = Order::create([
                'appointment_id' => $appointment->id,
                'queue_number'   => $queueNumber,
                'status'         => 'Pending',
            ]);
    
            $appointment->status = 'accepted';
            $appointment->save();
    
            try {
                Notification::create([
                    'user_id' => $appointment->user_id,
                    'type'    => 'appointment_accepted',
                    'title'   => 'Your appointment has been accepted by the Admin!',
                    'body'    => null,
                    'data'    => [
                        'appointment_id' => $appointment->id,
                        'order_id'       => $order->id,
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
        try {
            // First, recalculate queue numbers for all orders grouped by their derived next-appointment date
            $this->recalculateAllQueueNumbers();
            
            $orders = Order::with(['appointment.user'])
                ->where('status', '!=', 'Finished')
                ->whereHas('appointment') // Only include orders that have an appointment (exclude orphaned orders)
                ->orderBy('created_at', 'asc')
                ->get()
                ->filter(function ($order) {
                    // Additional safety check: ensure appointment exists
                    return $order->appointment !== null;
                })
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'queue_number' => $order->queue_number,
                        'status' => $order->status,
                        'handled' => (bool) ($order->handled ?? false),
                        'scheduled_at' => $order->scheduled_at ?? null,
                        'completed_at' => $order->completed_at ?? null,
                        'total_amount' => $order->total_amount ?? null,
                        'check_appointment_date' => $order->check_appointment_date ?? null,
                        'check_appointment_time' => $order->check_appointment_time ?? null,
                        'pickup_appointment_date' => $order->pickup_appointment_date ?? null,
                        'pickup_appointment_time' => $order->pickup_appointment_time ?? null,
                    'created_at' => $order->created_at,
                    'appointment' => [
                        'id' => $order->appointment->id,
                        'service_type' => $order->appointment->service_type,
                        'sizes' => $order->appointment->sizes,
                        'total_quantity' => $order->appointment->total_quantity,
                        'notes' => $order->appointment->notes,
                        'design_image' => $order->appointment->design_image 
                            ? asset('storage/' . $order->appointment->design_image) 
                            : null,
                        'gcash_proof' => $order->appointment->gcash_proof 
                            ? asset('storage/' . $order->appointment->gcash_proof) 
                            : null,
                        'preferred_due_date' => $order->appointment->preferred_due_date,
                        'appointment_date' => $order->appointment->appointment_date 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_date)->format('Y-m-d')
                            : null,
                        'appointment_time' => $order->appointment->appointment_time 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_time)->format('H:i:s')
                            : null,
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
        } catch (\Exception $e) {
            \Log::error('Error in index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch orders: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function history()
    {
        $orders = Order::with(['appointment.user', 'feedback'])
            ->where('status', 'Finished')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'status' => 'Completed', 
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
                        'design_image' => $order->appointment->design_image 
                            ? asset('storage/' . $order->appointment->design_image) 
                            : null,
                        'gcash_proof' => $order->appointment->gcash_proof 
                            ? asset('storage/' . $order->appointment->gcash_proof) 
                            : null,
                        'preferred_due_date' => $order->appointment->preferred_due_date,
                        'appointment_date' => $order->appointment->appointment_date 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_date)->format('Y-m-d')
                            : null,
                        'appointment_time' => $order->appointment->appointment_time 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_time)->format('H:i:s')
                            : null,
                        'user' => [
                            'id' => $order->appointment->user->id,
                            'name' => $order->appointment->user->name,
                            'phone' => $order->appointment->user->phone,
                            'email' => $order->appointment->user->email,
                        ]
                    ],
                    'feedback' => $order->feedback ? [
                        'id' => $order->feedback->id,
                        'rating' => (int)$order->feedback->rating,
                        'comment' => $order->feedback->comment,
                        'admin_response' => $order->feedback->admin_response,
                        'admin_checked' => (bool)$order->feedback->admin_checked,
                        'responded_at' => $order->feedback->responded_at,
                        'created_at' => $order->feedback->created_at,
                    ] : null,
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
        'status'        => 'required|in:Pending,Ready to Check,Completed,Finished',
        'scheduled_at'  => 'nullable|date',     
        'total_amount'  => 'nullable|numeric',  
        
        'check_appointment_date' => 'nullable|date|required_if:status,Ready to Check',
        'check_appointment_time' => 'nullable|date_format:H:i|required_if:status,Ready to Check',
        'pickup_appointment_date' => 'nullable|date|required_if:status,Completed',
        'pickup_appointment_time' => 'nullable|date_format:H:i|required_if:status,Completed',
    ]);

    $order->status = $validated['status'];
    // Reset handled to false when status is updated
    $order->handled = false;
    
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
        }
    }

    if ($validated['status'] === 'Finished') {
        try {
            \Log::info('Creating notification for Finished', [
                'order_id' => $order->id,
                'user_id' => $userId
            ]);
            
            Notification::create([
                'user_id' => $userId,
                'type'    => 'order_finished',
                'title'   => 'Congratulations! Your order is now finished!',
                'body'    => null,
                'data'    => [
                    'order_id'      => $order->id,
                    'appointment_id'=> $appointment->id,
                ],
            ]);
            
            \Log::info('Notification created successfully for Finished status', [
                'order_id' => $order->id
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to create notification for Finished', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    return response()->json([
        'success' => true,
        'data'    => $order->fresh(['appointment', 'appointment.user']),
    ]);
}

    public function getBookedTimes(Request $request)
    {
        try {
            $validated = $request->validate([
                'date' => 'required|date',
                'kind' => 'required|in:check,pickup',
                'order_id' => 'nullable|integer|exists:orders,id', // Optional: exclude this order's times
            ]);

            $date = $validated['date'];
            $excludeOrderId = $validated['order_id'] ?? null;
            
            // Collect ALL appointment times from non-Finished orders for the given date
            // This includes: check_appointment_time, pickup_appointment_time, and original appointment_time
            $allTimes = collect();

            // Get all check appointment times from non-Finished orders (excluding the current order being updated)
            $checkTimesQuery = Order::whereDate('check_appointment_date', $date)
                ->whereNotNull('check_appointment_time')
                ->where('status', '!=', 'Finished');
            
            if ($excludeOrderId) {
                $checkTimesQuery->where('id', '!=', $excludeOrderId);
            }
            
            $checkTimes = $checkTimesQuery->pluck('check_appointment_time')
                ->map(function ($t) { return \Carbon\Carbon::parse($t)->format('H:i'); });
            $allTimes = $allTimes->merge($checkTimes);

            // Get all pickup appointment times from non-Finished orders (excluding the current order being updated)
            $pickupTimesQuery = Order::whereDate('pickup_appointment_date', $date)
                ->whereNotNull('pickup_appointment_time')
                ->where('status', '!=', 'Finished');
            
            if ($excludeOrderId) {
                $pickupTimesQuery->where('id', '!=', $excludeOrderId);
            }
            
            $pickupTimes = $pickupTimesQuery->pluck('pickup_appointment_time')
                ->map(function ($t) { return \Carbon\Carbon::parse($t)->format('H:i'); });
            $allTimes = $allTimes->merge($pickupTimes);

            // Also include original customer-booked appointment times for the same date
            // Only include appointments that have been accepted and have non-finished orders
            $appointmentTimesQuery = \App\Models\Appointment::whereDate('appointment_date', $date)
                ->where('status', 'accepted')
                ->whereHas('order', function($query) use ($excludeOrderId) {
                    $query->where('status', '!=', 'Finished');
                    if ($excludeOrderId) {
                        $query->where('id', '!=', $excludeOrderId);
                    }
                });
            
            $appointmentTimes = $appointmentTimesQuery->pluck('appointment_time')
                ->map(function ($t) { return \Carbon\Carbon::parse($t)->format('H:i'); });
            $allTimes = $allTimes->merge($appointmentTimes);

            // Return unique times
            $times = $allTimes
                ->unique()
                ->values()
                ->all();

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

    public function myLatest(Request $request)
    {
        try {
            $userId = $request->user()->id;
            \Log::info('Fetching latest order for user', ['user_id' => $userId]);
    
            $order = Order::with('appointment.user')
                ->whereHas('appointment', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->where('status', '!=', 'Finished')
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
                        'appointment_date' => $order->appointment->appointment_date 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_date)->format('Y-m-d')
                            : null,
                        'appointment_time' => $order->appointment->appointment_time 
                            ? \Carbon\Carbon::parse($order->appointment->appointment_time)->format('H:i:s')
                            : null,
                        'user' => $order->appointment->relationLoaded('user') && $order->appointment->user ? [
                            'id' => $order->appointment->user->id,
                            'name' => $order->appointment->user->name,
                            'phone' => $order->appointment->user->phone,
                            'email' => $order->appointment->user->email,
                        ] : null,
                    ],
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
    

    public function myHistory(Request $request)
    {
        try {
            $userId = $request->user()->id;
            \Log::info('Fetching finished orders for user', ['user_id' => $userId]);
    
            $orders = Order::with(['appointment.user', 'feedback'])
                ->whereHas('appointment', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->where('status', 'Finished')
                ->orderBy('created_at', 'desc')
                ->get();
    
            if ($orders->isEmpty()) {
                \Log::info('No finished orders found for user', ['user_id' => $userId]);
                return response()->json([
                    'success' => true,
                    'data' => [],
                ]);
            }
    
            \Log::info('Finished orders fetched successfully', [
                'user_id' => $userId,
                'count' => $orders->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $orders->map(function ($order) {
                    return [
                        'id'           => $order->id,
                        'status'       => 'Completed', 
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
                            'appointment_date' => $order->appointment->appointment_date 
                                ? \Carbon\Carbon::parse($order->appointment->appointment_date)->format('Y-m-d')
                                : null,
                            'appointment_time' => $order->appointment->appointment_time 
                                ? \Carbon\Carbon::parse($order->appointment->appointment_time)->format('H:i:s')
                                : null,
                            'user' => $order->appointment->relationLoaded('user') && $order->appointment->user ? [
                                'id' => $order->appointment->user->id,
                                'name' => $order->appointment->user->name,
                                'phone' => $order->appointment->user->phone,
                                'email' => $order->appointment->user->email,
                            ] : null,
                        ],
                        'check_appointment_date' => $order->check_appointment_date,
                        'check_appointment_time' => $order->check_appointment_time,
                        'pickup_appointment_date' => $order->pickup_appointment_date,
                        'pickup_appointment_time' => $order->pickup_appointment_time,
                        'feedback' => $order->feedback ? [
                            'id' => $order->feedback->id,
                            'rating' => (int)$order->feedback->rating,
                            'comment' => $order->feedback->comment,
                            'admin_response' => $order->feedback->admin_response,
                            'admin_checked' => (bool)$order->feedback->admin_checked,
                            'responded_at' => $order->feedback->responded_at,
                            'created_at' => $order->feedback->created_at,
                        ] : null,
                    ];
                }),
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
    
    public function getOrderStats()
    {
        try {
            // Try to query for 'Finished' status first
            try {
                $pendingOrders = Order::where('status', '!=', 'Finished')->count();
                $finishedOrders = Order::where('status', 'Finished')->count();
            } catch (\Exception $e) {
                // If 'Finished' doesn't exist in enum, fallback to 'Completed'
                $pendingOrders = Order::where('status', '!=', 'Completed')->count();
                $finishedOrders = Order::where('status', 'Completed')->count();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'pending_orders' => $pendingOrders,
                    'finished_orders' => $finishedOrders,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getOrderStats', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch order statistics: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getTodayQueue()
    {
        try {
            $today = \Carbon\Carbon::today()->toDateString();
            $nowTime = \Carbon\Carbon::now()->format('H:i:s');

            // Check if columns exist before querying
            $hasCheckDate = Schema::hasColumn('orders', 'check_appointment_date');
            $hasPickupDate = Schema::hasColumn('orders', 'pickup_appointment_date');

            // Fetch all non-finished orders that could possibly have a next appointment today
            $candidateOrders = Order::with('appointment.user')
                ->where('status', '!=', 'Finished')
                ->where(function($q) use ($today, $hasCheckDate, $hasPickupDate) {
                    if ($hasCheckDate) {
                        $q->whereDate('check_appointment_date', $today);
                    }
                    if ($hasPickupDate) {
                        $q->orWhereDate('pickup_appointment_date', $today);
                    }
                    $q->orWhereHas('appointment', function($qa) use ($today) {
                        $qa->whereDate('appointment_date', $today);
                    });
                })
                ->get();

            // Compute derived next-appointment date/time for each order (without mutating model attributes)
            $enriched = $candidateOrders->map(function($order) {
                [$d, $t] = $this->getDerivedDateTime($order);
                return [
                    'model' => $order,
                    'derived_date' => $d,
                    'derived_time' => $t,
                ];
            });

            $todayOrders = $enriched
                ->filter(function($item) use ($today) {
                    return !empty($item['derived_date']) && $item['derived_date'] === $today;
                })
                ->sortBy(function($item) {
                    return $item['derived_time'] ?? '23:59:59';
                })
                ->values();

            if ($todayOrders->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'has_queue' => false,
                        'message' => 'No upcoming queues for today',
                        'current_customer' => null,
                        'next_customer' => null,
                        'all_orders' => []
                    ]
                ]);
            }

            // Reassign queue numbers for today's orders based on derived time
            $queueNumber = 1;
            foreach ($todayOrders as $item) {
                $model = $item['model'];
                $model->queue_number = $queueNumber;
                $model->save();
                $queueNumber++;
            }

            // Determine current and next based on current time
            $currentIndex = 0;
            foreach ($todayOrders as $idx => $item) {
                $derivedTime = $item['derived_time'] ?? '23:59:59';
                if ($derivedTime >= $nowTime) { $currentIndex = $idx; break; }
                $currentIndex = $idx; // if all earlier, last one becomes current
            }

            $currentCustomer = $todayOrders->get($currentIndex);
            $nextCustomer = $todayOrders->get($currentIndex + 1);

            // Format all orders for display
            $allOrders = $todayOrders->map(function ($item) {
                $model = $item['model'];
                return [
                    'id' => $model->id,
                    'queue_number' => $model->queue_number,
                    'name' => $model->appointment->user->name ?? 'N/A',
                    'service_type' => $model->appointment->service_type ?? 'N/A',
                    'appointment_time' => $item['derived_time'] ?? 'N/A',
                    'status' => $model->status
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'has_queue' => true,
                    'current_customer' => $currentCustomer ? [
                        'queue_number' => $currentCustomer['model']->queue_number,
                        'name' => $currentCustomer['model']->appointment->user->name ?? 'N/A',
                        'appointment_time' => $currentCustomer['derived_time'] ?? 'N/A',
                        'status' => $currentCustomer['model']->status
                    ] : null,
                    'next_customer' => $nextCustomer ? [
                        'queue_number' => $nextCustomer['model']->queue_number,
                        'name' => $nextCustomer['model']->appointment->user->name ?? 'N/A',
                        'appointment_time' => $nextCustomer['derived_time'] ?? 'N/A',
                        'status' => $nextCustomer['model']->status
                    ] : null,
                    'all_orders' => $allOrders
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getTodayQueue', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch today\'s queue: ' . $e->getMessage(),
            ], 500);
        }
    }


    public function getTodayAppointmentsCount()
    {
        try {
            $today = \Carbon\Carbon::today()->toDateString();

            // Check if columns exist before querying
            $hasCheckDate = Schema::hasColumn('orders', 'check_appointment_date');
            $hasPickupDate = Schema::hasColumn('orders', 'pickup_appointment_date');

            $candidateOrders = Order::with('appointment')
                ->where('status', '!=', 'Finished')
                ->where(function($q) use ($today, $hasCheckDate, $hasPickupDate) {
                    if ($hasCheckDate) {
                        $q->whereDate('check_appointment_date', $today);
                    }
                    if ($hasPickupDate) {
                        $q->orWhereDate('pickup_appointment_date', $today);
                    }
                    $q->orWhereHas('appointment', function($qa) use ($today) {
                        $qa->whereDate('appointment_date', $today);
                    });
                })
                ->get();

            $count = $candidateOrders->filter(function($order) use ($today) {
                    [$d, $t] = $this->getDerivedDateTime($order);
                    return !empty($d) && $d === $today;
                })
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'todays_appointments' => $count,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getTodayAppointmentsCount', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch today\'s appointments count: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function recalculateQueueNumbers()
    {
        try {
            $this->recalculateAllQueueNumbers();
            
            return response()->json([
                'success' => true,
                'message' => 'Queue numbers recalculated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to recalculate queue numbers',
            ], 500);
        }
    }
    
    private function recalculateAllQueueNumbers()
    {
        // Get all non-finished orders and group by their derived next-appointment date
        $orders = Order::with('appointment')
            ->where('status', '!=', 'Finished')
            ->get();

        $enriched = $orders->map(function($order) {
            [$d, $t] = $this->getDerivedDateTime($order);
            return [
                'model' => $order,
                'derived_date' => $d,
                'derived_time' => $t,
            ];
        });

        $groups = $enriched
            ->filter(function($item) {
                return !empty($item['derived_date']);
            })
            ->groupBy(function($item) {
                return $item['derived_date'];
            });

        foreach ($groups as $date => $group) {
            $sorted = $group->sortBy(function($item) {
                return $item['derived_time'] ?? '23:59:59';
            })->values();
            $qn = 1;
            foreach ($sorted as $item) {
                $model = $item['model'];
                $model->queue_number = $qn;
                $model->save();
                $qn++;
            }
        }
    }

    private function getDerivedDateTime($order)
    {
        $status = $order->status;
        $date = null; $time = null;
        if ($status === 'Ready to Check') {
            $date = $order->check_appointment_date;
            $time = $order->check_appointment_time;
        } elseif ($status === 'Completed') {
            $date = $order->pickup_appointment_date;
            $time = $order->pickup_appointment_time;
        } else { // Pending, Ongoing, etc. default to original appointment
            $date = optional($order->appointment)->appointment_date;
            $time = optional($order->appointment)->appointment_time;
        }
        // Normalize formats
        $date = $date ? \Carbon\Carbon::parse($date)->toDateString() : null;
        $time = $time ? \Carbon\Carbon::parse($time)->format('H:i:s') : null;
        return [$date, $time];
    }


    public function toggleHandled(Request $request, $orderId)
    {
        try {
            // Find the order manually to avoid route model binding issues
            $order = Order::findOrFail($orderId);

            $validated = $request->validate([
                'handled' => 'required',
            ]);

            // Convert various boolean representations to actual boolean
            $handledValue = $validated['handled'];
            
            // Handle different input types
            if (is_string($handledValue)) {
                $lowerValue = strtolower($handledValue);
                if (in_array($lowerValue, ['true', '1', 'yes', 'on'])) {
                    $handledValue = true;
                } elseif (in_array($lowerValue, ['false', '0', 'no', 'off'])) {
                    $handledValue = false;
                } else {
                    $handledValue = (bool) $handledValue;
                }
            } else {
                $handledValue = (bool) $handledValue;
            }

            $order->handled = $handledValue;
            $order->save();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $order->id,
                    'handled' => $order->handled,
                    'status' => $order->status,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('Order not found in toggleHandled', [
                'order_id' => $orderId ?? 'unknown',
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
                'error' => 'Order not found',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error in toggleHandled', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
                'order_id' => $orderId ?? 'unknown'
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error in toggleHandled', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order_id' => $orderId ?? 'unknown',
                'request_data' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Failed to update handled status',
            ], 500);
        }
    }

    public function dashboardData()
    {
        $today = Carbon::today();
    
        $todaysAppointments = Appointment::whereDate('appointment_date', $today)
            ->where('status', 'accepted')
            ->whereHas('order')
            ->count();
    
        $recentAppointments = Appointment::with('user', 'order')
            ->where('status', 'accepted')
            ->whereHas('order')
            ->orderBy('appointment_date', 'desc')
            ->take(5)
            ->get();
    
        return response()->json([
            'success' => true,
            'data' => [
                'todaysAppointments' => $todaysAppointments,
                'recentAppointments' => $recentAppointments,
            ]
        ]);
    }




}
