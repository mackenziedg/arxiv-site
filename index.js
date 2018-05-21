var express = require('express')();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var path = require('path');
var serve = require('express-static');
var app = express;
var wcModel = require('./models/wc');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Set module settings
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
mongoose.Promise = global.Promise;


// Setup mongoose connection
var mongoURI = 'URI'
mongoose.connect(mongoURI, {
  auth: {
    user: 'user',
    password: 'password'
  }});
mongoose.connection.on('connected', function () {  
  console.log('Mongoose connection open to ' + mongoURI);
}); 
mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 
mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});


function cosine_similarity(wc1, wc2){
  shared_keys = Object.keys(wc1).filter({}.hasOwnProperty.bind(wc2));;
  var s = 0;
  for(var key in shared_keys){
    s += wc1[shared_keys[key]]*wc2[shared_keys[key]];
  }

  return s;
};

// Routes
app.get('/', function (req, res){
  res.render("index");
});

calculate_distances_route = [body("arxiv_id", "Empty url").isLength({min: 1}),
  sanitizeBody("arxiv_id").trim().escape(),
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    console.log(req, res);
    if (!errors.isEmpty()) {
      res.render("index", {errors: errors});
    } else {

      // var comp_url = "http://arxiv.org/abs/1704.07978";
      var comp_url = "http://arxiv.org/abs/"+req.body.arxiv_id;
      console.log(comp_url);
      wcModel.findOne({arxiv_url: comp_url}, function(err, doc){
        if(doc){
          var comp_wcs = doc.word_counts;

          wcModel.find({})
            .exec()
            .then(function(results){
              for(var i in results){
                results[i].similarity = cosine_similarity(comp_wcs, results[i].word_counts).toFixed(3);
              }

              res.render('index', {results: results});
          });
        } else {
          res.render('index', {errors: {array: function(){return [{msg: "Article id not found."}]}}});
        }
      });
    }
  }
]
app.post("/", calculate_distances_route);

app.use("/static-bs", serve(__dirname + '/node_modules/bootstrap/dist'));
app.use("/static", serve(__dirname + '/public'));

// Start server
app.listen(3000, () => console.log('Listening on 127.0.0.1:3000'));
