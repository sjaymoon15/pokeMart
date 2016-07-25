'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('order', {
    paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    purchasedPrice: {
        type: Sequelize.INTEGER
    },
    date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }

}, {
    //class methods
    //instance methods 
});