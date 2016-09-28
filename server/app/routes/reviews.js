'use strict'

var router = require('express').Router();
var db = require('../../db')
var Review = db.model('review')
var HttpError=require('../../utils/HttpError')

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

router.get('/:userId/reviews', function(req,res,next){
  console.log("whaggggggggggggggggggggggggggggggggggggggggggggggggggggggp")
Review.findAll({
  where:{
    authorId:req.params.userId

  }
})
.then(function(reviews){
  console.log(reviews)
  if (reviews){
      res.send(reviews);
  }
  else {
    res.status(204).send('You havent left any reviws yet')
  }
})
  .catch(next);
})


router.put('/reviews/:id', function(req,res,next){
  Reviews.findById(req.params.id)
  .then(function(oneReview){
    if (req.user.id===oneReview.authorId || req.user.isAdmin){
      return oneReview.update(req.body);
    }
    else {
      throw HttpError(401);
    }
  })
  .then(function(updated){
    res.status(200).send();
  })
    .catch(next);
  })

router.delete('/reviews/:id', function(req,res,next){
  Review.findById(req.params.id)
  .then(function(oneReview){
    if (req.user.id===oneReview.authorId || req.user.isAdmin){
      return oneReview.destroy();
    }
    else {
      throw HttpError(401);
    }
  })
  .then(function(){
    res.status(204).send();
  })
  .catch(next);
}) 

module.exports = router
