'use strict';
var crypto = require('crypto');
var _ = require('lodash');
var Sequelize = require('sequelize');


var db = require('../_db');


module.exports = db.define('user', {
    isAdmin:{
       type: Sequelize.BOOLEAN,
       defaultValue: false
   },
   email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
        isEmail: true
    }
},
firstName: {
    type: Sequelize.STRING
},
lastName: {
    type: Sequelize.STRING
},
address: {
    type: Sequelize.STRING
},
zipCode: {
    type: Sequelize.INTEGER
},
city: {
    type: Sequelize.STRING
},
state: {
    type: Sequelize.STRING
},
country: {
    type: Sequelize.STRING
},
password: {
    type: Sequelize.STRING,
    allowNull: false
},
salt: {
    type: Sequelize.STRING
},
twitter_id: {
    type: Sequelize.STRING
},
facebook_id: {
    type: Sequelize.STRING
},
google_id: {
    type: Sequelize.STRING
}
}, {
    instanceMethods: {
        sanitize: function () {
            return _.omit(this.toJSON(), ['password', 'salt']);
        },
        correctPassword: function (candidatePassword) {
            return this.Model.encryptPassword(candidatePassword, this.salt) === this.password;
        },  
    },
    classMethods: {
        generateSalt: function () {
            return crypto.randomBytes(16).toString('base64');
        },
        encryptPassword: function (plainText, salt) {
            var hash = crypto.createHash('sha1');
            hash.update(plainText);
            hash.update(salt);
            return hash.digest('hex');
        }
    },
    hooks: {
        beforeValidate: function (user) {
            if (user.changed('password')) {
                user.salt = user.Model.generateSalt();
                user.password = user.Model.encryptPassword(user.password, user.salt);
            }
        },
        afterCreate: function(user) {
            var UserOrders = db.model('userOrders');
            return UserOrders.create({})
            .then(function (newCart){
                return newCart.setUser(user)
            }).catch(console.error)

        }
    }
});
