const Stripe = require('stripe');

/**
 * Stripe SDK Client Configuration
 *
 * Centralized Stripe client instance configured with API key and stable API version.
 * Exported as a singleton for use across services.
 */

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] Warning: STRIPE_SECRET_KEY is not defined in environment variables.');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Pin to stable Stripe API version
});

module.exports = stripe;

