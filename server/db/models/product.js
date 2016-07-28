'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');



// OB/SB: consider more validations
module.exports = db.define('product', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    category: { // OB/SB: just one?
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
        addToOrder: function (quantity,userId){
         var currentOrder;
         var OrderDetails = db.model('orderDetails');
        return OrderDetails.create({
            price: this.price,
            title: this.title,
            quantity: quantity,
            productId: this.id
        }).then(function(orderDetail){
            currentOrder=orderDetail;
         var UserOrders = db.model('userOrders');
        return UserOrders.findOne({
            where:{
                userId:userId,
                status:'pending'
            }
         })
         .then(function(cart){
            
            return currentOrder.setUserOrder(cart);
         })
         .catch(console.error);
        })
        
    }
}
});

