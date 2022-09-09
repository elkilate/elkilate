const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StockSchema = new Schema({
  // addedDate: { type: String, default: getCurrentDate() },
  // addedTimestamp: { type: Number, default: Date.now() },
  // lastUpdated: { type: String, default: getCurrentDate() },
  // description: { type: String },
  // products: [{ type: mongoose.Types.ObjectId, minlength: 1 }],
  // initialWeight: { type: Number, required: true },
  // currentWeight: { type: Number },
  // soldMonth: { type: Number },
  // soldWeek: { type: Number },
  currentWeek: { type: String },
  currentMonth: { type: String },
});

module.exports = mongoose.model('Stock', StockSchema);
