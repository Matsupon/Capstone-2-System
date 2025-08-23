    <?php

use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\OrderController;

// Test endpoint to verify API is working
Route::get('/test', function () {
    return response()->json(['message' => 'API is working!', 'timestamp' => now()]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware([
    EnsureFrontendRequestsAreStateful::class,
    'auth:sanctum',
])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/profile', [ProfileController::class, 'update']);

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

});

