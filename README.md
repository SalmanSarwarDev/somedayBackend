# Someday API

Standalone Express API with a MongoDB `User` collection and JWT authentication.

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
  "password": "MyPassword123"
}
```

Signup creates an unverified account and emails a six-digit verification code. Configure Brevo SMTP using the `BREVO_SMTP_*` and `BREVO_SENDER_*` variables in `.env`. The code expires after 10 minutes.

### Verify email

`POST /api/auth/verify-email`

```json
{
  "email": "sam@example.com",
  "otp": "123456"
}
```

After verification succeeds, log in normally to receive a token. Login is not available before verification.

### Resend verification code

`POST /api/auth/resend-verification`

```json
{
  "email": "sam@example.com"
}
```

Resending is limited to once per minute for each account.

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
  "idToken": "<FIREBASE_ID_TOKEN>"
}
```

Authenticates using a Firebase Google ID token from the web or mobile client. If no account exists, an active, verified account is automatically created. If an account with the same email already exists, Google auth is linked. Returns the Someday JWT Bearer token in `data.token`.

A web test interface is available at `http://localhost:5001/` when running the server.

### Get profile

`GET /api/users/profile`

### Update profile

`PATCH /api/users/profile`

```json
{
  "firstName": "Samir",
  "phone": "+1-555-0100"
}
```

### Upload profile image

`PATCH /api/users/profile/avatar`

Send the request as `multipart/form-data`, with the image in the `avatar` field and the bearer token in the `Authorization` header. JPEG, PNG, and WebP images up to 5 MB are accepted. The server associates the upload with the authenticated user, stores it in that user's Cloudinary folder, and saves the secure image URL and Cloudinary public ID on that user's MongoDB document. The response includes the image URL in `data.user.avatar`. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`.

### Change password

`PATCH /api/auth/change-password`

```json
{
  "currentPassword": "MyPassword123",
  "newPassword": "AnotherPassword456"
}
```

All profile and password endpoints require the bearer token. Passwords are hashed before storage. The model uses the MongoDB collection named `User`.
fdfd