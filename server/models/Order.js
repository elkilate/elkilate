const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  customer: {
    type: new Schema({
      deviceId: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: Number, required: true },
      email: { type: String, required: true },
    }),
    required: true,
  },
  address: {
    type: new Schema({
      street: { type: String, required: true },
      neighborhood: { type: String, required: true },
      extNumber: { type: Number, required: true },
      intNumber: { type: String },
      postalCode: { type: Number, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
      references: { type: String },
    }),
    required: true,
  },
  items: [
    {
      sku: { type: Schema.Types.ObjectId, refPath: 'skuRef' },
      skuRef: {
        type: String,
        required: true,
        enum: ['Uniqueproduct', 'Product'],
      },
      title: String,
      code: { type: String, required: true },
      qty: { type: Number, default: 1 },
      size: { type: Number },
      weight: { type: Number },
      thumbImg: { type: String },
      itemPrice: { type: Number },
      category: { type: String },
      karat: { type: String },
    },
  ],
  iat: { type: Number, default: Date.now() },
  sale: { type: mongoose.Types.ObjectId, ref: 'Sale' },
});

module.exports = mongoose.model('Order', OrderSchema);
