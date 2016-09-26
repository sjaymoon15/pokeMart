'use strict'

var router = require('express').Router();
var User = require('../../db/models/user');



router.get('/', function (req, res, next) {
    console.log('not working', req.user.id)
    //check user priviledge
    console.log('session', req.session) // OB/SB: dead code
    //if user isAdmin then return all users
    if (req.user.isAdmin){
      User.findAll().then(function (usersArray){
        res.send(usersArray)
    }).catch(next)
  	}
  	else {
  		res.status(401).send('Sorry, its just for employees :-(((');
  	}
  });

router.get('/getLoggedInUserId', function(req,res,next){
    if(req.user) {
      console.log('yaaaaaaaaa', req.user.id)
    res.send(req.user)
    }
    else res.send({id: 'session'})

})

router.get('/:id', function (req, res, next){
    console.log('great', req.user.id)
  // check that user is current user or Admin
  if (!req.user.isAdmin && req.user.id != req.params.id){
    res.status(403).send('Forbidden');
    return
  }
  User.findById(req.params.id)
  .then(function (user){
    res.send(user)
  }).catch(next)
})

router.post('/', function(req,res,next){
  User.findOne({
    where: {
      email: req.body.email // OB/SB: alternative: set field to be unique in the model
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
if(req.params.id==req.user.id || req.user.isAdmin) {
  User.findById(req.params.id)
  .then(function(user){
    return user.update(req.body) // OB/SB: watch out for updating own privileges
  }).then(function(updatedUser) {
    res.send(updatedUser);
  }).catch(next)
}
else {
	res.status(401).send('Sorry');
}
});

router.delete('/:id', function(req,res,next){
  //check if the is correct user based on id 
  //or check if admin
  
  //if yes
  if(req.params.id==req.user.id || req.user.isAdmin) {
  User.findById(req.params.id)
  .then(function(user){
     return user.destroy()
  }).then(function(){
    res.sendStatus(204)
    //res.send('destroyed user #', + req.params.id);

  }).catch(next)
}
else {
	res.status(401).send('Sorry keep me');
}
})

module.exports = router;

