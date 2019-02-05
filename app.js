var createError = require('http-errors');
var express = require('express');
var exphbs = require('express-handlebars');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
// security
var helmet =require('helmet');
//Handle logins
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
//Enable logs
var logger = require('morgan');
// Minifying and compression
var minify = require('express-minify');
var compression = require('compression');

//db midwr
var mongoose= require('mongoose');

//flashing msgs
var flash    = require('connect-flash');

// Handle D.Base
var configDB = require('./config/database.js');
mongoose.connect(configDB.url); // connect to our database


/****** The App *****/
var app = express();

//security
app.use(helmet());
app.use(/*nondefault*/ helmet.noCache());
app.use(/*nondefault*/ helmet.frameguard());
/**app.use(/*nondefault* helmet.hpkp(TODO: need public-key-pining));**/
app.use(/*nondefault*/ helmet.referrerPolicy());

//enhancement
//app.use(compression());
//app.use(minify());


// View Engine
app.use(logger('dev'));
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');
// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));


// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


//Session handler
app.use(require('express-session')({
    //secret: 'keyboard cat',
    secret: 'Rgrid..Boom',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));


//passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.')
    , root    = namespace.shift()
    , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));


//slashin msgs
app.use(flash());




// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

/*
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
*/

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// export app to router/index && router/users
exports.app = app
