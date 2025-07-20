const mongoose = require('mongoose');

const TapeSchema = new mongoose.Schema({
  name: {
    type: String,
    default:""
  },
  urls: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Tape', TapeSchema);
