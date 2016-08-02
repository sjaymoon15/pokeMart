'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('userOrders', { // OB/SB: maybe could just be called 'order'
    // OB/SB: maybe need 'date', 'shipping address'
    status: {
        type: Sequelize.ENUM('pending', 'paid', 'fulfilled'), // OB/SB: 'cancelled'?
        defaultValue: 'pending'
    },
    sessionId: {
        type: Sequelize.STRING
    },
    shipTo: {
        type: Sequelize.STRING
    }
}, {
    //class methods
    classMethods: {
        createCart: function(userId) {
            return this.create({})
            .then(function (newCart){
                return newCart.setUser(userId);
            })
        },
        findBySession: function (sessionId) {
            return this.findOne({
                where: {sessionId: sessionId}
            })
        },
        findByUser: function (userId) {
            return this.findOne({
                where: {userId: userId, status: 'pending'}
            })
        }
    },
    instanceMethods: {
        updateUser: function (userId) {
            return this.setUser(userId);
        },
        updateSession: function (sessionId) {
            return this.update({sessionId: sessionId});
        },
        updateShipping: function(infoObj) {
            //add after fixing session
        }
    }
    // onUpdate status, go update orderDetails
});

// status changes to paid
// fetch orderDetails
// get orderDetails quantity and productId
// got update product quantity
