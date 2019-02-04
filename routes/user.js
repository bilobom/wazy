function init(router) {

	var passport = require('passport');
	var LocalStrategy = require('passport-local').Strategy;

	var User = require('../models/usersModel');
	var Company = require('../models/companyModel');

	// Register
	router.get('/register', function (req, res) {
		res.render('register');
	});

	// Login
	router.get('/login', function (req, res) {
		res.render('login');
	});

	//@BILAL this combines both mobile and webb apps
	router.get('/loginmobile', isAuth, function (req, res, next) {
		getToken(req.query.username, function (token) {
			return res.json({ allowed: 'true', accessToken: token });
		});
	});

	function isAuth(req, res, next) {
		username = req.query.username;
		password = req.query.password;
		User.getUserByUsername(username, function (err, user) {
			//if (err) throw err;
			console.log("error==" + err);
			if (!user || user === undefined || user === null) {
				console.log('user null');
				//for json send we always need to return to prevent code from continuing execution.
				return res.json({ allowed: 'false', reason: 'noUser' });
				//res.end();
			}
			User.comparePassword(password, user.password, function (err, isMatch) {
				//if (err) throw err;
				if (isMatch) {
					console.log('user is match');
					return next();
				} else {
					console.log('user notMatch');
					return res.json({ allowed: 'false', reason: 'notMatch' });
					//res.end();

				}
			});
		});
	}

	//@BILAL END




	//@brahim API par access Tocken

	router.get('/Contacts', isAuthApi, function (req, res, next) {
		getContacts(req.query.username, function (contacts) {
			return res.json({ allowed: 'true', contacts: contacts });
		});
	})

	function isAuthApi(req, res, next) {
		next = next || function () { };
		username = req.query.username;
		accessToken = req.query.accessToken;
		User.getUserByUsername(username, function (err, user) {
			if (err) { console.log("error==" + err); return; }

			var reason = '';
			var allowed = true;

			if (!user || user === undefined || user === null) {
				reason = username + ' Non Enregistred ';
				return res.json({ allowed: 'false', reason });
			}

			if (!user.token || user.token == null || user.token == undefined || user.token !== accessToken) {
				reason = 'Access Token Non Valide';
				return res.json({ allowed: 'false', reason });
			}

			if (!user.SCN || user.SCN == null || user.SCN == undefined) {
				reason = 'No Service Contract Number ';
				return res.json({ allowed: 'false', reason });
			}

			Company.getCompanyBySCN(user.SCN, function (err, company) {
				if (err) { console.log("error==" + err); return; }

				if (!company || company === undefined || company === null) {
					reason = 'Service Contract Number Not Exist';
					return res.json({ allowed: 'false', reason });
				}

				var today = new Date();
				if (company.date_fin.getTime() < today) {
					reason = 'Contract is dead';
					return res.json({ allowed: 'false', reason });
				}
			});

			return next();
		});
	}





	// Register User
	router.post('/registermobile', function (req, res) {
		var name = req.body.name;
		var email = req.body.email;
		var username = req.body.username;
		var password2 = req.body.password2;
		var password = req.body.password;
		var SCN = req.body.SCN;

		console.log("name" + name);

		// Validation
		req.checkBody('name', 'Name is required').notEmpty();
		req.checkBody('company', 'Campany Name is required').notEmpty();
		req.checkBody('SCN', 'Contract Number is required').notEmpty();
		req.checkBody('email', 'Email is required').notEmpty();
		req.checkBody('email', 'Email is not valid').isEmail();
		req.checkBody('username', 'Username is required').notEmpty();
		req.checkBody('username', 'Username should be mor than 4 letters and less than 50 lettres').notEmpty().len(4, 50);
		req.checkBody('password', 'Password is required').notEmpty();
		req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

		var errors = req.validationErrors();

		if (errors) {
			return res.json({ success: 'false', reason: errors });
		}
		else {
			//checking for email and username are already taken
			User.findOne({
				username: {
					"$regex": "^" + username + "\\b", "$options": "i"
				}
			}, function (err, user) {
				User.findOne({
					email: {
						"$regex": "^" + email + "\\b", "$options": "i"
					}
				}, function (err, mail) {
					if (user) {
						return res.json({ success: 'false', reason: [{ msg: 'UserAlreadyTaken', param: 'username' }] });
					} else if (mail) return res.json({ success: 'false', reason: [{ msg: 'EmailAlreadyTaken', param: 'email' }] });
					else {
						console.log("--------------- routes / user : Line 96 -------------");
						Company.getCompanyBySCN(SCN, function (err, company) {
							if (err || !company) return res.json({ success: 'false', reason: [{ msg: 'SCN non Valide', param: 'SCN' }] });

							var today = new Date();
							if (company.date_fin.getTime() < today) {
								return res.json({ success: 'false', reason: [{ msg: 'contract is dead', param: 'SCN' }] });
							}

							console.log("--------------- routes / user : Line 105 -------------");
							generateToken(function (accestoken, err) {
								var newUser = new User({
									name: name,
									email: email,
									username: username,
									password: password,
									token: accestoken,
									SCN: SCN,
									contacts: company.employs
								});
								User.createUser(newUser, function (err, user) {
									if (err) { console.log(err); return; }
									user.contacts.forEach(function (contact) {
										User.addContact(contact, user.username);
									});
									Company.addEmploy(company, user.username);
									return res.json({ success: 'true' });
									console.log('----------------------------------->' + user);
								});
							});
						});
					}
				});
			});
		}
	});



	router.post('/register', function (req, res) {
		console.log("post reeq*******************************************" + require('circular-json').stringify(req.body));
		var name = req.body.name;
		var email = req.body.email;
		var username = req.body.username;
		var password = req.body.password;
		var password2 = req.body.password2;

		// Validation
		req.checkBody('name', 'Name is required').notEmpty();
		req.checkBody('email', 'Email is required').notEmpty();
		req.checkBody('email', 'Email is not valid').isEmail();
		req.checkBody('username', 'Username is required').notEmpty();
		req.checkBody('username', 'Username should be mor than 4 letters and less than 50 lettres').notEmpty().len(4, 50);
		req.checkBody('password', 'Password is required').notEmpty();
		req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

		var errors = req.validationErrors();

		if (errors) {
			res.render('register', {
				errors: errors
			});
		}
		else {
			//checking for email and username are already taken
			User.findOne({
				username: {
					"$regex": "^" + username + "\\b", "$options": "i"
				}
			}, function (err, user) {
				User.findOne({
					email: {
						"$regex": "^" + email + "\\b", "$options": "i"
					}
				}, function (err, mail) {
					if (user || mail) {
						res.render('register', {
							user: user,
							mail: mail
						});
					}
					else {
						generateToken(function (accestoken, err) {
							var newUser = new User({
								name: name,
								email: email,
								username: username,
								password: password,
								token: accestoken
							});
							User.createUser(newUser, function (err, user) {
								if (err) { console.log(err); return; }
								console.log('----------------------------------->' + user);
							});
							req.flash('success_msg', 'You are registered and can now login');
							res.redirect('/login');
						});
					}
				});
			});
		}
	});


	passport.use(new LocalStrategy(
		function (username, password, done) {
			User.getUserByUsername(username, function (err, user) {
				if (err) throw err;
				if (!user) {
					return done(null, false, { message: 'Unknown User' });
				}

				User.comparePassword(password, user.password, function (err, isMatch) {
					if (err) throw err;
					if (isMatch) {
						return done(null, user);
					} else {
						return done(null, false, { message: 'Invalid password' });
					}
				});
			});
		}));


	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});


	passport.deserializeUser(function (id, done) {
		User.getUserById(id, function (err, user) {
			done(err, user);
		});
	});

	router.post('/login',
		passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }),
		function (req, res) {
			res.redirect('/');
		});

	router.get('/logout', function (req, res) {
		req.logout();

		req.flash('success_msg', 'You are logged out');

		res.redirect('/');
	});

	module.exports = router;


	function generateToken(callback) {
		require('crypto').randomBytes(48, function (err, buffer) {
			if (err) { console.error("error generating token -------------> " + err); }
			var token = buffer.toString('hex');
			callback(token);
		});
	}


	function getToken(username, callback) {
		User.getUserByUsername(username, function (err, user) {
			if (err) { console.error(err); return; }
			if (user && callback) callback(user.token);
		});
	}


	function getContacts(username, callback) {
		User.getUserByUsername(username, function (err, user) {
			if (err) { console.error(err); return; }
			if (user && callback) callback(user.contacts);
		});
	}


}

exports.init = init


// The end !!
