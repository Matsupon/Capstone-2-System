<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $userId = $request->user()->id;
            \Log::info('Fetching notifications for user', ['user_id' => $userId]);
            
            $notifications = Notification::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->get();

            \Log::info('Notifications fetched successfully', [
                'user_id' => $userId,
                'count' => $notifications->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $notifications,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch notifications', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $notification,
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    // Admin utilities for new appointments counter
    public function countUnviewedAppointments(): \Illuminate\Http\JsonResponse
    {
        // Only count appointments with status 'pending' AND viewed_at is NULL
        // Step 1: Get appointment IDs from unviewed notifications
        $notificationAppointmentIds = Notification::where('type', 'appointment_book')
            ->where(function ($q) {
                $q->whereNull('viewed_at')->orWhere('viewed_at', '0000-00-00 00:00:00');
            })
            ->get()
            ->map(function ($notification) {
                $data = $notification->data;
                return is_array($data) ? ($data['appointment_id'] ?? null) : null;
            })
            ->filter()
            ->unique();

        // Step 2: Check which of these appointment IDs have status 'pending'
        $pendingAppointmentIds = \App\Models\Appointment::whereIn('id', $notificationAppointmentIds)
            ->where('status', 'pending')
            ->pluck('id');

        // Step 3: Count notifications that match pending appointments
        $count = Notification::where('type', 'appointment_book')
            ->where(function ($q) {
                $q->whereNull('viewed_at')->orWhere('viewed_at', '0000-00-00 00:00:00');
            })
            ->get()
            ->filter(function ($notification) use ($pendingAppointmentIds) {
                $data = $notification->data;
                $appointmentId = is_array($data) ? ($data['appointment_id'] ?? null) : null;
                return $appointmentId && $pendingAppointmentIds->contains($appointmentId);
            })
            ->count();

        return response()->json([
            'success' => true,
            'data' => [ 'unviewed_count' => $count ]
        ]);
    }

    public function markAppointmentAsViewed($appointmentId): \Illuminate\Http\JsonResponse
    {
        $affected = Notification::where('type', 'appointment_book')
            ->where(function ($q) use ($appointmentId) {
                $q->where('data->appointment_id', (int)$appointmentId)
                  ->orWhere('data->appointment_id', (string)$appointmentId);
            })
            ->update([
                'is_viewed' => true,
                'viewed_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'data' => [ 'updated' => $affected, 'appointment_id' => (int)$appointmentId ]
        ]);
    }

    public function getAppointmentViewStates(): \Illuminate\Http\JsonResponse
    {
        $items = Notification::select('data', 'is_viewed')
            ->where('type', 'appointment_book')
            ->get()
            ->map(function ($n) {
                $appointmentId = is_array($n->data) ? ($n->data['appointment_id'] ?? null) : null;
                return $appointmentId ? [
                    'appointment_id' => (int)$appointmentId,
                    'is_viewed' => (bool)($n->is_viewed ?? false),
                ] : null;
            })
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }
}
