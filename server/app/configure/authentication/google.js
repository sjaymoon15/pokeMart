'use strict';

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports = function (app, db) {

    var User = db.model('user');

    var googleConfig = app.getValue('env').GOOGLE;

    var googleCredentials = {
        clientID: googleConfig.clientID,
        clientSecret: googleConfig.clientSecret,
        callbackURL: googleConfig.callbackURL
    };

    var verifyCallback = function (accessToken, refreshToken, profile, done) {
        // profile is a json object, don't trust console.log(profile)...
        // stringify it first, is there another way????
        console.log('here??????????')
        console.log(profile.id);
        console.log(profile.emails[0].value);
        console.log(profile.name.givenName)
        console.log(profile.name.familyName)
        User.findOne({
                where: {
                    google_id: profile.id
                }
            })
            .then(function (user) {
                if (user) {
                    return user;
                } else {
                    return User.create({
                        google_id: profile.id,
                        email: (profile.emails[0].value) ? profile.emails[0].value : profile.displayName + '@fake.com',
                        firstName: profile.name.givenName,
                        lastName: profile.name.familyName,
                        password: 'dummy'
                    });
                }
            })
            .then(function (userToLogin) {
                console.log(userToLogin)
                done(null, userToLogin);
            })
            .catch(function (err) {
                console.error('Error creating user from Google authentication', err);
                done(err);
            });

    };

    passport.use(new GoogleStrategy(googleCredentials, verifyCallback));

    app.get('/auth/google', passport.authenticate('google', {
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    }));

    app.get('/auth/google/callback',
        passport.authenticate('google', {failureRedirect: '/login'}),
        function (req, res) {
            res.redirect('/');
        });

};
