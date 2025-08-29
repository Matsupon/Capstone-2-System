<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ProfileController extends Controller
{
    public function update(Request $request)
{
    Log::info('✅ Received updateProfile request');
    Log::info('✅ Has file:', ['has_file' => $request->hasFile('profile_image')]);

    $user = $request->user();

    $validated = $request->validate([
        'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        'name'   => 'sometimes|string|max:255',
        'email'  => 'sometimes|email|max:255|unique:users,email,' . $user->id,
        'phone'  => 'sometimes|string|max:20',
        'address'=> 'sometimes|string|max:255',
        'password' => 'sometimes|string|min:6',
    ]);

    try {
        // Update profile fields if provided
        $fields = ['name','email','phone','address'];
        $dirty = false;
        foreach ($fields as $field) {
            if ($request->filled($field)) {
                $user->{$field} = $validated[$field];
                $dirty = true;
            }
        }
        if ($request->filled('password')) {
            $user->password = bcrypt($validated['password']);
            $dirty = true;
        }

        // Handle optional image upload
        if ($request->hasFile('profile_image')) {
            $file = $request->file('profile_image');
            Log::info('✅ Uploaded file info:', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize()
            ]);

            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
                Log::info('🗑️ Deleted old image:', [$user->profile_image]);
            }

            $filename = 'profile_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('profile_images', $filename, 'public');
            $user->profile_image = $path;
            $dirty = true;
        }

        if ($dirty) {
            $user->save();
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user,
            'image_url' => $user->profile_image ? asset('storage/' . $user->profile_image) : null,
        ]);
    } catch (\Exception $e) {
        Log::error('❌ Profile update failed: ' . $e->getMessage());
        return response()->json([
            'message' => 'Profile update failed',
            'error' => $e->getMessage()
        ], 500);
    }
}

}
