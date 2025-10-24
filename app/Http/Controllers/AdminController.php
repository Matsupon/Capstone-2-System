<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function update(Request $request)
    {
        $admin = $request->user();

        if (! $admin || !($admin instanceof \App\Models\Admin)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'fullname' => ['required', 'string', 'max:255', Rule::unique('admins', 'fullname')->ignore($admin->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('admins', 'email')->ignore($admin->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $admin->fullname = $validated['fullname'];
        $admin->email = $validated['email'];
        $admin->phone = $validated['phone'] ?? null;
        $admin->address = $validated['address'] ?? null;

        if (!empty($validated['password'])) {
            $admin->password = Hash::make($validated['password']);
        }

        $admin->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'admin' => [
                'id' => $admin->id,
                'fullname' => $admin->fullname,
                'email' => $admin->email,
                'phone' => $admin->phone,
                'address' => $admin->address,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $admin = $request->user();

        if (! $admin || !($admin instanceof \App\Models\Admin)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json([
            'admin' => [
                'id' => $admin->id,
                'fullname' => $admin->fullname,
                'email' => $admin->email,
                'phone' => $admin->phone,
                'address' => $admin->address,
            ],
        ]);
    }
}
