const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  phone:        { type: String, default: null },
  location:     { type: String, default: null },
  quality:      { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
  score:        { type: String, enum: ['A', 'B', 'C'], default: 'C' },
  reason:       { type: String, default: 'Scored by data quality' },
  email:        { type: String, default: null },
  source:       { type: String, default: 'Google Maps' },
  keyword:      { type: String, default: null },
  businessType: { type: String, default: null },
  city:         { type: String, default: null },
  scrapedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);