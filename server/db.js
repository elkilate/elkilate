const mongoose = require('mongoose');

const URI = process.env.DB_URI || 'mongodb://localhost/elkilate';

mongoose.connect(URI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}, (err) => {
    if (err) throw err;
    console.log('Connected to db');
});

module.exports = mongoose;
