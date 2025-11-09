<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $userId = $request->user()->id;
            \Log::info('Fetching notifications for user', ['user_id' => $userId]);
            
            // Filter out admin-only notification types (appointment_book) for customers
            $notifications = Notification::where('user_id', $userId)
                ->where('type', '!=', 'appointment_book')
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
        try {
            // Check if viewed_at column exists
            $hasViewedAt = Schema::hasColumn('notifications', 'viewed_at');
            
            // Only count appointments with status 'pending' AND viewed_at is NULL
            // Step 1: Get appointment IDs from unviewed notifications
            $query = Notification::where('type', 'appointment_book');
            if ($hasViewedAt) {
                $query->where(function ($q) {
                    $q->whereNull('viewed_at')->orWhere('viewed_at', '0000-00-00 00:00:00');
                });
            }
            
            $notificationAppointmentIds = $query->get()
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
            $countQuery = Notification::where('type', 'appointment_book');
            if ($hasViewedAt) {
                $countQuery->where(function ($q) {
                    $q->whereNull('viewed_at')->orWhere('viewed_at', '0000-00-00 00:00:00');
                });
            }
            
            $count = $countQuery->get()
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
        } catch (\Exception $e) {
            \Log::error('Error in countUnviewedAppointments', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to count unviewed appointments: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function markAppointmentAsViewed($appointmentId): \Illuminate\Http\JsonResponse
    {
        try {
            $hasViewedAt = Schema::hasColumn('notifications', 'viewed_at');
            $hasIsViewed = Schema::hasColumn('notifications', 'is_viewed');
            
            $updateData = [];
            if ($hasIsViewed) {
                $updateData['is_viewed'] = true;
            }
            if ($hasViewedAt) {
                $updateData['viewed_at'] = now();
            }
            
            $affected = Notification::where('type', 'appointment_book')
                ->where(function ($q) use ($appointmentId) {
                    $q->where('data->appointment_id', (int)$appointmentId)
                      ->orWhere('data->appointment_id', (string)$appointmentId);
                })
                ->update($updateData);

            return response()->json([
                'success' => true,
                'data' => [ 'updated' => $affected, 'appointment_id' => (int)$appointmentId ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in markAppointmentAsViewed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to mark appointment as viewed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getAppointmentViewStates(): \Illuminate\Http\JsonResponse
    {
        try {
            $hasIsViewed = Schema::hasColumn('notifications', 'is_viewed');
            
            $selectFields = ['data'];
            if ($hasIsViewed) {
                $selectFields[] = 'is_viewed';
            }
            
            $items = Notification::select($selectFields)
                ->where('type', 'appointment_book')
                ->get()
                ->map(function ($n) use ($hasIsViewed) {
                    $appointmentId = is_array($n->data) ? ($n->data['appointment_id'] ?? null) : null;
                    return $appointmentId ? [
                        'appointment_id' => (int)$appointmentId,
                        'is_viewed' => $hasIsViewed ? (bool)($n->is_viewed ?? false) : false,
                    ] : null;
                })
                ->filter()
                ->values();

            return response()->json([
                'success' => true,
                'data' => $items,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getAppointmentViewStates', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to get appointment view states: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Update all old appointment_booked notifications to have the correct message
    public function updateAppointmentBookedNotifications(): \Illuminate\Http\JsonResponse
    {
        try {
            $updated = Notification::where('type', 'appointment_booked')
                ->update([
                    'title' => 'You have successfully booked an appointment!',
                    'body' => 'Please wait while the admin reviews your appointment request. Your order will be processed once it has been approved.'
                ]);

            return response()->json([
                'success' => true,
                'message' => "Updated {$updated} appointment notifications",
                'count' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Admin notifications
    public function adminIndex(Request $request)
    {
        try {
            // Get all admin notifications (user_id = 0)
            $notifications = Notification::where('user_id', 0)
                ->where('type', 'customer_appointment_updated')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $notifications,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch admin notifications', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch admin notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function adminUnviewedCount(Request $request)
    {
        try {
            $hasIsViewed = Schema::hasColumn('notifications', 'is_viewed');
            
            $query = Notification::where('user_id', 0)
                ->where('type', 'customer_appointment_updated');
            
            if ($hasIsViewed) {
                $count = $query->where('is_viewed', false)->count();
            } else {
                $count = $query->count();
            }

            return response()->json([
                'success' => true,
                'data' => ['unviewed_count' => $count]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in adminUnviewedCount', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to count unviewed admin notifications: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function markAdminNotificationAsViewed(Request $request, $id)
    {
        try {
            $hasIsViewed = Schema::hasColumn('notifications', 'is_viewed');
            $hasViewedAt = Schema::hasColumn('notifications', 'viewed_at');
            
            $updateData = [];
            if ($hasIsViewed) {
                $updateData['is_viewed'] = true;
            }
            if ($hasViewedAt) {
                $updateData['viewed_at'] = now();
            }
            
            $notification = Notification::where('id', $id)
                ->where('user_id', 0)
                ->where('type', 'customer_appointment_updated')
                ->firstOrFail();
            
            $notification->update($updateData);

            return response()->json([
                'success' => true,
                'data' => $notification
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in markAdminNotificationAsViewed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to mark notification as viewed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
