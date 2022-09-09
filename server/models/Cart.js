const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  owner: { type: String, required: true },
  totalItemCount: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0.0 },
  totalWeight: { type: Number, default: 0.0 },
  items: [
    {
      sku: {
        type: mongoose.Types.ObjectId,
        refPath: 'items.skuModel',
        required: true,
      },
      skuModel: {
        type: String,
        required: true,
        enum: ['Product', 'Uniqueproduct'],
      },
      title: { type: String, required: true },
      thumbImg: { type: String },
      unitPrice: { type: Number, required: true },
      unitWeight: { type: Number, required: true },
      itemPrice: { type: Number, default: 0 },
      itemWeight: { type: Number, default: 0 },
      itemSize: { type: String },
      quantity: { type: Number, default: 1 },
      priceApplied: { type: Number },
      code: { type: String },
    },
  ],
});

cartSchema.pre('save', async function (next) {
  const cart = this;
  if (!cart.isModified('items')) return next();

  cart.totalItemCount = cart.items.reduce(
    (totalCount, item) => totalCount + item.quantity,
    0
  );
  cart.totalPrice = cart.items
    .reduce((totalPrice, item) => totalPrice + item.itemPrice, 0)
    .toFixed(2);
  cart.totalWeight = cart.items
    .reduce((totalWeight, item) => totalWeight + item.itemWeight, 0)
    .toFixed(2);
});

module.exports = mongoose.model('Cart', cartSchema);
