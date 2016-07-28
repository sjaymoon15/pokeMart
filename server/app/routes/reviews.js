'use strict'

var router = require('express').Router();
var db = require('../../db')
var Review = db.model('review')

// OB/SB: move this to /api/products/:productId/reviews
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
  // OB/SB: use req.user.id for the review author
  Review.create(req.body) // OB/SB: watch out for abuse
  .then(function(review){
    res.send(review)
  }).catch(next)
})

module.exports = router
