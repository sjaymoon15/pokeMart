'use strict'

var router = require('express').Router();
var Products=require('../../db/models/product');
var Image = require('../../db/models/image');
var HttpError = require('../../utils/HttpError');
const mime = require('mime');

router.get('/', function(req, res, next) {
  Products.findAll({
    where: req.query
  })
  .then(function(allProducts){
   
  	res.send(allProducts);
  })
  .catch(next);
});

router.param('id', function(req, res, next, theId){
	Products.findById(theId)
	.then(function(product){
		if(product){
			req.product = product;
			next();
			return null;
		}else{
			throw HttpError(404);
		}
	})
	.catch(next);
})

router.get('/:id', function(req,res,next){
  console.log('hellooodjdcjncjnencencednrnf')
	res.send(req.product);
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
  if (req.user.isAdmin) {
    Products.findById(id)
    .then(function(product){
      if (!product){
        throw HttpError(404);
      } else {
        return product.update(req.body)
      }
    }).then(function(updatedProduct){
      res.send(updatedProduct);
    }).catch(next);
  }
  else {
    res.status(401);
    res.send('no access')
  }
})

router.delete('/:id', function(req,res,next){
 if (req.user.isAdmin) {
  Products.findById(req.params.id)
  .then(function(product) {
    return product.destroy()
  })
  .then(function(){
    res.status(204).end();
  })
  .catch(next);
}

else {
  res.status(401);
  res.send('unauothrized')
}
})

router.get('/:productId/image', function (req, res, next) {

  Image.findById(req.params.productId).then(function (img) {
    res.set('Content-Type', mime.lookup('png'));
    res.send(img.data);
  })

});


module.exports = router;
