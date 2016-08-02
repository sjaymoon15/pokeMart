'use strict';
var path = require('path');
var crypto = require('crypto');
var async = require('async');
var session = require('express-session');
var passport = require('passport');
var nodemailer = require('nodemailer');
var SequelizeStore = require('connect-session-sequelize')(session.Store);

var ENABLED_AUTH_STRATEGIES = [
    'local',
    // 'twitter',
    'facebook',
    'google'
];

module.exports = function (app, db) {

    var dbStore = new SequelizeStore({
        db: db
    });

    var User = db.model('user');

    dbStore.sync();

    // First, our session middleware will set/read sessions from the request.
    // Our sessions will get stored in Mongo using the same connection from
    // mongoose. Check out the sessions collection in your MongoCLI.
    app.use(session({
        secret: app.getValue('env').SESSION_SECRET, // req.sessionID gives session id
        store: dbStore,
        resave: false,
        saveUninitialized: false
    }));

    // Initialize passport and also allow it to read
    // the request session information.
    app.use(passport.initialize());
    app.use(passport.session());

    // When we give a cookie to the browser, it is just the userId (encrypted with our secret).
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // When we receive a cookie from the browser, we use that id to set our req.user
    // to a user found in the database.
    passport.deserializeUser(function (id, done) {
        User.findById(id)
            .then(function (user) {
                done(null, user);
            })
            .catch(done);
    });

    // We provide a simple GET /session in order to get session information directly.
    // This is used by the browser application (Angular) to determine if a user is
    // logged in already.
    app.get('/session', function (req, res) {
        // console.log('----------session---------', req.session); //
        // console.log('=====session id=====', req.sessionID); // hash
        if (req.user) {
            res.send({ user: req.user.sanitize() });
            // console.log('=====req user=====', req.user); // hash
        } else {
            res.status(401).send('No authenticated user.');
        }
    });

    app.post('/forgot', function(req, res, next) {
        var token = crypto.randomBytes(16).toString('hex');
        User.findOne({
            where: { email: req.body.email }
        })
        .then(function (user) {
            if (!user) {
                req.flash('error', 'No account with that email address exists.');
                return res.redirect('/forgot');
            } else {
                user.update({resetPasswordToken:token});
                var smtpTransport = nodemailer.createTransport('smtps://ytcdeveloper@gmail.com:ytcdeveloper123@smtp.gmail.com');
                var mailOptions = {
                    to: req.body.email,
                    from: 'passwordreset@pokemart.com',
                    subject: 'Password Reset',
                    text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                      'http://' + req.headers.host + '/reset/password/' + token + '\n\n' +
                      'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                };
                smtpTransport.sendMail(mailOptions, function(err) {
                    console.log('info', 'An e-mail has been sent to ' + 'req.user.email' + ' with further instructions.');
                });
            }
        })
    });

    app.get('/reset/:token', function (req, res, next) {
        User.findOne({ resetPasswordToken: req.params.token })
        .then(function(user) {
            if (!user) {
                res.send('no user')
            } else {
                res.send(req.params.token)
            }
        })
    })

    app.post('/reset/password/:token', function (req, res, next) {
        User.findOne({
            where: { resetPasswordToken: req.params.token }
        })
        .then(function(user) {
            if (!user) {
                return
            } else {
                return user.update({password:req.body.password});
            }
        }).then(function (user) {
            if (!user) res.send('no user');
            else {
                req.logIn(user, function (err) {
                    if (err) console.log(err);
                    res.redirect('/');
                });
            }
        })
    })

    // Simple /logout route.
    app.get('/logout', function (req, res) {
        req.logout();
        res.status(200).end();
    });

    // Each strategy enabled gets registered.
    ENABLED_AUTH_STRATEGIES.forEach(function (strategyName) {
        require(path.join(__dirname, strategyName))(app, db);
    });

};
