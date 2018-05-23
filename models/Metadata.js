var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var MetadataSchema = new Schema({
  arxiv_url: String,
  authors: Array,
  title: String,
  subjects: Array
});

module.exports = mongoose.model('Metadata', MetadataSchema, 'metadata');
