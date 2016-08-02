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

router.get('/userOrder', function(req, res, next){
	UserOrders.findAll({})
	.then(function(userOrders){
		res.send(userOrders);
	}).catch(next);
})

router.get('/userOrder/:userOrderId', function(req, res, next){
	UserOrders.findById(req.params.userOrderId)
	.then(function(userOrder){
		res.send(userOrder.status);
	}).catch(next);
})

router.put('/userOrder/:userOrderId', function(req, res, next){
	UserOrders.findById(req.params.userOrderId)
	.then(function(userOrder){
		if(!userOrder) throw HttpError(404);
		else{
			return userOrder.update(req.body);  
		}
	}).then(function(updatedUserOrder){
		res.send(updatedUserOrder);
	}).catch(next);
})


router.delete('/userOrder/:userOrderId', function(req, res, next){
	UserOrders.findById(req.params.userOrderId)
	.then(function(userOrder){
		return userOrder.destroy();
	})
	.then(function(){
		res.status(204).end();
	})
	.catch(next);
})


router.get('/user/:userOrderId', function(req, res, next){
	User.findById(req.params.userOrderId)
	.then(function(user){
		res.send(user);
	}).catch(next);
})



router.delete('/:id', function(req, res, next){
	OrderDetails.findById(req.params.id)
	.then(function(orderDetail){
		return orderDetail.destroy();
	})
	.then(function(){
		res.status(204).end();
	})
	.catch(next);
})