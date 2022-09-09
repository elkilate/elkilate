const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CurrencySchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  buyRate: { type: Number, required: true },
  sellRate: { type: Number, required: true },
  lastUpdated: { type: String }
});

module.exports = mongoose.model('Currency', CurrencySchema);
