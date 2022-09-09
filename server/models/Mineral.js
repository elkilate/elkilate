const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mineralSchema = new Schema({
  ratePerOunce: { type: Number, default: null },
  ratePerGram: { type: Number, default: null },
  rate: { type: Number, default: null },
  currencyCode: { type: String, required: true, unique: true },
  lastUpdated: { type: String }
});

module.exports = mongoose.model('Mineral', mineralSchema);
