<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function update(Request $request) {
        $user = $request->user();
    
        $request->validate([
            'name' => 'required',
            'phone' => 'required',
            'address' => 'required',
        ]);
    
        $user->update($request->only('name', 'phone', 'address'));
    
        return response()->json(['message' => 'Profile updated successfully.']);
    }
}
