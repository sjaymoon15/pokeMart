'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

var Product = db.model('product');

// OB/SB: consider more validations (e.g. min value for price and quantity)
var OrderDetails = db.define('orderDetails', { // OB/SB: singular isntead of plural seems to be standard
    price: {
        type: Sequelize.INTEGER, // OB/SB: INTEGERS (use cents) to avoid floating point problems
        defaultValue: 10000
    },
    quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1
        // OB/SB: maybe default to 1
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    photoUrl: {
        type: Sequelize.TEXT,
        validate: {
            isUrl:true
        }
    }
}, {
    //class methods
    classMethods: {
        findByOrderId: function (userOrderId) {
            return OrderDetails.findAll({
                where: {
                    userOrderId: userOrderId
                }
            });
        },
        fromProductTitle: function(title) {
            Product.findOne({
                where: {title: orderDetails.title}
            }).then(function (product) {
                orderDetails.setProduct(product.id);
            })
        }
    }
    // hooks: {
    //     // OB/SB: might as well be a class method, i.e. `.fromProductTitle(...)`
    //     afterCreate: function (orderDetails) {
    //         Product.findOne({
    //             where: {title: orderDetails.title}
    //         }).then(function (product) {
    //             orderDetails.setProduct(product.id);
    //         })
    //     }
    // }
});

module.exports = OrderDetails;
// should be associated to product
// once checkout update inventory

// a post request: req.body will have title, price and quantity
// setProduct(product.id)
