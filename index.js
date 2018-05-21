// var dotenv = require('dotenv').config();
var express = require('express')();
var bodyParser = require('body-parser');
var path = require('path');
var serve = require('express-static');
var sc = require('skale').context();
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

var app = express;
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Set module settings
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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

      var options = {
        Bucket: process.env.S3_BUCKET,
        Key: 'records.json'
      }

      s3.getObject(options, function(err, data){
        var records = JSON.parse(data.Body);
        var comp_url = 'http://arxiv.org/abs/'+req.body.arxiv_id;
        var comp_doc = records.filter((d) => d.arxiv_url === comp_url)[0];

        sc.parallelize(records)
          .map(function(doc, obj){
            wc1 = doc.word_counts;
            wc2 = obj.word_counts;

            shared_keys = Object.keys(wc1).filter({}.hasOwnProperty.bind(wc2));;
            doc.similarity = 0;
            for(var key in shared_keys){
              doc.similarity += wc1[shared_keys[key]]*wc2[shared_keys[key]];
            }
            doc.similarity = doc.similarity.toFixed(3);
            return doc;
          }, comp_doc)
          .collect().then((r) => res.render('index', {results: r}));
      });
    }
  }
]
app.post('/', calculate_distances_route);

// Static import directories
app.use('/static', serve(__dirname + '/public'));

// Start server
app.listen(3000, () => console.log('Listening on port 3000'));
