var mongoose = require('mongoose');

// Setup mongoose schemas
var Schema = mongoose.Schema;

var wcSchema = new Schema({
  arxiv_url: String,
  title: String,
  creation_date: String,
  doi_urls: Array,
  authors: Array,
  abstract: String,
  edit_dates: Array,
  subjects: Array,
  publication: String,
  word_counts: Schema.Types.Mixed,
  similarity: Number
});


// Compile model from schema
module.exports = mongoose.model('wcModel', wcSchema, 'wcs');
