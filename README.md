# Someday API

Standalone Express API with a MongoDB `User` collection, Daily Routine Notification Module, and JWT authentication.

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your local MongoDB or Atlas connection string. Set the Cloudinary credentials and Brevo SMTP login, SMTP key, and verified sender email. Keep `.env` private and rotate any credentials that have been shared.
3. Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

The API listens on `http://localhost:5001` by default.

## Endpoints

### Sign up

`POST /api/auth/signup`

```json
{
  "firstName": "Sam",
  "lastName": "Khan",
  "email": "sam@example.com",
  "password": "MyPassword123",
  "timezone": "Asia/Karachi"
}
```

Signup creates an unverified account, saves the validated IANA timezone (default `Asia/Karachi`), automatically initializes the 6 predefined daily routines with randomized logical times, and emails a six-digit verification code.

### Verify email

`POST /api/auth/verify-email`

```json
{
  "email": "sam@example.com",
  "otp": "123456"
}
```

### Log in

`POST /api/auth/login`

```json
{
  "email": "sam@example.com",
  "password": "MyPassword123"
}
```

Copy `data.token` from the response and send it as `Authorization: Bearer <token>` for protected endpoints.

### Google Sign-in

`POST /api/auth/google`

```json
{
  "idToken": "<FIREBASE_ID_TOKEN>",
  "timezone": "Asia/Karachi"
}
```

### Forgot password

`POST /api/auth/forgot-password`

```json
{
  "email": "sam@example.com"
}
```

### Reset password

`POST /api/auth/reset-password`

```json
{
  "email": "sam@example.com",
  "otp": "123456",
  "newPassword": "MyNewPassword123"
}
```

### Change / Set password

`PATCH /api/auth/change-password`

```json
{
  "currentPassword": "MyPassword123",
  "newPassword": "AnotherPassword456"
}
```

### Get profile

`GET /api/users/profile`

### Update profile

`PATCH /api/users/profile`

```json
{
  "firstName": "Samir",
  "phone": "+1-555-0100",
  "timezone": "Europe/Budapest"
}
```

### Daily Routines

All routine endpoints require `Authorization: Bearer <token>`.

#### 1. Get user routines

`GET /api/routines`

Response:
```json
{
  "succeeded": true,
  "data": {
    "routines": [
      {
        "id": "6727...",
        "routineKey": "morning",
        "title": "Morning Routine",
        "description": "Start your day with mindfulness, hydration, and light stretching.",
        "time": "06:20",
        "order": 1,
        "isCompleted": false,
        "notificationEnabled": true,
        "isActive": true
      },
      {
        "id": "6728...",
        "routineKey": "coffee",
        "title": "Coffee Time",
        "description": "Enjoy your morning brew and plan your day ahead.",
        "time": "08:15",
        "order": 2,
        "isCompleted": true,
        "notificationEnabled": true,
        "isActive": true
      }
    ]
  }
}
```

#### 2. Update routine time

`PATCH /api/routines/:id/time`

```json
{
  "time": "08:30"
}
```

Updates the routine notification time. Must be in 24-hour `HH:mm` format.

#### 3. Toggle routine notification

`PATCH /api/routines/:id/notification`

```json
{
  "notificationEnabled": false
}
```

#### 4. Update routine completion (boolean toggle)

`PATCH /api/routines/:id/complete`

```json
{
  "isCompleted": true
}
```

Updates the routine's `isCompleted` boolean directly on the Routine document.

### Notifications (Firebase Cloud Messaging)

#### 1. Register Device Token

`POST /api/notifications/token`

```json
{
  "token": "fcm-device-registration-token...",
  "device": "web"
}
```

#### 2. Unregister Device Token (Logout)

`DELETE /api/notifications/token`

```json
{
  "token": "fcm-device-registration-token..."
}
```

#### 3. Send Notification to User

`POST /api/notifications/send`

```json
{
  "targetUserId": "6724...",
  "title": "Message",
  "body": "Hello!"
}
```
