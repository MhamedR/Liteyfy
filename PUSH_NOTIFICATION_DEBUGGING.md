# 🔍 Push Notification Debugging Guide

Your frontend and backend are configured and working! Here's how to test and debug the subscription flow.

---

## ✅ Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Frontend** | ✅ Running | http://localhost:4200 |
| **Backend API** | ✅ Running | http://localhost:3001 |
| **MongoDB** | ✅ Connected | Stores subscriptions |
| **CORS** | ✅ Configured | Allows frontend requests |
| **VAPID Keys** | ✅ Set | Public key configured |

---

## 🧪 Quick Test (Step-by-Step)

### **Method 1: Use the Test Page (Easiest)**

1. **Open the test page in your browser:**
   ```
   http://localhost:4200/test-push.html
   ```

2. **Follow the steps on the page:**
   - ✓ Step 1: Check browser support
   - ✓ Step 2: Register Service Worker
   - ✓ Step 3: Request permission
   - ✓ Step 4: Subscribe to push
   - ✓ Step 5: Save to backend

3. **Watch the console for any errors**

### **Method 2: Test in the Angular App**

1. **Open the app:**
   ```
   http://localhost:4200/dashboard
   ```

2. **Open Browser DevTools (F12)**

3. **Click "Enable Notifications" button**

4. **Check the Console tab for:**
   ```javascript
   // You should see:
   "Saving push subscription: {...}"
   "Push subscription successful: {...}"
   ```

5. **Common issues to check:**
   - Is Service Worker registered? (Check Application tab → Service Workers)
   - Is notification permission granted? (Check console: `Notification.permission`)
   - Are there any CORS errors?
   - Are there any 404 or 500 errors from the API?

---

## 🐛 Debugging Steps

### **1. Check Service Worker Registration**

Open DevTools → Application → Service Workers

**Should see:**
- `ngsw-worker.js` - Status: **activated and running**

**If not registered:**
```javascript
// In browser console:
navigator.serviceWorker.register('/ngsw-worker.js')
  .then(reg => console.log('SW registered:', reg))
  .catch(err => console.error('SW registration failed:', err));
```

### **2. Check Notification Permission**

In browser console:
```javascript
// Check current permission
console.log('Permission:', Notification.permission);
// Should be: 'granted', 'denied', or 'default'

// Request permission if needed
Notification.requestPermission()
  .then(permission => console.log('New permission:', permission));
```

### **3. Test Push Subscription Manually**

In browser console:
```javascript
navigator.serviceWorker.ready.then(async (registration) => {
  const VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjfTbkADt98CPWV3_oHlv8IMh-w4QyHqm9-CYdqMQkQ9BvQw5PiI';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
    });
    console.log('✓ Push subscription successful:', subscription.toJSON());

    // Now save to backend
    const response = await fetch('http://localhost:3001/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.toJSON().keys.p256dh,
        auth: subscription.toJSON().keys.auth,
        trainLines: [],
        weatherRegions: [],
        stibLines: []
      })
    });
    const data = await response.json();
    console.log('✓ Saved to backend:', data);
  } catch (error) {
    console.error('✗ Error:', error);
  }
});
```

### **4. Test Backend API Directly**

```bash
# Test GDPR consent
curl -X POST http://localhost:3001/api/gdpr/consent/grant \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","consentType":"PUSH_NOTIFICATIONS"}'

# Test subscription creation
curl -X POST http://localhost:3001/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/test",
    "p256dh": "test-key",
    "auth": "test-auth",
    "trainLines": []
  }'
```

---

## ❌ Common Issues & Solutions

### **Issue 1: "Service Worker not enabled"**

**Solution:**
- Check if you're using HTTPS or localhost (Service Workers require secure context)
- Clear browser cache and reload
- Check Application → Service Workers in DevTools

### **Issue 2: "Permission denied"**

**Solution:**
- Click the 🔒 icon in the address bar
- Reset notification permissions
- Or manually allow in browser settings

### **Issue 3: "Push subscription failed"**

**Possible causes:**
- Invalid VAPID key format
- Service Worker not registered
- Browser doesn't support Push API

**Solution:**
```javascript
// Verify VAPID key format (should be base64url, 88 characters)
console.log('VAPID key length:', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjfTbkADt98CPWV3_oHlv8IMh-w4QyHqm9-CYdqMQkQ9BvQw5PiI'.length);
// Should output: 88
```

### **Issue 4: "Failed to save to backend"**

**Check:**
1. Backend is running: `curl http://localhost:3001/health`
2. CORS is working: Check Network tab in DevTools
3. Request payload is correct: Check Console logs

### **Issue 5: "Nothing happens when I click Enable Notifications"**

**Debug:**
1. Open DevTools Console
2. Click the button
3. Look for errors in Console
4. Check Network tab for API calls

---

## 📊 Testing Checklist

- [ ] Frontend is accessible at http://localhost:4200
- [ ] Backend health check works: `curl http://localhost:3001/health`
- [ ] Service Worker is registered (DevTools → Application)
- [ ] Notification permission is **granted**
- [ ] VAPID key is configured (88 characters)
- [ ] API calls are successful (Network tab shows 200 OK)
- [ ] No CORS errors in console
- [ ] Subscription is saved to MongoDB

---

## 🎯 Expected Flow

When you click "Enable Notifications":

```
1. Frontend calls: pushNotificationService.requestSubscription()
   ↓
2. Service Worker: swPush.requestSubscription({serverPublicKey: VAPID_KEY})
   ↓
3. Browser: Shows permission dialog
   ↓
4. User: Grants permission
   ↓
5. Browser: Creates PushSubscription object
   ↓
6. Frontend: Calls savePushSubscription(subscription)
   ↓
7. HTTP POST: http://localhost:3001/api/subscriptions
   ↓
8. Backend: Saves to MongoDB
   ↓
9. Frontend: Updates UI (button disappears, shows stats)
   ↓
10. ✓ Success! You're subscribed!
```

---

## 🔍 Quick Diagnostic Commands

```bash
# Check if frontend is running
curl -s http://localhost:4200 | grep Liteyfy

# Check if backend is running
curl -s http://localhost:3001/health

# Check MongoDB connection
curl -s http://localhost:3001/health | jq '.database'

# List all subscriptions
curl -s http://localhost:3001/api/subscriptions

# Test GDPR endpoints
curl -X POST http://localhost:3001/api/gdpr/consent/grant \
  -H "Content-Type: application/json" \
  -d '{"userId":"debug-user","consentType":"PUSH_NOTIFICATIONS"}'
```

---

## 📝 What to Check in Browser Console

When testing, look for these messages:

### ✅ **Success Messages:**
```
"Saving push subscription: {...}"
"Push subscription successful: {...}"
"✓ Service Worker registered"
"✓ Permission granted"
```

### ❌ **Error Messages to Watch For:**
```
"Service Worker not enabled"
"Permission denied"
"Failed to fetch"
"CORS error"
"401 Unauthorized"
"500 Internal Server Error"
```

---

## 🚀 Next Steps After Successful Subscription

Once subscribed:

1. **Go to Subscriptions page:**
   ```
   http://localhost:4200/subscriptions
   ```

2. **Add train lines, weather regions, or STIB lines**

3. **Test with the backend event ingestion service:**
   ```bash
   cd backend/services/event-ingestion-service
   npm start
   ```

4. **Receive real-time notifications!** 🎉

---

## 💡 Pro Tips

- **Use Chrome DevTools** for best debugging experience
- **Check Application tab** to see Service Workers and Push subscriptions
- **Monitor Network tab** to see all API requests
- **Keep Console open** to catch any errors
- **Test in incognito mode** for a fresh start

---

## 📞 Still Having Issues?

If subscription still doesn't work:

1. **Try the test page first:** http://localhost:4200/test-push.html
2. **Clear all browser data** for localhost:4200
3. **Restart both frontend and backend**
4. **Check browser compatibility** (Chrome, Edge, Firefox all work)
5. **Try a different browser**

---

**Your system is configured correctly! The most common issue is browser permissions or Service Worker not being registered.**

Good luck! 🚀

