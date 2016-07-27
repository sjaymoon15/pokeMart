var expect = require('chai').expect;
var Promise = require('bluebird');
var Sequelize = require('sequelize');
var db = require('../../../server/db');
var User = db.model('user');
var UserOrders = db.model('userOrders');
var OrderDetails = db.model('orderDetails');
var Product = db.model('product');

var userid;

describe('User orders', function () {

    // OB/SB: start by clearing existing db

    var user, order;
    before(function (done) {
        Product.create({
            title: 'pikachu',
            quantity: '10',
            price: '99.9',
            description: 'starter pokemon'
        });

        user = User.create({
            email: "obama@gmail.com",
            password: "potus"
        })

        order = UserOrders.create({});
        done();
    });
    /*
    OB/SB:
    var product, user, order;
    beforeEach(function () {
        return Promise.all([productPromise, userPromise, orderPromise])
        .spread(function (p, u, o) {
            product = p;
            user = u;
            order = o;
        });
    });
    */

    it('has default status pending', function (done) {
        order
        .then(function (userOrder) {
            expect(userOrder.status).to.be.equal('pending')
        });
        done();
    });

    it('may belong to an user', function (done) {
        Promise.all([user, order])
        .spread(function (user, order) {
            return order.setUser(user);
            // })
        })
        .then(function (userOrder) {
            expect(userOrder.userId).to.be.equal(2)
        });
        done()
    });

})

xdescribe('OrderDetails', function () {

    // OB/SB: eager creating: http://docs.sequelizejs.com/en/latest/docs/associations/#creating-with-associations
    var userOrder1, orderDetails1;
    before(function (done) {
        orderDetails1 = User.findById(2)
            .then(function (user) {
                return UserOrders.create({})
                .then(function (userOrder) {
                    return userOrder.setUser(user.id);
                })
            }).then(function (userOrder) {
                userOrder1 = userOrder;
                return userOrder;
            }).then(function () {
                return OrderDetails.create({
                    price: 99,
                    quantity: 1,
                    title: 'pikachu'
                })
            }).then(function (orderDetails) {
                console.log('=====', userOrder1)
                return orderDetails.setUserOrder(userOrder1); // this!!!!!!!
            });
        done();
    });

    after(function () {

    })

    // OB/SB: check validations instead of identity, e.g. assert that it needs a price
    it('has price and quantity', function () {
        orderDetails1
        .then(function (orderDetails) {
            // console.log(orderDetails)
            expect(orderDetails.price).to.be.equal(99);
            expect(orderDetails.quantity).to.be.equal(1);
        })
    });

    it('has product id', function () {
        orderDetails1
        .then(function (orderDetails) {
            expect(orderDetails.productId).to.be.equal(1);
        })
    })

    it('requires price and quantity', function () {
        var inValidOrderDetails = OrderDetails.build({});
        // OB/SB: missing `return`
        inValidOrderDetails.validate()
        .then(function (result) {
            expect(result).to.be.an.instanceOf(Error);
            expect(result.message).to.contain('price cannot be null');
            expect(result.message).to.contain('quantity cannot be null');
        });
    });

    it('has a findByOrderId', function () {
        return OrderDetails.findByOrderId(1)
        .then(function (orderDetailsArr) {
            console.log(orderDetailsArr)
            expect(orderDetailsArr).to.be.an.instanceOf(Array);
            expect(orderDetailsArr[0].title).to.be.equal('pikachu')
        });
    })


});
