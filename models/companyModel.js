var mongoose = require('mongoose');
var User = require('./usersModel');

// Company Schema
var CompanySchema = mongoose.Schema({
	name : {
    // Company Name
		type: String
	},
  SCN: {
    // Contract Service Number
    type: String,
		index:true
	},
  date_begin: {
		// Contract Begin Date
    type: Date,
    default: Date.now
  },
  date_fin: {
		// Contract Fin Date
    type: Date,
    default: Date.now
  },
	employs: [{
    type: String
	}]
});

var Company = module.exports = mongoose.model('Company', CompanySchema);

module.exports.createCompany = function(newCompany, callback){
	callback = callback || function () {};
  newCompany.save(callback);
}

module.exports.getCompanyBySCN = function(SCN , callback){
	Console.log("companyModel : getCompanyBySCN ");
	callback = callback || function () {};
	var query = {SCN:SCN};
	Company.findOne(query, callback);
}


module.exports.getCompanyByName = function(companyName , callback) {
  callback = callback || function () {};
	var query = {name:companyName};
	Company.find(companyName, callback);
}


module.exports.getCompanyById = function(id, callback){
	Company.findById(id, callback);
}

module.exports.addEmploy = function(company , employ , callback){
	Console.log("companyModel : addEmploy ");
  callback = callback || function () {};

	company.employs.push(employ);
	company.save(callback);
}
