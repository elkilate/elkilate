const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UniqueProductSchema = new Schema({
  itemCode: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  weight: { type: Number, required: true },
  size: { type: String, required: true },
  karat: { type: String, required: true, uppercase: true },
  available: { type: Boolean, default: true },
  parentModel: {
    type: mongoose.Types.ObjectId,
    ref: 'Uniquemodel',
    required: true,
  },
  count: { type: Number, default: 1 },
  refType: { type: String, default: 'Uniqueproduct' },
});

UniqueProductSchema.pre('save', async function (nx) {
  try {
    if (!this.isModified('count')) return nx();

    if (this.count <= 0) {
      this.available = false;
      nx();
    }
  } catch (err) {
    console.log(err);
    nx(err);
  }
});

module.exports = mongoose.model('Uniqueproduct', UniqueProductSchema);
