const stripe = require('../config/stripe');
const Sale = require('../models/Sale');

const Router = require('express').Router();

Router.post('/', async (req, res, next) => {
  let evt;

  try {
    evt = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET ||
        'whsec_5xvRFAeaWAdTL3rkEsI42tz4MreVUEme'
    );
  } catch (err) {
    console.log(err);
    console.log(`⚠️  Webhook signature verification failed.`);
    console.log(`⚠️  Check the env file and enter the correct webhook secret.`);
    return res.sendStatus(400);
  }
  // Extract the object from the event.
  const dataObject = evt.data.object;

  // Handle the event
  // Review important events for Billing webhooks
  // https://stripe.com/docs/billing/webhooks
  // Remove comment to see the various objects sent for this sample
  switch (evt.type) {
    case 'payment_intent.succeded':
      console.log('PI Succeded');
      console.log(dataObject);
      break;
    case 'payment_intent.payment_failed':
      console.log('PI Failed');
      console.log(dataObject);
      break;
    case 'payment_intent.requires_action':
      console.log('PI Requires Action');
      console.log(dataObject);
    case 'payment_intent.processing':
      console.log('PI Processing');
      console.log(dataObject);
    case 'payment_intent.canceled':
      console.log('PI Canceled');
      console.log(dataObject);
    default:
    // Unexpected event type
  }
  res.sendStatus(200);
});

module.exports = Router;
