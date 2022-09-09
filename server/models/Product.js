const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  itemCode: { type: String, required: true, unique: true },
  weight: { type: Number, required: true },
  size: { type: String, required: true },
  available: { type: Boolean, default: true },
  parentModel: {
    type: mongoose.Types.ObjectId,
    ref: 'Model',
    required: true,
  },
  count: { type: Number, default: 1 },
  refType: { type: String, default: 'Product' },
});

productSchema.pre('save', async function (nx) {
  try {
    if (!this.isModified('count')) return nx();

    if (this.count === 0) {
      this.available = false;
      nx();
    }
  } catch (err) {
    console.log(err);
    nx(err);
  }
});

module.exports = mongoose.model('Product', productSchema);
