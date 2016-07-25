'use strict'

var router = require('express').Router();
var User = require('../../db/models/user');

router.get('/', function (req, res, next) {
  //check user priviledge

  //if user isAdmin then return all users
  User.findAll()
  .then(function (usersArray){
    res.send(usersArray)
  })
})

module.exports = router;