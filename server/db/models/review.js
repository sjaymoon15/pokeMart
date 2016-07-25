'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('Review', {
    subject: {
        type: Sequelize.STRING,
    },
    content: {
        type: Sequelize.TEXT
    },
    rating: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
});