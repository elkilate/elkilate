const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestimonialSchema = new Schema({
    content: { type: String, required: true },
    auhtorName: { type: String, required: true },
    authorEmail: { type: String, required: true },
    fromCity: { type: String },
    fromState: { type: String }
});

module.exports = mongoose.model('Testimonial', TestimonialSchema);
