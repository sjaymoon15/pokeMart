'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

var Product = db.model('product');

var OrderDetails = db.define('orderDetails', {
    price: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    photoUrl: {
        type: Sequelize.TEXT
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
