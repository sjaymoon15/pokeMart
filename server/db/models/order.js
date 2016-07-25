'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('Order', {
    paid: {
        type: Sequelize.BOOLEAN,
        allowNull: false
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