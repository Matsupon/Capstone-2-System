<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Order;
use App\Models\Appointment;
use Carbon\Carbon;

class CustomerController extends Controller
{
    public function index()
{
    try {
        $customers = User::whereHas('appointments.order') 
            ->with(['appointments.order'])
            ->get()
            ->map(function ($user) {
                $totalOrders = $user->appointments->filter(function ($appointment) {
                    return $appointment->order !== null;
                })->count();

                $latestOrder = Order::whereHas('appointment', function ($query) use ($user) {
                        $query->where('user_id', $user->id);
                    })
                    ->with('appointment')
                    ->orderBy('created_at', 'desc')
                    ->first();

                if (!$latestOrder) {
                    $lastAppointment = 'N/A';
                    $lastOrderStatus = 'No Orders';
                } else {
                    $lastAppointment = \Carbon\Carbon::parse($latestOrder->appointment->appointment_date)->format('F j, Y');
                    $lastOrderStatus = $latestOrder->status;
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'contact' => $user->phone,
                    'address' => $user->address,
                    'totalOrders' => $totalOrders,
                    'lastAppointment' => $lastAppointment,
                    'lastOrderStatus' => $lastOrderStatus,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $customers
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch customers',
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function show($id)
    {
        try {
            $user = User::findOrFail($id);

            $orders = Order::whereHas('appointment', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['appointment', 'feedback'])
            ->orderBy('created_at', 'desc')
            ->get();

            $totalOrders = $orders->count();
            
            $latestOrder = $orders->first();
            
            if (!$latestOrder) {
                $latestAppointment = $user->appointments()->orderBy('appointment_date', 'desc')->first();
                $lastAppointment = $latestAppointment ? 
                    Carbon::parse($latestAppointment->appointment_date)->format('F j, Y') : 
                    'N/A';
                $lastOrderStatus = 'No Orders';
            } else {
                $lastAppointment = Carbon::parse($latestOrder->appointment->appointment_date)->format('F j, Y');
                $lastOrderStatus = $latestOrder->status;
            }

            $formattedOrders = $orders->map(function ($order) {
                $sizes = [];
                if (!empty($order->appointment->sizes)) {
                    $decodedSizes = json_decode($order->appointment->sizes, true);
                    if (is_array($decodedSizes)) {
                        $sizes = $decodedSizes;
                    }
                }

                return [
                    'id' => $order->id,
                    'appointmentDate' => Carbon::parse($order->appointment->appointment_date)->format('F j, Y'),
                    'service' => $order->appointment->service_type,
                    'sizes' => $sizes,
                    'phone' => $order->appointment->user->phone,
                    'status' => $order->status === 'Finished' ? 'Completed' : $order->status,
                    'designImg' => $order->appointment->design_image 
                        ? asset('storage/' . $order->appointment->design_image) 
                        : 'jersey.jpg', // fallback
                    'gcashImg' => $order->appointment->gcash_proof 
                        ? asset('storage/' . $order->appointment->gcash_proof) 
                        : 'gcash.png', // fallback
                    'notes' => $order->appointment->notes ?: 'No notes provided.',
                    'paymentFee' => $order->status === 'Finished' ? $order->total_amount : null,
                    'feedback' => $order->feedback ? [
                        'rating' => (int) $order->feedback->rating,
                        'comment' => $order->feedback->comment,
                        'admin_response' => $order->feedback->admin_response,
                        'admin_checked' => (bool) $order->feedback->admin_checked,
                        'created_at' => optional($order->feedback->created_at)->toDateTimeString(),
                    ] : null,
                ];
            });

            if ($formattedOrders->isEmpty()) {
                $latestAppointment = $user->appointments()->orderBy('appointment_date', 'desc')->first();
                if ($latestAppointment) {
                    $sizes = [];
                    if (!empty($latestAppointment->sizes)) {
                        $decodedSizes = json_decode($latestAppointment->sizes, true);
                        if (is_array($decodedSizes)) {
                            $sizes = $decodedSizes;
                        }
                    }

                    $formattedOrders = collect([[
                        'id' => 'appointment_' . $latestAppointment->id,
                        'appointmentDate' => Carbon::parse($latestAppointment->appointment_date)->format('F j, Y'),
                        'service' => $latestAppointment->service_type,
                        'sizes' => $sizes,
                        'phone' => $user->phone,
                        'status' => 'No Orders',
                        'designImg' => $latestAppointment->design_image 
                            ? asset('storage/' . $latestAppointment->design_image) 
                            : 'jersey.jpg',
                        'gcashImg' => $latestAppointment->gcash_proof 
                            ? asset('storage/' . $latestAppointment->gcash_proof) 
                            : 'gcash.png',
                        'notes' => $latestAppointment->notes ?: 'No notes provided.',
                        'paymentFee' => null,
                    ]]);
                }
            }

            $customer = [
                'id' => $user->id,
                'name' => $user->name,
                'contact' => $user->phone,
                'address' => $user->address,
                'totalOrders' => $totalOrders,
                'lastAppointment' => $lastAppointment,
                'lastOrderStatus' => $lastOrderStatus,
                'orders' => $formattedOrders,
            ];

            return response()->json([
                'success' => true,
                'data' => $customer
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}
