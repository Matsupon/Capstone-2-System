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
}
