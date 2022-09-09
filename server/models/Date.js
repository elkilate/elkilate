const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DateSchema = new Schema({
  currentWeek: { type: Date },
  currentMonth: { type: Date },
});

module.exports = mongoose.model('Date', DateSchema);
