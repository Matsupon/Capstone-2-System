    <?php

use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\FeedbackController;

Route::get('/test', function () {
    return response()->json(['message' => 'API is working!', 'timestamp' => now()]);
});

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

    Route::get('/appointments/test', [AppointmentController::class, 'test']);
    
    Route::get('/appointments/test-next', [AppointmentController::class, 'getNextAppointmentByOrderStatus']);

    //customer side appointments
    Route::post('/appointments', [AppointmentController::class, 'store']); 
    Route::get('/appointments/available-slots', [AppointmentController::class, 'getAvailableSlots']);
    Route::get('/me/orders/latest', [OrderController::class, 'myLatest']);
    Route::get('/me/orders/history', [OrderController::class, 'myHistory']);
    Route::get('/appointments/next-appointment', [AppointmentController::class, 'getNextAppointmentByOrderStatus']);
    Route::get('/appointments/next', [AppointmentController::class, 'getNextAppointment']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);


    //admin side appointments
    Route::get('/appointments', [AppointmentController::class, 'index']); 
    Route::get('/admin/appointments', [AppointmentController::class, 'adminGetAllAppointments']); 
    Route::get('/admin/appointments/accepted', [AppointmentController::class, 'adminGetAcceptedAppointments']); 
    Route::get('/admin/appointments/{id}', [AppointmentController::class, 'adminGetAppointmentById']); 
    Route::delete('/appointments/{id}', [AppointmentController::class, 'destroy']);
    Route::delete('/admin/appointments/{id}/reject', [AppointmentController::class, 'adminRejectAppointment']); 

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/history', [OrderController::class, 'history']); 
    Route::post('/orders/{appointmentId}', [OrderController::class, 'store']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::get('/orders/booked-times', [OrderController::class, 'getBookedTimes']);
    Route::get('/orders/stats', [OrderController::class, 'getOrderStats']);
    Route::get('/orders/today-queue', [OrderController::class, 'getTodayQueue']);
    Route::get('/orders/today-appointments-count', [OrderController::class, 'getTodayAppointmentsCount']);
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    //Admin DASHBOARD
    Route::get('/orders/today-appointments-count', [OrderController::class, 'getTodayAppointmentsCount']);
    Route::get('/orders/today-queue', [OrderController::class, 'getTodayQueue']);
    Route::get('/dashboard-data', [OrderController::class, 'dashboardData']);
    Route::post('/orders/recalculate-queue', [OrderController::class, 'recalculateQueueNumbers']);

    // Feedback
    // Customer
    Route::get('/feedback/my-pending', [FeedbackController::class, 'myPending']);
    Route::post('/feedback', [FeedbackController::class, 'store']);
    // Admin
    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::patch('/feedback/{feedback}/respond', [FeedbackController::class, 'respond']);
    Route::delete('/feedback/{feedback}', [FeedbackController::class, 'destroy']);

});
