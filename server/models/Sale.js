const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SaleSchema = new Schema({
  shipment: { type: Boolean, default: false },
  pickUp: { type: Boolean, default: false },
  invoicing: { type: Boolean, default: false },
  customer: {
    device: { type: String },
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: {
      street: { type: String },
      nbhood: { type: String },
      extNumber: { type: Number },
      intNumber: { type: String },
      zip: { type: Number },
      state: { type: String },
      city: { type: String },
      refs: { type: String },
    },
  },
  contents: {
    items: [
      {
        sku: {
          type: Schema.Types.ObjectId,
          refPath: 'contents.items.skuRef',
          required: true,
        },
        skuRef: {
          type: String,
          required: true,
          enum: ['Product', 'Uniqueproduct'],
        },
        title: { type: String, required: true },
        code: { type: String },
        size: { type: String },
        weight: { type: Number },
        thumbImg: { type: String },
        price: { type: Number },
        ctg: { type: String },
        qty: { type: Number, default: 1 },
        karat: { type: String },
      },
    ],
    karats: { type: [String] },
    prices: { type: [Number] },
    categories: { type: [String] },
    weight: { type: Number, required: true },
  },
  payment: {
    method: { type: String, enum: ['Tarjeta', 'PayPal', null] },
    stripeId: { type: String },
    paypal: {
      payerId: { type: String },
      paymentId: { type: String },
    },
    subtotal: { type: Number },
    tax: { type: Number },
    discount: { type: Number },
    shipmentFee: { type: Number, default: 0 },
    total: { type: Number },
    pat: { type: Date },
  },
  invoice: {
    business_name: { type: String },
    RFC: { type: String },
    address: { type: String },
    email: { type: String },
    phone: { type: String },
    CFDI: { type: String },
    delivered: { type: Boolean, default: false },
  },
  state: {
    payed: { type: Boolean, default: false },
    refunded: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
    processing: { type: Boolean, default: true },
    delivered: { type: Boolean, default: false },
    asString: {
      type: String,
      enum: ['payed', 'refunded', 'rejected', 'processing', 'delivered'],
      default: 'processing',
    },
  },
  hasComment: { type: Boolean, default: false },
});

module.exports = mongoose.model('Sale', SaleSchema);
