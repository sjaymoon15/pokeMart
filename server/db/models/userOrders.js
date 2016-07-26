'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('userOrders', {
    // id: {
    //     type: Sequelize.UUID,
    //     primaryKey: true
    // },
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
});

// userID
