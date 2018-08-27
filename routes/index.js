function init(router){

  /* GET home page. */
  router.get('/', ensureAuthenticated ,function(req, res, next) {
    res.render('wazy');
    //next();
  });


  function ensureAuthenticated(req, res, next){
  	if(req.isAuthenticated()){
  		return next();
  	} else {
  		res.redirect('/login');
  	}
  }

  module.exports = router;
}

exports.init = init
