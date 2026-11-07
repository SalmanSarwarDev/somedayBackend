const express = require('express');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');
const routineRoutes = require('./routes/routine.routes');
const shopRoutes = require('./routes/shop.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const { swaggerUi, swaggerDocument, swaggerOptions } = require('./config/swagger');

const app = express();

// Enable CORS for web clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Stripe Webhook requires raw Buffer body for signature verification (MUST be before express.json)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Automatically ensure statusCode is included in all JSON responses for frontend consistency
app.use((_req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object' && !Array.isArray(body) && body.statusCode === undefined) {
      body = { statusCode: res.statusCode || 200, ...body };
    }
    return originalJson.call(this, body);
  };
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Swagger OpenAPI 3.0 Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
app.get('/docs', (_req, res) => res.redirect('/api-docs'));
app.get('/api-docs.json', (_req, res) => res.json(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/routines', routineRoutes);

// E-Commerce module
app.use('/api/shop', shopRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ succeeded: false, message: 'Internal server error' });
});

module.exports = app;
