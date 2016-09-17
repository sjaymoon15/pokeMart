'use strict';
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

module.exports = function (app, db) {

    var User = db.model('user');

    // When passport.authenticate('local') is used, this function will receive
    // the email and password to run the actual authentication logic.
    var strategyFn = function (email, password, done) {
        User.findOne({
                where: {
                    email: email
                }
            })
            .then(function (user) {
                // user.correctPassword is a method from the User schema.
                if (!user || !user.correctPassword(password)) {
                    done(null, false);
                } else {
                    // Properly authenticated.
                    done(null, user);
                }
            })
            .catch(done);
    };

    passport.use(new LocalStrategy({usernameField: 'email', passwordField: 'password'}, strategyFn));



    // A POST /login route is created to handle login.
    app.post('/login', function (req, res, next) {

        var authCb = function (err, user) {

            if (err) return next(err);

            if (!user) {
                var error = new Error('Invalid login credentials.');
                error.status = 401;
                return next(error);
            }

            // req.logIn will establish our session.
            req.logIn(user, function (loginErr) {
                if (loginErr) return next(loginErr);
                // We respond with a response object that has user with _id and email.
                res.status(200).send({
                    user: user.sanitize()
                });
            });

            console.log('=====req user=====', req.user.id); // hash

        };

        passport.authenticate('local', authCb)(req, res, next);

    });

 app.post('/signup', function(req, res, next) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var test=re.test(req.body.email);
    if (!test){
        res.send('not a valid email')
    }
    else {
        User.findOne({
            where: {
              email: req.body.email // OB/SB: alternative: set field to be unique in the model
            }
        }).then(function(userOrNull){
            if (userOrNull){
              res.send('email exists already')
            }                                              
                else {
                    User.create(req.body)
              .then(function(user) {
                req.login(user, function (err) {
                    if (err) console.log(err);
                    res.redirect('/login');
                })
              })
                }             
              
        })
    }
    });
  // app.post('/signup', function(req, res, next) {
  //       User.findOne({
  //           where: {
  //             email: req.body.email // OB/SB: alternative: set field to be unique in the model
  //           }
  //       }).then(function(userOrNull){
  //           if (userOrNull){
  //             res.send('email exists already')
  //           } 
  //           else {             
  //                 var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  //                 var test=re.test(userOrNull);
  //               if (!test){
  //                   res.send('not a valid email')
  //               }
  //               else {
  //                   User.create(req.body)
  //             .then(function(user) {
  //               req.login(user, function (err) {
  //                   if (err) console.log(err);
  //                   res.redirect('/');
  //               })
  //             })
  //               }
  //           }
            
  //       })
  //   });
    // app.use('/auth/google', require('./google'));

    // router.use('/twitter', require('./twitter.oauth'));

    // router.use('/github', require('./github.oauth'));


};
