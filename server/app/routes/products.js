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

router.get('/category/:category', function(req, res, next) {
  Products.findAll({
  	where:{
  		category:req.params.category
  	}
  })

  .then(function(foundProducts){
  	res.send(foundProducts);
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

router.post('/', function(req,res,next){
	Products.create(req.body)
	.then(function(newProduct){
		res.status(201).send(newProduct);
	})
	.catch(next);
})

router.put('/:id', function(req,res,next){
	var id=req.params.id;
	Products.findById(id)
	.then(function(product){
		if (!product){
			res.status(404).send();
		}
		else {
			return product.update(req.body);
		}
	})
	
	.then(function(updatedProduct){
		res.send(updatedProduct);
	})
	.catch(next);
})

router.delete('/:id', function(req,res,next){
	var id=req.params.id;

Products.findById(id)
.then(function(product){
	if (!product){
		res.status(404).send();
	}
	else {
		product.destroy({
	where: {
		id:req.params.id
	} 
})
.then(function(){
	res.status(204).end();
})
	}
})

  .catch(next);
})

module.exports = router;
