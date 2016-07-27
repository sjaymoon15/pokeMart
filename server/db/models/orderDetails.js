'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

var Product = db.model('product');

// OB/SB: consider more validations (e.g. min value for price and quantity)
var OrderDetails = db.define('orderDetails', { // OB/SB: singular isntead of plural seems to be standard
    price: {
        type: Sequelize.FLOAT, // OB/SB: INTEGERS (use cents) to avoid floating point problems
        allowNull: false
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
        // OB/SB: maybe default to 1
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    photoUrl: {
        type: Sequelize.TEXT
        // OB/SB: consider url validation (see sequelize docs)
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
        }
    },
    hooks: {
        // OB/SB: might as well be a class method, i.e. `.fromProductTitle(...)`
        afterCreate: function (orderDetails) {
            Product.findOne({
                where: {title: orderDetails.title}
            }).then(function (product) {
                orderDetails.setProduct(product.id);
            })
        }
    }
});

module.exports = OrderDetails;
// should be associated to product
// once checkout update inventory

// a post request: req.body will have title, price and quantity
// setProduct(product.id)
