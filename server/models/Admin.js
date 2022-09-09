const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const AdminSchema = new Schema({
  name: { type: String, required: true, unique: true },
  pass: { type: String, required: true }, // elK1lat3$2020_
  displayName: { type: String, unique: true }
});

AdminSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('pass')) return next();

  try {
    user.pass = await bcrypt.hash(user.pass, 10);
  } catch (e) {
    return next();
  }
});

AdminSchema.methods['validatePass'] = async function (pw) {
  return await bcrypt.compare(pw, this.pass);
}

module.exports = mongoose.model('Admin', AdminSchema);
