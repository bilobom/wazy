var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

// User Schema
var UserSchema = mongoose.Schema({
	username: {
		type: String,
		index:true
	},
  name: {
		type: String
	},
  email: {
		type: String,
    		index:true
	},
	password: {
		type: String
	},
	token : {
		type: String
	},
  SCN : {
		type: String
	},
  contacts : [{
    type: String
  }]
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = function(newUser, callback){
	console.log(" userModel : createUser ");
	bcrypt.genSalt(10, function(err, salt) {
	    bcrypt.hash(newUser.password, salt, function(err, hash) {
	        newUser.password = hash;
	        newUser.save(callback);
	    });
	});
}

module.exports.getUserByUsername = function(username, callback){
	console.log(" userModel : getUserByUsername ");
	var query = {username: username};
	User.findOne(query, callback);
}

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	if(err) throw err;
    	callback(null, isMatch);
	});
}

module.exports.addContact = function(username , contact , callback){
	callback = callback || function(){};
	var query = {username: username};
	User.findOne(query,function(err , user){
		if (err) { console.log(err); return ; }
		user.contacts.push(contact);
		user.save();
	});
}
