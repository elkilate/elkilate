const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShippingfeeSchema = new Schema({
  value: { type: Number, required: true },
  upperLimit: { type: Number, required: true, unique: true },
  lowerLimit: { type: Number, required: true, unique: true },
});

ShippingfeeSchema.statics.findFeeForValue = function (value) {
  let fee;

  try {
    fee = this.findOne({
      upperLimit: { $gte: value },
      lowerLimit: { $lte: value },
    });
  } catch (ex) {
    throw ex;
  }

  return fee;
};

module.exports = mongoose.model('Shippingfee', ShippingfeeSchema);
