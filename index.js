var express = require('express')();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var Metadata = require('./models/Metadata');
var path = require('path');
var serve = require('express-static');
var sc = require('skale').context();

var app = express;
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Set module settings
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// db connection
var mongoDB = process.env.MONGO_URL;
mongoose.connect(mongoDB, {user:process.env.MONGO_USER, pass:process.env.MONGO_PASSWORD});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// Routes
app.get('/', function (req, res){
  res.render('index');
});


calculate_distances_route = [body('arxiv_id', 'Empty url').isLength({min: 1}),
  sanitizeBody('arxiv_id').trim().escape(),
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render('index', {errors: errors});
    } else {

      Metadata.findOne({arxiv_url: 'http://arxiv.org/abs/'+req.body.arxiv_id}).then(function(d){
        if(d){
          var wc1 = d.word_counts;
          sc.textFile('s3://arxivmetadata/word_counts')
            .map(function(row, obj){
              row = row.split(',');
              var arxiv_url = row[0];
              row = row.slice(1);
              wc1 = Object();
              for(var i in row){
                var r = row[i].split(':');
                wc1[r[0]] = r[1];
              }
              wc2 = obj.word_counts;

              shared_keys = Object.keys(wc1).filter({}.hasOwnProperty.bind(wc2));;
              var doc = {arxiv_url: arxiv_url};
              doc.similarity = 0;
              for(var key in shared_keys){
                doc.similarity += wc1[shared_keys[key]]*wc2[shared_keys[key]];
              }
              doc.similarity = doc.similarity.toFixed(3);
              return doc;
            }, d)
            .sortBy(a => a.similarity, ascending=false)
            .take(500)
            .then(async function(results) {

              var joinMetadata = async function(doc){
                return await Metadata.findOne({arxiv_url: doc.arxiv_url})
                        .then(function(d2){
                          d2.similarity = doc.similarity;
                          return d2;
                        });
              }

              for(var i in results) {
                var doc = results[i];
                results[i] = joinMetadata(doc);
              }

              results = await Promise.all(results);
              res.render('index', {results: results, comp_doc: d});
            });

        } else {
          res.render('index', {errors: {array: function(){return [{msg: "arXiv ID not found."}]}}});
        }

      });
    }
  }
]
app.post('/', calculate_distances_route);

// Static import directories
app.use('/static', serve(__dirname + '/public'));

// Start server
var port = process.env.PORT || 8080;
app.listen(port, () => console.log('Listening on port '+port));
