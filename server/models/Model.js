const mongoose = require('mongoose');
const paginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const modelSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  karat: { type: String, uppercase: true },
  productCount: { type: Number, default: 0 },
  products: [{ type: mongoose.Types.ObjectId, ref: 'Product' }],
  category: { type: String },
  gallery: { type: [String], minlength: 1, default: null },
  mainImg: { type: String },
  thumbImg: { type: String },
  mainPage: { type: Boolean },
  available: { type: Boolean, default: true },
});

modelSchema.methods['updateAvailability'] = async function (
  products,
  save = true
) {
  try {
    let availability = products.length;

    products.forEach((product) => !product.available && availability--);

    this.productCount = availability;

    if (availability < 1) {
      this.available = false;
    } else {
      this.available = true;
    }

    if (this.populated('products')) this.depopulate('products');

    save && (await this.save());

    if (this.isModified()) {
      return 'UPDATED';
    }
    return 'NOT_UPDATED';
  } catch (err) {
    console.log(err);
    return 'ERROR';
  }
};

modelSchema.plugin(paginate);

module.exports = mongoose.model('Model', modelSchema);
