'use strict'

var router = require('express').Router();
var Products=require('../../db/models/product');

router.get('/', function(req, res, next) {
  Products.findAll()
  .then(function(allProducts){
  	res.send(allProducts);
  })
  .catch(next);
});

router.get('/:id', function(req,res,next){
	var id=req.params.id;
	Products.findById(id)
	.then(function(oneProduct){
		res.send(oneProduct);
	})
	.catch(next);
})


module.exports = router;
