'use strict'

var router = require('express').Router();
var User = require('../../db/models/user');

router.get('/', function (req, res, next) {
  //check user priviledge
  console.log('session', req.session)
  //if user isAdmin then return all users
  User.findAll()
  .then(function (usersArray){
    res.send(usersArray)
  }).catch(next)
});

router.get('/:id', function(req, res, next){
  User.findOne({
    where: {
      id: req.params.id
    }
  }).then(function(user){
    res.send(user)
  })
});

router.post('/', function(req,res,next){
  User.findOne({
    where: {
      email: req.body.email
    }
  }).then(function(userOrNull){
    if (userOrNull){
      res.send('Error, email exists already')
    } else{
      User.create(req.body)
      .then(function(user) {
        res.send(user)
      })
    }
  })
});

router.put('/:id', function(req,res,next){
  User.findById(req.params.id)
  .then(function(user){
    return user.update(req.body)
  }).then(function(updatedUser) {
    res.send(updatedUser);
  }).catch(next)
});

router.delete('/:id', function(req,res,next){
  //check if the is correct user based on id 
  //or check if admin
  
  //if yes
  User.findById(req.params.id)
  .then(function(user){
     return user.destroy()
  }).then(function(){
    res.status(204).end()
    //res.send('destroyed user #', + req.params.id);

  }).catch(next)
})

module.exports = router;