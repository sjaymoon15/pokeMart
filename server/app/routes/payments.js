var stripe = require("stripe")("sk_test_BQokikJOvBiI2HlWgH4olfQ2");
var router=require('express').Router();

router.post('/', function(req,res,next){
	console.log('00000000000', req.body)
	var stripeToken = req.body.stripeToken;

var charge = stripe.charges.create({
  amount: 1000, // amount in cents, again
  currency: "usd",
  source: stripeToken,
  description: "Example charge"
}, function(err, charge) {
  if (err && err.type === 'StripeCardError') {
    // The card has been declined
  }
  else{
  	res.redirect('/api/orders/cart/checkout')  }
});
})

module.exports = router;