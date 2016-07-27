'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('userOrders', {
    status: {
        type: Sequelize.ENUM('pending', 'paid', 'fulfilled'),
        defaultValue: 'pending'
    },
    sessionId: {
        type: Sequelize.STRING
    } // maybe in local storage
}, {
    //class methods
    //instance methods
    // onUpdate status, go update orderDetails
});

// status changes to paid
// fetch orderDetails
// get orderDetails quantity and productId
// got update product quantity
