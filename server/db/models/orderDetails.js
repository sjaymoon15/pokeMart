'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('orderDetails', {
    price: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
}, {
    //class methods
    //instance methods
});
