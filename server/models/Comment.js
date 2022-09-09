const mongoose = require('mongoose');
const paginate = require('mongoose-paginate-v2');
const { Schema, model, Types } = mongoose;

const CommentSchema = new Schema({
  sale: { type: Types.ObjectId, ref: 'Sale' },
  approved: { type: Boolean, default: false },
  rejected: { type: Boolean, default: false },
  // rating: { type: Number },
  content: { type: String, required: true, trim: true },
  city: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: Number, default: Date.now() },
});

CommentSchema.plugin(paginate);

module.exports = model('Comment', CommentSchema);
