'use strict'

var router = require('express').Router();
var UserOrders = require('../../db/models/userOrders');
var OrderDetails = require('../../db/models/orderDetails');
var User = require('../../db/models/user');
var HttpError=require('../../utils/HttpError');

module.exports = router;


router.use(function(req, res, next){
	if(!req.user.isAdmin) throw HttpError(401);
	next();
})

//for admin use /
router.get('/', function(req, res, next){
  OrderDetails.findAll({})
  .then(function(allOrdereDetails){
    res.send(allOrdereDetails);
  })	
  .catch(next);
})

router.get('/userOrder/:userOrderId', function(req, res, next){
	UserOrders.findById(req.params.userOrderId)
	.then(function(userOrder){
		res.send(userOrder.status);
	}).catch(next);
})

router.get('/user/:userOrderId', function(req, res, next){
	User.findById(req.params.userOrderId)
	.then(function(user){
		res.send(user);
	}).catch(next);
})