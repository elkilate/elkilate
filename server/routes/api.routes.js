// Router Object initialization
const Router = require('express').Router();

// Controller functions
const {
  fetchProducts,
  addToCart,
  removeFromCart,
  seed,
  updateItemQuantity,
  sendContactMail,
  fetchStripePublishableKey,
  initializeSale,
  cancelAndRemoveSale,
  createStripePaymentIntent,
  createPaypalPaymentIntent,
  finalizeStripeSale,
  finalizePaypalSale,
  createShippingFee,
  getShippingFee,
  saveNewComment,
} = require('../controllers/api.controllers');

// Routes
Router.get('/products', fetchProducts);

/* Cart Routes */
Router.post('/add-to-cart', addToCart);

Router.patch('/update-product-qty', updateItemQuantity);

Router.delete('/remove-from-cart', removeFromCart);

/* Sale Routes */
Router.post('/sale/init', initializeSale);

Router.delete('/sale', cancelAndRemoveSale);

Router.post('/sale/finish/stripe', finalizeStripeSale);

Router.get('/sale/finish/paypal', finalizePaypalSale);

/* PaymentIntent Routes */
Router.post('/payment-intents/stripe', createStripePaymentIntent);

Router.post('/payment-intents/paypal', createPaypalPaymentIntent);

/* Contact Mail Routes */
Router.post('/send-contact-mail', sendContactMail);

/* Comments */
Router.post('/comment/:id', saveNewComment);

// Fetch Stripe Publishable Key
Router.get('/get-stripe-pk', fetchStripePublishableKey);

// Used to populate DB with dummy products
Router.post('/seed', seed);

/* Fees Routes */
// Router.get('/shipping-fee', getShippingFee);

// Router.post('/shipping-fee', createShippingFee);

module.exports = Router;
