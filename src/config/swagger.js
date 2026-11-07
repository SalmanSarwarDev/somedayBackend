const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Someday API Documentation',
    version: '1.0.0',
    description: `
**Someday REST API** — Complete backend service providing:
- 🔐 **Authentication & Security:** JWT tokens, email OTP verification, password hashing, Google Firebase Sign-In.
- ⏰ **Daily Routines Module:** 6 sequential daily routines with automatic time randomizer and daily completion tracking.
- 🌍 **Timezone Management:** Automatic IANA timezone detection, conversion, and updates.
- 🔔 **Push Notifications:** Firebase Cloud Messaging (FCM) multicast pushes, dead token pruning, and timezone-aware cron scheduler.
- 🛒 **E-Commerce Module:** Categories (nested subcategory support), Products (search/filter/sort/paginate), Cart (live server-side pricing), Orders (atomic stock management, cancellation with stock restoration).
    `,
    contact: {
      name: 'Someday Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server',
    },
    {
      url: '/',
      description: 'Current Production Host',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'Signup, login, Google auth, email verification, and password recovery' },
    { name: 'User Profile', description: 'User account details, timezone, and avatar management' },
    { name: 'Daily Routines', description: 'Daily routine management, schedule times, notification toggles, and completion' },
    { name: 'Push Notifications', description: 'Firebase Cloud Messaging device token management and test push dispatches' },
    { name: 'System', description: 'Server health and monitoring' },
    { name: 'Shop — Categories', description: 'Product category CRUD. Supports nested subcategories via parent field.' },
    { name: 'Shop — Products', description: 'Product CRUD with full-text search, category/price filters, sorting and pagination.' },
    { name: 'Cart', description: 'Authenticated shopping cart — add, update quantity, remove and clear items. Prices always recalculated server-side.' },
    { name: 'Orders', description: 'Place orders with atomic stock deduction, view order history, details and cancel eligible orders with stock restoration.' },
    { name: 'Payments', description: 'Stripe PaymentIntents integration, card details, automatic order confirmation, webhooks, and refunds.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT Bearer token obtained from `/api/auth/login` or `/api/auth/google`.',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          succeeded: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          succeeded: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          firstName: { type: 'string', example: 'Salman' },
          lastName: { type: 'string', example: 'Sarwar' },
          email: { type: 'string', example: 'salman@example.com' },
          timezone: { type: 'string', example: 'Asia/Karachi' },
          phone: { type: 'string', example: '+923001234567' },
          avatar: { type: 'string', example: 'https://res.cloudinary.com/.../avatar.jpg' },
          emailVerified: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Routine: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6ae9200933667575bbe8e4a5' },
          userId: { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          routineKey: { type: 'string', example: 'morning' },
          title: { type: 'string', example: 'Morning Routine' },
          description: { type: 'string', example: 'Start your day with mindfulness, hydration, and light stretching.' },
          time: { type: 'string', example: '06:15' },
          order: { type: 'integer', example: 1 },
          isCompleted: { type: 'boolean', example: false },
          notificationEnabled: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SignupRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password'],
        properties: {
          firstName: { type: 'string', example: 'Salman' },
          lastName: { type: 'string', example: 'Sarwar' },
          email: { type: 'string', format: 'email', example: 'salmansarwar988@gmail.com' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'Secret1234' },
          timezone: { type: 'string', example: 'Asia/Karachi' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'salmansarwar988@gmail.com' },
          password: { type: 'string', format: 'password', example: 'Secret1234' },
        },
      },
      GoogleLoginRequest: {
        type: 'object',
        required: ['idToken'],
        properties: {
          idToken: { type: 'string', description: 'Firebase Google ID token from frontend', example: 'eyJhbGciOiJSUzI1NiIs...' },
          timezone: { type: 'string', example: 'Asia/Karachi' },
        },
      },
      VerifyEmailRequest: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email', example: 'salmansarwar988@gmail.com' },
          code: { type: 'string', example: '123456' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'salmansarwar988@gmail.com' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'code', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'salmansarwar988@gmail.com' },
          code: { type: 'string', example: '123456' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'NewSecret1234' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'Secret1234' },
          newPassword: { type: 'string', format: 'password', minLength: 8, example: 'NewSecret1234' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          firstName: { type: 'string', example: 'Salman' },
          lastName: { type: 'string', example: 'Sarwar' },
          phone: { type: 'string', example: '+923001234567' },
          timezone: { type: 'string', example: 'Asia/Karachi' },
        },
      },
      UpdateRoutineTimeRequest: {
        type: 'object',
        required: ['time'],
        properties: {
          time: { type: 'string', example: '07:30', description: '24-hour time format (HH:mm)' },
          timezone: { type: 'string', example: 'Asia/Karachi', description: 'Optional user timezone update' },
        },
      },
      ToggleNotificationRequest: {
        type: 'object',
        required: ['notificationEnabled'],
        properties: {
          notificationEnabled: { type: 'boolean', example: true },
        },
      },
      CompleteRoutineRequest: {
        type: 'object',
        properties: {
          isCompleted: { type: 'boolean', example: true },
        },
      },
      FcmTokenRequest: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', example: 'dvHRnQrhs9wEobCUAisWel:APA91bGQZLpHGiU...' },
          device: { type: 'string', example: 'web', enum: ['web', 'android', 'ios'] },
        },
      },
      SendNotificationRequest: {
        type: 'object',
        required: ['userId', 'title', 'body'],
        properties: {
          userId: { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          title: { type: 'string', example: 'Custom Push 🔔' },
          body: { type: 'string', example: 'Hello from Someday Admin!' },
          imageUrl: { type: 'string', example: 'https://example.com/icon.png' },
          data: { type: 'object', example: { type: 'custom_alert' } },
        },
      },
      TestNotificationRequest: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Optional specific FCM token to test' },
          title: { type: 'string', example: 'Test Notification 🔔' },
          body: { type: 'string', example: 'This is a test notification.' },
          imageUrl: { type: 'string', example: '' },
        },
      },

      // ----------------------------------------------------------------
      // E-Commerce Schemas
      // ----------------------------------------------------------------
      Category: {
        type: 'object',
        properties: {
          id:          { type: 'string', example: '6730a1b2c3d4e5f678901234' },
          name:        { type: 'string', example: 'Electronics' },
          slug:        { type: 'string', example: 'electronics' },
          description: { type: 'string', example: 'Gadgets, devices and consumer electronics.' },
          image:       { type: 'string', example: '' },
          parent:      { type: 'object', nullable: true, properties: { id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' } } },
          isActive:    { type: 'boolean', example: true },
          order:       { type: 'integer', example: 1 },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name:        { type: 'string', example: 'Electronics' },
          slug:        { type: 'string', example: 'electronics', description: 'Auto-derived from name if omitted' },
          description: { type: 'string', example: 'Gadgets and devices' },
          image:       { type: 'string', example: '' },
          parent:      { type: 'string', nullable: true, example: null, description: 'Parent category ObjectId for subcategories' },
          isActive:    { type: 'boolean', example: true },
          order:       { type: 'integer', example: 1 },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id:            { type: 'string', example: '6730b1c2d3e4f5a678902345' },
          name:          { type: 'string', example: 'Samsung Galaxy S24 Ultra' },
          slug:          { type: 'string', example: 'samsung-galaxy-s24-ultra' },
          description:   { type: 'string', example: 'Flagship Android smartphone…' },
          price:         { type: 'number', example: 369999 },
          priceInCents:  { type: 'integer', example: 36999900 },
          category:      { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' } } },
          images:        { type: 'array', items: { type: 'string' } },
          stock:         { type: 'integer', example: 15 },
          brand:         { type: 'string', example: 'Samsung' },
          tags:          { type: 'array', items: { type: 'string' }, example: ['smartphone', '5g'] },
          specifications:{ type: 'object', example: { RAM: '12GB', Storage: '256GB' } },
          isActive:      { type: 'boolean', example: true },
          rating:        { type: 'number', example: 4.8 },
          reviewCount:   { type: 'integer', example: 312 },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'price', 'category', 'stock'],
        properties: {
          name:          { type: 'string', example: 'Samsung Galaxy S24 Ultra' },
          slug:          { type: 'string', example: 'samsung-galaxy-s24-ultra', description: 'Auto-derived from name if omitted' },
          description:   { type: 'string', example: 'Flagship Android smartphone…' },
          price:         { type: 'number', example: 369999, description: 'Price in PKR (or base currency). Backend converts to cents.' },
          category:      { type: 'string', example: '6730a1b2c3d4e5f678901234', description: 'Category ObjectId' },
          images:        { type: 'array', items: { type: 'string' }, example: [] },
          stock:         { type: 'integer', example: 15 },
          brand:         { type: 'string', example: 'Samsung' },
          tags:          { type: 'array', items: { type: 'string' }, example: ['smartphone', '5g'] },
          specifications:{ type: 'object', example: { RAM: '12GB', Storage: '256GB' } },
          isActive:      { type: 'boolean', example: true },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          product:         { type: 'string', example: '6730b1c2d3e4f5a678902345' },
          name:            { type: 'string', example: 'Samsung Galaxy S24 Ultra' },
          slug:            { type: 'string', example: 'samsung-galaxy-s24-ultra' },
          brand:           { type: 'string', example: 'Samsung' },
          priceInCents:    { type: 'integer', example: 36999900 },
          price:           { type: 'number', example: 369999 },
          quantity:        { type: 'integer', example: 2 },
          stock:           { type: 'integer', example: 15 },
          inStock:         { type: 'boolean', example: true },
          lineTotalInCents:{ type: 'integer', example: 73999800 },
          lineTotal:       { type: 'number', example: 739998 },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id:             { type: 'string', example: '6730c1d2e3f4a5b678903456' },
          user:           { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          items:          { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          subtotalInCents:{ type: 'integer', example: 73999800 },
          subtotal:       { type: 'number', example: 739998 },
          itemCount:      { type: 'integer', example: 2 },
          updatedAt:      { type: 'string', format: 'date-time' },
        },
      },
      AddToCartRequest: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', example: '6730b1c2d3e4f5a678902345' },
          quantity:  { type: 'integer', example: 1, minimum: 1 },
        },
      },
      UpdateCartItemRequest: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'integer', example: 3, minimum: 0, description: 'Set to 0 to remove the item' },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          product:         { type: 'string', example: '6730b1c2d3e4f5a678902345' },
          name:            { type: 'string', example: 'Samsung Galaxy S24 Ultra' },
          priceInCents:    { type: 'integer', example: 36999900 },
          price:           { type: 'number', example: 369999 },
          quantity:        { type: 'integer', example: 1 },
          lineTotalInCents:{ type: 'integer', example: 36999900 },
          lineTotal:       { type: 'number', example: 369999 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id:              { type: 'string', example: '6730d1e2f3a4b5c678904567' },
          user:            { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          orderNumber:     { type: 'string', example: 'ORD-20261105-X7K2P1' },
          items:           { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          subtotalInCents: { type: 'integer', example: 36999900 },
          subtotal:        { type: 'number', example: 369999 },
          totalInCents:    { type: 'integer', example: 36999900 },
          total:           { type: 'number', example: 369999 },
          status:          { type: 'string', enum: ['pending','confirmed','processing','shipped','delivered','cancelled'], example: 'pending' },
          shippingAddress: { type: 'object', properties: { fullName: { type: 'string' }, line1: { type: 'string' }, city: { type: 'string' }, country: { type: 'string' }, phone: { type: 'string' } } },
          notes:           { type: 'string', example: 'Please leave at the door.' },
          cancelledAt:     { type: 'string', format: 'date-time', nullable: true },
          cancellationReason: { type: 'string', example: 'Changed my mind' },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', example: '6730b1c2d3e4f5a678902345' },
                quantity:  { type: 'integer', example: 1, minimum: 1 },
              },
            },
          },
          shippingAddress: {
            type: 'object',
            properties: {
              fullName:   { type: 'string', example: 'Salman Sarwar' },
              line1:      { type: 'string', example: '123 Main Street' },
              line2:      { type: 'string', example: 'Apt 4B' },
              city:       { type: 'string', example: 'Lahore' },
              state:      { type: 'string', example: 'Punjab' },
              postalCode: { type: 'string', example: '54000' },
              country:    { type: 'string', example: 'Pakistan' },
              phone:      { type: 'string', example: '+923001234567' },
            },
          },
          notes: { type: 'string', example: 'Please leave at the door.' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total:       { type: 'integer', example: 42 },
          page:        { type: 'integer', example: 1 },
          limit:       { type: 'integer', example: 20 },
          totalPages:  { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },
      PaymentIntentResponse: {
        type: 'object',
        properties: {
          clientSecret:    { type: 'string', example: 'pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_YrKJ...' },
          paymentIntentId: { type: 'string', example: 'pi_3MtwBwLkdIwHu7ix28a3tqPa' },
          amountInCents:   { type: 'integer', example: 36999900 },
          amount:          { type: 'number', example: 369999 },
          currency:        { type: 'string', example: 'usd' },
          status:          { type: 'string', example: 'requires_payment_method' },
          isExisting:      { type: 'boolean', example: false },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id:                    { type: 'string', example: '6730e1f2a3b4c5d678905678' },
          order:                 { type: 'string', example: '6730d1e2f3a4b5c678904567' },
          user:                  { type: 'string', example: '6ae9200833667575bbe8e4a4' },
          stripePaymentIntentId: { type: 'string', example: 'pi_3MtwBwLkdIwHu7ix28a3tqPa' },
          amountInCents:         { type: 'integer', example: 36999900 },
          amount:                { type: 'number', example: 369999 },
          currency:              { type: 'string', example: 'usd' },
          status:                { type: 'string', enum: ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'cancelled', 'refunded', 'partially_refunded', 'failed'], example: 'succeeded' },
          paymentMethod:         { type: 'string', example: 'card' },
          cardLast4:             { type: 'string', example: '4242' },
          cardBrand:             { type: 'string', example: 'visa' },
          paidAt:                { type: 'string', format: 'date-time' },
          refundedAmountInCents: { type: 'integer', example: 0 },
          refundedAmount:        { type: 'number', example: 0 },
          refundedAt:            { type: 'string', format: 'date-time', nullable: true },
          refundReason:          { type: 'string', example: '' },
          createdAt:             { type: 'string', format: 'date-time' },
          updatedAt:             { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns server operational status',
        responses: {
          200: {
            description: 'Server is healthy and running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        description: 'Creates user, saves detected timezone, auto-initializes 6 sequential routines with random logical times, and emails an OTP code.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } },
          },
          400: { description: 'Missing required fields or invalid password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate with email and password',
        description: 'Validates credentials and returns JWT Bearer token and user profile.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    succeeded: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Email and password required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Invalid email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Email not verified or account inactive', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in or register with Google',
        description: 'Validates Firebase Google ID token, creates user and 6 routines if new, and returns JWT.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GoogleLoginRequest' } } },
        },
        responses: {
          200: { description: 'Google login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Invalid or expired Google token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify user email with 6-digit OTP code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailRequest' } } },
        },
        responses: {
          200: { description: 'Email verified successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Invalid or expired verification code', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend email verification OTP code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } },
        },
        responses: {
          200: { description: 'Verification code resent', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request a password reset OTP code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } } },
        },
        responses: {
          200: { description: 'Reset code sent to email', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password using email OTP code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
        },
        responses: {
          200: { description: 'Password reset successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
        },
      },
    },
    '/api/auth/change-password': {
      patch: {
        tags: ['Authentication'],
        summary: 'Change current account password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
        },
        responses: {
          200: { description: 'Password changed successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Incorrect current password or invalid new password' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users/profile': {
      get: {
        tags: ['User Profile'],
        summary: 'Get logged-in user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
      patch: {
        tags: ['User Profile'],
        summary: 'Update logged-in user profile details',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } } },
        },
        responses: {
          200: { description: 'Profile updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users/profile/avatar': {
      patch: {
        tags: ['User Profile'],
        summary: 'Upload or update profile avatar image',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  avatar: { type: 'string', format: 'binary', description: 'Avatar image file (JPEG, PNG, WebP)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Avatar updated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/routines': {
      get: {
        tags: ['Daily Routines'],
        summary: 'Get all user daily routines in sequence',
        description: 'Returns the 6 predefined daily routines (Morning, Coffee, Lunch, Tea, Dinner, Bedtime) in chronological order with current status.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of user routines',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'integer', example: 200 },
                    succeeded: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Routines retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        routines: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Routine' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/routines/{id}/time': {
      patch: {
        tags: ['Daily Routines'],
        summary: 'Update routine notification time and optionally user timezone',
        description: 'Updates the daily trigger time (HH:mm) for a specific routine. If timezone is passed, it validates and updates the user profile timezone simultaneously.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Routine MongoDB ID', schema: { type: 'string' }, example: '6ae9200933667575bbe8e4a5' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRoutineTimeRequest' } } },
        },
        responses: {
          200: { description: 'Routine time updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Invalid time format or invalid IANA timezone' },
          404: { description: 'Routine not found' },
        },
      },
    },
    '/api/routines/{id}/notification': {
      patch: {
        tags: ['Daily Routines'],
        summary: 'Toggle push notification ON or OFF for a routine',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Routine MongoDB ID', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ToggleNotificationRequest' } } },
        },
        responses: {
          200: { description: 'Notification preference updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Routine not found' },
        },
      },
    },
    '/api/routines/{id}/complete': {
      patch: {
        tags: ['Daily Routines'],
        summary: 'Mark a routine as completed or incomplete',
        description: 'When marked completed (isCompleted: true), the routine notification will not be sent for today.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Routine MongoDB ID', schema: { type: 'string' } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CompleteRoutineRequest' } } },
        },
        responses: {
          200: { description: 'Completion status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Routine not found' },
        },
      },
    },
    '/api/notifications/token': {
      post: {
        tags: ['Push Notifications'],
        summary: 'Register or refresh an FCM device push token',
        description: 'Associates a browser or mobile device FCM registration token with the authenticated user account.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FcmTokenRequest' } } },
        },
        responses: {
          200: { description: 'Device token registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Valid token string required' },
          401: { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Push Notifications'],
        summary: 'Unregister an FCM device token (e.g. on logout)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/FcmTokenRequest' } } },
        },
        responses: {
          200: { description: 'Device token removed successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/notifications/send': {
      post: {
        tags: ['Push Notifications'],
        summary: 'Send a push notification to a specific user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SendNotificationRequest' } } },
        },
        responses: {
          200: { description: 'Notification sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/notifications/test': {
      post: {
        tags: ['Push Notifications'],
        summary: 'Send an instant test push notification',
        description: 'Sends a test push notification to all devices registered for the authenticated user or to a provided test token.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TestNotificationRequest' } } },
        },
        responses: {
          200: { description: 'Test notification delivered', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'No registered devices found for user' },
        },
      },
    },

    // -------------------------------------------------------------------------
    // E-Commerce: Categories
    // -------------------------------------------------------------------------
    '/api/shop/categories': {
      get: {
        tags: ['Shop — Categories'],
        summary: 'List all active categories',
        description: 'Returns all active categories with optional parent reference for breadcrumb navigation. Pass `showInactive=true` to include inactive ones.',
        parameters: [
          { name: 'showInactive', in: 'query', schema: { type: 'boolean' }, description: 'Include inactive categories (default: false)' },
        ],
        responses: {
          200: {
            description: 'Categories retrieved',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } } } } },
          },
        },
      },
      post: {
        tags: ['Shop — Categories'],
        summary: 'Create a new category',
        description: 'Creates a top-level or nested (subcategory) category. Slug is auto-derived from name if not provided.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: {
          201: { description: 'Category created', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Validation error' },
          409: { description: 'Slug already exists' },
        },
      },
    },
    '/api/shop/categories/{id}': {
      get: {
        tags: ['Shop — Categories'],
        summary: 'Get a category by ID or slug',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Category ObjectId or slug', schema: { type: 'string' }, example: 'electronics' },
        ],
        responses: {
          200: { description: 'Category retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Category not found' },
        },
      },
      put: {
        tags: ['Shop — Categories'],
        summary: 'Update a category',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: {
          200: { description: 'Category updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Category not found' },
        },
      },
      delete: {
        tags: ['Shop — Categories'],
        summary: 'Deactivate a category (soft delete)',
        description: 'Sets isActive to false. Fails if the category has active subcategories.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Category deactivated' },
          404: { description: 'Category not found' },
          409: { description: 'Has active subcategories' },
        },
      },
    },

    // -------------------------------------------------------------------------
    // E-Commerce: Products
    // -------------------------------------------------------------------------
    '/api/shop/products': {
      get: {
        tags: ['Shop — Products'],
        summary: 'List products with search, filters, sorting and pagination',
        description: `
**Filtering & search:**
- \`q\` — Full-text search across name, description, brand and tags.
- \`categoryId\` — Filter by Category ObjectId.
- \`minPrice\` / \`maxPrice\` — Price range in PKR (the backend converts to cents).

**Sorting:** \`sortBy\` can be \`priceInCents\`, \`name\`, \`rating\`, \`createdAt\`, \`reviewCount\`. \`sortDir\` is \`asc\` or \`desc\`.

**Pagination:** \`page\` (default 1), \`limit\` (default 20, max 100).
        `,
        parameters: [
          { name: 'q',          in: 'query', schema: { type: 'string' }, description: 'Full-text search', example: 'samsung' },
          { name: 'categoryId', in: 'query', schema: { type: 'string' }, description: 'Filter by category ObjectId' },
          { name: 'minPrice',   in: 'query', schema: { type: 'number' }, description: 'Minimum price (PKR)', example: 10000 },
          { name: 'maxPrice',   in: 'query', schema: { type: 'number' }, description: 'Maximum price (PKR)', example: 500000 },
          { name: 'sortBy',     in: 'query', schema: { type: 'string', enum: ['priceInCents','name','rating','createdAt','reviewCount'] }, example: 'priceInCents' },
          { name: 'sortDir',    in: 'query', schema: { type: 'string', enum: ['asc','desc'] }, example: 'asc' },
          { name: 'page',       in: 'query', schema: { type: 'integer' }, example: 1 },
          { name: 'limit',      in: 'query', schema: { type: 'integer' }, example: 20 },
          { name: 'showInactive', in: 'query', schema: { type: 'boolean' }, description: 'Include inactive products' },
        ],
        responses: {
          200: {
            description: 'Products retrieved with pagination',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
          },
        },
      },
      post: {
        tags: ['Shop — Products'],
        summary: 'Create a new product',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: {
          201: { description: 'Product created', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Validation error' },
          404: { description: 'Category not found' },
          409: { description: 'Slug already exists' },
        },
      },
    },
    '/api/shop/products/{id}': {
      get: {
        tags: ['Shop — Products'],
        summary: 'Get a product by ID or slug',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Product ObjectId or slug', schema: { type: 'string' }, example: 'samsung-galaxy-s24-ultra' },
        ],
        responses: {
          200: { description: 'Product retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Product not found' },
        },
      },
      put: {
        tags: ['Shop — Products'],
        summary: 'Update a product',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: {
          200: { description: 'Product updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Shop — Products'],
        summary: 'Deactivate a product (soft delete)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Product deactivated' },
          404: { description: 'Product not found' },
        },
      },
    },

    // -------------------------------------------------------------------------
    // E-Commerce: Cart (authenticated)
    // -------------------------------------------------------------------------
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get the current user\'s cart with live pricing',
        description: 'Returns the cart with server-recalculated prices. Unavailable/deleted products are silently excluded.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cart retrieved', content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } } } } } } },
          401: { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear the entire cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cart cleared', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add an item to cart (or increase quantity if already present)',
        description: 'Validates product availability and stock before adding. Returns the full updated cart.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddToCartRequest' } } },
        },
        responses: {
          201: { description: 'Item added to cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Invalid input' },
          404: { description: 'Product not found or unavailable' },
          409: { description: 'Insufficient stock' },
        },
      },
    },
    '/api/cart/items/{productId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Update cart item quantity',
        description: 'Set quantity to 0 to remove the item. Validates stock availability.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' }, description: 'Product ObjectId' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCartItemRequest' } } },
        },
        responses: {
          200: { description: 'Cart updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Item not in cart' },
          409: { description: 'Insufficient stock' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove a specific item from cart',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' }, description: 'Product ObjectId' },
        ],
        responses: {
          200: { description: 'Item removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Item not in cart' },
        },
      },
    },

    // -------------------------------------------------------------------------
    // E-Commerce: Orders (authenticated)
    // -------------------------------------------------------------------------
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place a new order',
        description: `
Places an order using backend-authoritative prices (never trusts client prices).

**Flow:**
1. Re-fetches current prices from the Product collection.
2. Validates stock for all items.
3. Atomically deducts stock (via transaction on replica sets, or compensation pattern on standalone MongoDB).
4. Creates the order with a price snapshot.
5. Clears the user's cart.

Returns HTTP 409 if any item has insufficient stock.
        `,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderRequest' } } },
        },
        responses: {
          201: { description: 'Order placed successfully', content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } } } } },
          400: { description: 'Invalid items array' },
          404: { description: 'Product not found or unavailable' },
          409: { description: 'Insufficient stock' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'Get order history for the authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending','confirmed','processing','shipped','delivered','cancelled'] }, description: 'Filter by order status' },
          { name: 'page',   in: 'query', schema: { type: 'integer' }, example: 1 },
          { name: 'limit',  in: 'query', schema: { type: 'integer' }, example: 20 },
        ],
        responses: {
          200: {
            description: 'Orders retrieved',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get a specific order by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Order ObjectId' },
        ],
        responses: {
          200: { description: 'Order retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Order not found' },
        },
      },
    },
    '/api/orders/{id}/cancel': {
      patch: {
        tags: ['Orders'],
        summary: 'Cancel an order',
        description: `
Only orders in **pending** or **confirmed** status can be cancelled.

Stock is restored atomically using a \`stockRestored\` flag guard — concurrent or duplicate cancellations are safely rejected with HTTP 409.
        `,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Order ObjectId' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Changed my mind' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order cancelled and stock restored', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Order not found' },
          409: { description: 'Order cannot be cancelled in its current status, or already cancelled' },
        },
      },
    },

    // -------------------------------------------------------------------------
    // E-Commerce: Payments (Stripe)
    // -------------------------------------------------------------------------
    '/api/payments/orders/{orderId}/intent': {
      post: {
        tags: ['Payments'],
        summary: 'Create or retrieve a Stripe PaymentIntent for an order',
        description: `
Initializes a Stripe PaymentIntent for the specified order total.

**Client Integration:**
Frontend takes the returned \`clientSecret\` and confirms payment using Stripe.js or Stripe Mobile SDK:
\`\`\`javascript
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: cardElement }
});
\`\`\`

If already initiated and not in a terminal state, the existing client secret is returned idempotently.
        `,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderId', in: 'path', required: true, description: 'Order ObjectId', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Existing PaymentIntent retrieved',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { payment: { $ref: '#/components/schemas/PaymentIntentResponse' } } } } } } },
          },
          201: {
            description: 'New PaymentIntent created',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { payment: { $ref: '#/components/schemas/PaymentIntentResponse' } } } } } } },
          },
          404: { description: 'Order not found' },
          409: { description: 'Order is cancelled, delivered, or already paid' },
        },
      },
    },
    '/api/payments/orders/{orderId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment record and status for an order',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderId', in: 'path', required: true, description: 'Order ObjectId', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Payment retrieved',
            content: { 'application/json': { schema: { type: 'object', properties: { succeeded: { type: 'boolean' }, data: { type: 'object', properties: { payment: { $ref: '#/components/schemas/Payment' } } } } } } },
          },
          404: { description: 'Order or payment not found' },
        },
      },
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe Webhook handler',
        description: 'Endpoint invoked directly by Stripe to deliver asynchronous payment lifecycle events (e.g., `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`). Validates the `Stripe-Signature` header using raw body Buffer.',
        requestBody: {
          description: 'Raw Stripe Event payload',
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          200: { description: 'Webhook event acknowledged and processed' },
          400: { description: 'Missing or invalid Stripe-Signature' },
        },
      },
    },
  },
};

const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { background-color: #1e293b; padding: 12px 0; }
    .swagger-ui .topbar .topbar-wrapper img { content: url('https://firebase.google.com/static/images/brand-guidelines/logo-vertical.png'); height: 38px; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .swagger-ui .btn.authorize { background-color: #4f46e5; color: #fff; border-color: #4f46e5; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
  `,
  customSiteTitle: 'Someday API — Swagger Documentation',
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerOptions,
};

