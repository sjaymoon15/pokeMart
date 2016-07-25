'use strict'

var router = require('express').Router();
var db = require('../../db')
var Review = db.model('review')

router.get('/:productId', function(req,res,next){
  Review.findAll({
    where: {
      productId: req.params.productId
    }
  }).then(function(reviews){
    res.send(reviews)
  }).catch(next)
});

router.post('/:productId', function(req,res,next){
  Review.create(req.body)
  .then(function(review){
    res.send(review)
  }).catch(next)
})

module.exports = router
