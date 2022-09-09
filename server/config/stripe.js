const stripe = require('stripe')(process.env.STRIPE_SK || "sk_test_51GUl3pLpeSJaXxuK5f0hQnJBSG7AvtXDgkKUFYObDi2uRoGb5JskE01ITTZjsagqYxGpTGd6ZXJf53uwbG0OUAlW00PnCUzvfw");

module.exports = stripe;