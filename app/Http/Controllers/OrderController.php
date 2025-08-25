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
            Notification::create([
                'user_id' => $appointment->user_id,
                'type'    => 'appointment_accepted',
                'title'   => 'Your appointment has been accepted by the Admin!',
                'body'    => null,
                'data'    => [
                    'appointment_id' => $appointment->id,
                    'order_id'       => $order->id,
                ],
            ]);
    
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
        $orders = Order::with(['appointment', 'user'])
            ->orderBy('created_at', 'asc')
            ->get();

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
    ]);

    $order->status = $validated['status'];
    $order->save();

    $appointment = $order->appointment;
    $userId = $appointment->user_id;

    if ($validated['status'] === 'Ready to Check') {
        // require schedule
        if (empty($validated['scheduled_at'])) {
            return response()->json(['message' => 'scheduled_at is required for Ready to Check'], 422);
        }

        \App\Models\Notification::create([
            'user_id' => $userId,
            'type'    => 'ready_to_check',
            'title'   => 'Your order is now ready to be checked',
            'body'    => null,
            'data'    => [
                'order_id'      => $order->id,
                'appointment_id'=> $appointment->id,
                'scheduled_at'  => $validated['scheduled_at'],
            ],
        ]);
    }

    if ($validated['status'] === 'Completed') {
        if (empty($validated['scheduled_at'])) {
            return response()->json(['message' => 'scheduled_at is required for Completed'], 422);
        }
        if (!isset($validated['total_amount'])) {
            return response()->json(['message' => 'total_amount is required for Completed'], 422);
        }

        \App\Models\Notification::create([
            'user_id' => $userId,
            'type'    => 'order_completed',
            'title'   => 'Your order is now completed',
            'body'    => null,
            'data'    => [
                'order_id'      => $order->id,
                'appointment_id'=> $appointment->id,
                'scheduled_at'  => $validated['scheduled_at'],
                'total_amount'  => (float)$validated['total_amount'],
            ],
        ]);
    }

    return response()->json([
        'success' => true,
        'data'    => $order->fresh(),
    ]);
}

}
