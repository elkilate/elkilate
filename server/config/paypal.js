const paypal = require('paypal-rest-sdk');

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || 'AVE48u-0n0vILS7FKIdUIAQGTDtA38Zl99_3vWitfoIR8W1aJmMSkQnlj--Zkjuykedpe2-2VRS4QwOw',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || 'EA0t-2m_X7AV9YlUrFhKHYXzFOOB5aXF6uNgDGqXeLtIL8tQcBaIuyrLnDUFGEIlXaajvN1MJoWoP_yz'
})

module.exports = paypal;
