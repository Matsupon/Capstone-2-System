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
    Log::info('✅ Form Data:', $request->all());
    Log::info('✅ Has file:', ['has_file' => $request->hasFile('profile_image')]);

    $user = $request->user();

    $request->validate([
        'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
    ]);

    try {
        if ($request->hasFile('profile_image')) {
            $file = $request->file('profile_image');
            Log::info('✅ Uploaded file info:', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'real_path' => $file->getRealPath(),
                'size' => $file->getSize()
            ]);

            // Delete old image if exists
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
                Log::info('🗑️ Deleted old image:', [$user->profile_image]);
            }

            // Store new image
            $filename = 'profile_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('profile_images', $filename, 'public');

            // Save path to DB
            $user->profile_image = $path;
            $user->save();

            Log::info('✅ New profile image path saved in DB:', [$user->profile_image]);

            return response()->json([
                'message' => 'Profile updated successfully.',
                'user' => $user,
                'image_url' => asset('storage/' . $user->profile_image),
            ]);
            
        }

        return response()->json(['error' => 'No file received'], 400);
    } catch (\Exception $e) {
        Log::error('❌ Profile image upload failed: ' . $e->getMessage());
        return response()->json([
            'message' => 'Image upload failed',
            'error' => $e->getMessage()
        ], 500);
    }
}

}
