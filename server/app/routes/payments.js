var stripe = require("stripe")("sk_test_BQokikJOvBiI2HlWgH4olfQ2");
var router=require('express').Router();
var UserOrders = require('../../db/models/userOrders');
var OrderDetails = require('../../db/models/orderDetails');
var Product = require('../../db/models/product');
var User = require('../../db/models/product');
var db = require('../../db/_db');
var nodemailer = require('nodemailer');


router.post('/', function(req,res,next){
  console.log('stripe', req.body)
  var stripeToken = req.body.stripeToken;
  var totalPrice = 0;
  var descriptionString = [];
if (req.user){
    UserOrders.findOne({
      where: {
        userId: req.user.id,
        status: 'pending'
      }
    }).then(function(cart){
      return OrderDetails.findAll({
        where: {
          userOrderId: cart.id
        }
      })
      .then(function(arrayOfOrders){
        arrayOfOrders.forEach(order => {
          totalPrice += (order.price * order.quantity);
          descriptionString.push(order.title)
        })
        var result =  {total: totalPrice,
          description: descriptionString.join(',')
        }
        return result;
      })
    }).then(function(result){
      var charge = stripe.charges.create({
  amount: result.total, // amount in cents, again
  currency: "usd",
  source: stripeToken,
  description: result.description
}, function(err, charge) {
  if (err && err.type === 'StripeCardError') {
    // The card has been declined
  }
  else{

    var sendEmail = function () {
            var smtpTransport = nodemailer.createTransport('smtps://ytcdeveloper@gmail.com:ytcdeveloper123@smtp.gmail.com');
            var mailOptions = {
                to: req.body.stripeEmail,
                from: 'Receipt@pokemart.com',
                subject: 'Thanks for your order !',
                text: 'Thanks, for your order! Your card was charged $' + result.total + ' for your order of ' + result.description + '.'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
              if (err) {
                console.log(error)
              }
            })
          }
    sendEmail()
    res.redirect('/api/orders/cart/checkout')  }
  });
    })

}

else {
    UserOrders.findOne({
      where: {
        sessionId:req.session.id,
        status: 'pending'
      }
    }).then(function(cart){
      cartBeingUsed = cart;
      return OrderDetails.findAll({
        where: {
          userOrderId: cart.id
        }
      })
      .then(function(arrayOfOrders){
        arrayOfOrders.forEach(order => {
          totalPrice += (order.price * order.quantity);
          descriptionString.push(order.title)
        })
        return {total: totalPrice,
          description: descriptionString.join(',')
        }
      })
    }).then(function(result){
      var charge = stripe.charges.create({
  amount: result.total, // amount in cents, again
  currency: "usd",
  source: stripeToken,
  description: result.description,
  
}, function(err, charge) {
  if (err && err.type === 'StripeCardError') {
    // The card has been declined
  }
  else{
    res.redirect('/api/orders/cart/checkout')  }
  });
    })

}



})

module.exports = router;