const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const priceSchema = new Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
});

module.exports = mongoose.model('Price', priceSchema);
