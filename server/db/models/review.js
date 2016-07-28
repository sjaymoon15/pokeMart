'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('review', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    content: {
        type: Sequelize.TEXT
    },
    rating: {
        type: Sequelize.INTEGER,
        validate:{
            min: 0,
            max:5
        }
        // OB/SB: min/max validations
    }
});