'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');


module.exports = db.define('product', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    category: { 
        type: Sequelize.STRING
    },
    description: {
        type: Sequelize.TEXT,
        defaultValue: 'No description'
    },
    photoUrl: {
        type: Sequelize.STRING,
        validate: {
            //isUrl: true
        }
    },
    quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1
    },
    price: {
        type: Sequelize.INTEGER,
        defaultValue: 10000
    }
},{
    instanceMethods:{
        addToOrder: function (quantity=1,cartId){
            var currentOrder;
            var OrderDetails = db.model('orderDetails');
            return OrderDetails.create({
                price: this.price,
                title: this.title,
                quantity: quantity,
                productId: this.id
            }).then(function(newOrder) {
                var UserOrders = db.model('userOrders');
                return UserOrders.findOne({
                    where:{
                        id: cartId
                    }
                }).then(function(cart){
                    return newOrder.setUserOrder(cart);
                })
            }).catch(console.error);

        },
        checkForQuantity: function(desiredQuantity){
            if (desiredQuantity > this.quantity){
                return false;
            }
            return true
        }
    }
});

