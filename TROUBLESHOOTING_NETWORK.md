# Network Connectivity Troubleshooting Guide

## Problem: "Network Error" when booking appointments

The error `Network Error: {"message": "Network Error", "status": undefined, "url": "/appointments"}` indicates that your mobile app cannot connect to the Laravel backend server.

## Root Causes & Solutions

### 1. **Backend Server Not Running** ⚠️ MOST LIKELY CAUSE
**Problem**: Laravel backend is not started or not accessible
**Solution**: Start the Laravel backend server

```bash
cd BACKEND
php artisan serve --host=192.168.137.170 --port=8000
```

**Verify it's running**: Open `http://192.168.137.170:8000/api/test` in your browser

### 2. **Wrong IP Address** 🔍
**Problem**: IP address `192.168.137.170` is incorrect
**Solution**: Find the correct IP address

**On Windows (Backend machine)**:
```cmd
ipconfig
```
Look for your network adapter's IPv4 address

**On Mobile**: Make sure both devices are on the same WiFi network

### 3. **Firewall Blocking Connection** 🚫
**Problem**: Windows Firewall blocks port 8000
**Solution**: Allow Laravel through firewall

**Windows Firewall**:
1. Open "Windows Defender Firewall"
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings"
4. Find "PHP" or add new rule for port 8000

**Alternative**: Temporarily disable firewall for testing

### 4. **Network Configuration Issues** 🌐
**Problem**: Network settings prevent local connections
**Solution**: Check network configuration

**Verify both devices are on same network**:
- Same WiFi network name
- Same subnet (e.g., both 192.168.1.x)

### 5. **Port Already in Use** ⚡
**Problem**: Port 8000 is occupied by another service
**Solution**: Use different port

```bash
php artisan serve --host=192.168.137.170 --port=8001
```

Then update `mobile files/utils/api.js`:
```javascript
const baseURL = "http://192.168.137.170:8001/api";
```

## Testing Steps

### Step 1: Test Backend Server
```bash
cd BACKEND
php artisan serve --host=0.0.0.0 --port=8000
```

### Step 2: Test Network Connectivity
1. Open mobile app
2. Go to "Book an Appointment"
3. Click "Test Network" button
4. Check console logs for detailed error messages

### Step 3: Test API Endpoints
1. Click "Test API" button
2. Check console logs for response status
3. Verify authentication is working

### Step 4: Browser Test
Open in browser: `http://192.168.137.170:8000/api/test`
Should show: `{"message": "API is working!", "timestamp": "..."}`

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Network Error` | Server unreachable | Start backend server |
| `ECONNABORTED` | Connection timeout | Check firewall/network |
| `401 Unauthorized` | Token missing/invalid | Check authentication |
| `404 Not Found` | Route doesn't exist | Check API routes |

## Alternative Solutions

### Option 1: Use localhost (if on same machine)
```javascript
const baseURL = "http://localhost:8000/api";
```

### Option 2: Use machine's hostname
```javascript
const baseURL = "http://YOUR-MACHINE-NAME:8000/api";
```

### Option 3: Use 0.0.0.0 binding
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## Debug Commands

**Check if port is listening**:
```bash
netstat -an | findstr :8000
```

**Check network interfaces**:
```bash
ipconfig /all
```

**Test local connection**:
```bash
curl http://localhost:8000/api/test
```

## Still Having Issues?

1. **Check Laravel logs**: `BACKEND/storage/logs/laravel.log`
2. **Enable debug mode**: Set `APP_DEBUG=true` in `.env`
3. **Check CORS settings**: Verify `BACKEND/config/cors.php`
4. **Test with Postman**: Try API endpoints manually

## Quick Fix Checklist

- [ ] Backend server is running
- [ ] Correct IP address is used
- [ ] Port 8000 is not blocked
- [ ] Both devices on same network
- [ ] Firewall allows the connection
- [ ] Laravel is accessible via browser
- [ ] API endpoints return expected responses
