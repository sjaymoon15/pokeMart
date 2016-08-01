'use strict'

var Sequelize = require('sequelize');

var db = require('../_db');

var Image = db.define('image', { data: Sequelize.BLOB });

module.exports = Image;
