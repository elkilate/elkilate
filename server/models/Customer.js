const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    uid: {type: String, required: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    phone: {type: Number, required: true},
    email: {type: String, required: true},
    saveData: {type: Boolean, required: true},
    streetName: {type: String, required: true},
    extNumber: {type: Number, required: true},
    intNumber: {type: Number, required: true},
    postalCode: {type: Number, required: true},
    stateName: {type: String, required: true},
    cityName: {type: String, required: true},
    references: {type: String, required: true}
});

module.exports = mongoose.model('Customer', CustomerSchema);
