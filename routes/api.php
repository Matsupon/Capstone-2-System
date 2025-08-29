    <?php

use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\NotificationController;

// Test endpoint to verify API is working
Route::get('/test', function () {
    return response()->json(['message' => 'API is working!', 'timestamp' => now()]);
});

// Test endpoint for appointments (no auth required for debugging)
Route::get('/test-appointments', function () {
    return response()->json([
        'message' => 'Appointments endpoint is accessible!',
        'timestamp' => now(),
        'auth_required' => true
    ]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', [AuthController::class, 'user']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/profile', [ProfileController::class, 'update']);

    // Test appointment controller
    Route::get('/appointments/test', [AppointmentController::class, 'test']);
    
    // Test the new method
    Route::get('/appointments/test-next', [AppointmentController::class, 'getNextAppointmentByOrderStatus']);

    //customer side appointments
    Route::post('/appointments', [AppointmentController::class, 'store']); 
    Route::get('/appointments/available-slots', [AppointmentController::class, 'getAvailableSlots']);

    //admin side appointments
    Route::get('/appointments', [AppointmentController::class, 'index']); // fetch all appointments
    Route::get('/admin/appointments', [AppointmentController::class, 'adminGetAllAppointments']); // admin fetch all appointments
    Route::get('/admin/appointments/{id}', [AppointmentController::class, 'adminGetAppointmentById']); // admin fetch appointment by ID
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']); // reject
    Route::delete('/admin/appointments/{id}/reject', [AppointmentController::class, 'adminRejectAppointment']); // admin reject

    // Orders
    Route::get('/orders', [OrderController::class, 'index']); // list all orders
    Route::post('/orders/{appointmentId}', [OrderController::class, 'store']);

    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Orders: update status (Ready to Check / Completed, etc.)
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    // Orders: get booked times for a given date and kind
    Route::get('/orders/booked-times', [OrderController::class, 'getBookedTimes']);

    // Mobile: fetch latest order for current user
    Route::get('/me/orders/latest', [OrderController::class, 'myLatest']);

    //Mobile: fetch next appointment based on order status (more specific route first)
    Route::get('/appointments/next-appointment', [AppointmentController::class, 'getNextAppointmentByOrderStatus']);
    
    //Mobile: fetch latest appointment date (less specific route last)
    Route::get('/appointments/next', [AppointmentController::class, 'getNextAppointment']);
});

