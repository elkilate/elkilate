const mongoose = require('mongoose');
const paginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const UniqueModelSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  productCount: { type: Number, default: 0 },
  products: [{ type: mongoose.Types.ObjectId, ref: 'Uniqueproduct', default: null }],
  category: { type: String },
  gallery: { type: [String], minlength: 1, default: null },
  mainImg: { type: String },
  thumbImg: { type: String },
  mainPage: { type: Boolean },
  available: { type: Boolean, default: true }
})

UniqueModelSchema.methods['updateAvailability'] = async function (products) {
  try {
    let availability = this.products.length;

    products.forEach(product => {
      const available = product.available;
      // console.log(!available);
      !available && availability--;
    });

    this.productCount = availability;

    if (availability < 1) {
      this.available = false;
    } else {
      this.available = true
    }
    await this.save()
    if (this.isModified()) {
      return 'UPDATED'
    }
    return 'NOT_UPDATED'
  } catch (err) {
    console.log(err)
    return 'ERROR'
  }
};

UniqueModelSchema.plugin(paginate);

module.exports = mongoose.model('Uniquemodel', UniqueModelSchema);
