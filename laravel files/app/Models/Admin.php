<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Model
{
    //
}

class Admin extends Authenticatable {
    use HasApiTokens, HasFactory, Notifiable;
}
