'use strict'

var router = require('express').Router();
var UserOrders = require('../../db/models/userOrders');
var OrderDetails = require('../../db/models/orderDetails');
var Product = require('../../db/models/product');
var User = require('../../db/models/product');
var db = require('../../db/_db');

router.use(function (req, res, next) {
    var findOrUpdateUser = function (cart) {
        if (!cart) {
            return UserOrders.findByUser(req.user.id)
        } else {
            return cart.updateUser(req.user.id);
        }
    }

    var createCartOrUpdateSess = function (cart) {
        if (!cart) return UserOrders.createCart(req.user.id);
        else return cart.updateSession(req.sessionID);
    }

    var assignCartId = function (cart) {
        req.cartId = cart.id;
        next();
    }

    if (!req.user) {
        UserOrders.findOrCreate({
            where: {sessionId: req.sessionID}
        }).spread(assignCartId) // findOrCreate returns an array
    } else {
        UserOrders.findByUser(req.user.id)
        .then(findOrUpdateUser)
        .then(createCartOrUpdateSess)
        .then(assignCartId)
    }
})

// OB/SB: cart middleware? e.g. req.cart = ... followed by next()

router.get('/cart', function (req, res, next) {

    OrderDetails.findAll({
        where: {
            userOrderId: req.cartId
        }
    }).then(function(orders){
        res.send(orders)
    })
    .catch(next)

});

 // req.body = {
 //    userId
 //    productId
 //    quantity
 // }

 router.post('/cart/:productId', function (req, res, next) {

    // OB/SB: hopefully this could be simplified maybe either using an association method `req.cart.createOrderDetails(...)` or a custom method
    Product.findById(req.params.productId)
    .then(function(product){
        return product.addToOrder(req.body.quantity, req.cartId);
    }).then(function (newOrder) {
        res.send(newOrder);
    }).catch(next);


});

// OB/SB: /cart/:productId

router.delete('/cart/:orderId', function (req, res, next) {
    // product id needs to be sent to front end
    OrderDetails.destroy({
        where: {
            userOrderId: req.cartId,
            id: req.params.orderId
        }
    }).then(function () {
        res.status(204).end();
    }).catch(next);
});

// req.body = {
//     quantity
// }

// req.params.orderDetailId // modified in front end
// OB/SB: maybe go with productId instead, for consistency
router.put('/cart/:orderDetailId', function (req, res, next) {
    OrderDetails.findById(req.params.orderDetailId)
    .then(function(orderDetail) {
        return orderDetail.update({quantity: req.body.quantity})
    }).then(function (updated) {
        res.send(updated);
    }).catch(next);
});

// OB/SB: alternative /api/users/me/orders
router.get('/paid', function (req, res, next) {
    // OB/SB: try to move all this to some model method
    /*
    req.user.getOrders({
        where: {status: 'paid'},
        include: [OrderDetails]
    })
    .then(function (orders) {
        // orders: array of order instances
        // each instance will have a .orderDetails property because of the include
    });
    */
    var dates = [];
    UserOrders.findAll({
     where: {
           userId: req.user.id, // from session/auth
           status: 'paid'
       }
   }).then(function (userOrders) {
     userOrders.forEach(order => dates.push(order.updatedAt))
     return userOrders.map(userOrder => {
         return OrderDetails.findAll({
             where: {userOrderId: userOrder.id}
         })
     });
 }).then(function (itemPromises) {
     return Promise.all(itemPromises);
 }).then(function (paidItemsArr) {
     res.send({paidItems: paidItemsArr, date:dates})
 }).catch(next);
});

router.get('/fulfilled', function (req, res, next) {
    UserOrders.findAll({
        where: {
            userId: req.user.id, // from session/auth
            status: 'fulfilled'
        }
    }).then(function (userOrders) {
        return userOrders.map(userOrder => {
            return OrderDetails.findAll({
                where: {userOrderId: userOrder.id}
            })
        });
    }).then(function (itemPromises) {
        return Promise.all(itemPromises);
    }).then(function (shippedItemsArr) {
        res.send(shippedItemsArr)
    }).catch(next);
});

router.get('/cart/checkout', function(req, res, next) {
    console.log('=================\n', req.cartId)
    return UserOrders.findById(req.cartId)
        .then(function(cart){
            console.log('========================\n', cart.status)
            return cart.update({status: 'paid'})
        }).then(function(){
            return UserOrders.createCart(req.user.id)

        }).then(function() {
            res.sendStatus(201)
        }).catch(next)
})


module.exports = router;
