<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request) {
        $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'phone' => 'required',
            'address' => 'required',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['token' => $user->createToken('mobile')->plainTextToken]);
    }

    public function login(Request $request) {
        $user = User::where('email', $request->email)->first();
        if (! $user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }
        return response()->json(['token' => $user->createToken('mobile')->plainTextToken]);
    }

    public function user(Request $request) {
        return response()->json($request->user());
    }

    public function logout(Request $request) {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}
