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
        allowNull: false
    },
    photoUrl: {
        type: Sequelize.STRING
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    price: {
        type: Sequelize.FLOAT,
        allowNull: false
    }
});

