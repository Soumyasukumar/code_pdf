const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  operation: String,
  filename: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Operation', operationSchema);