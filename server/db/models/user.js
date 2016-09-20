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
     // allowNull: false
},
lastName: {
    type: Sequelize.STRING
       // allowNull: false
},
address: {
    type: Sequelize.STRING,
       // allowNull: false
},
zipCode: {
    type: Sequelize.INTEGER,
       // allowNull: false
       // validate: {
       //   isNumeric: true
       // }
},
city: {
    type: Sequelize.STRING,
       // allowNull: false
},
state: {
    type: Sequelize.STRING,
       // allowNull: false
},
country: {
    type: Sequelize.STRING,
    defaultValue: 'USA'
},
password: {
    type: Sequelize.STRING,
    // allowNull: false
},
salt: {
    type: Sequelize.STRING
},
resetPasswordToken: {
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
            console.log('new encryptPassword',this.Model.encryptPassword(candidatePassword, this.salt))
            return this.Model.encryptPassword(candidatePassword, this.salt) === this.password;
        },
        addInfo: function(updateObj){
            this.update(updateObj).catch(console.error)
        }
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
        },
    },
    hooks: {
        beforeCreate: function (user) {
            user.salt = user.Model.generateSalt();
            user.password = user.Model.encryptPassword(user.password, user.salt);
        },
        beforeUpdate: function (user) {
            if (user.changed('password')) {
                user.salt = user.Model.generateSalt();
                user.password = user.Model.encryptPassword(user.password, user.salt);
            }
        }
    }
});
