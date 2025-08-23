<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Carbon\Carbon;

class OrderController extends Controller
{
    public function store(Request $request, $appointmentId)
{
    try {
        // Find the appointment
        $appointment = Appointment::findOrFail($appointmentId);

        // Calculate today's queue number
        $today = Carbon::today();
        $orderCountToday = Order::whereDate('created_at', $today)->count();
        $queueNumber = $orderCountToday + 1;

        // Create new order linked to the appointment
        $order = Order::create([
            'appointment_id' => $appointment->id,
            'queue_number'   => $queueNumber,
            'status'         => 'Pending', // all status tracking is in orders
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
}
