'use strict';
var db = require('./_db');
module.exports = db;

var User = require('./models/user');
var Product = require('./models/product');
var Review = require('./models/review');
var Order = require('./models/order')

Product.belongsToMany(User, {through: Order})

 Review.belongsTo(Product)
 Review.belongsTo(User, {as:'author'})
// User.hasMany(Review)
