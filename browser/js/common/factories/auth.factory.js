app.factory('AuthFactory',  function($http){

    var getData = res => res.data;

    var AuthFactory = {};


    AuthFactory.signup = function (signupInfo) {
        return $http.post('/signup', signupInfo).then(getData)
    }

    AuthFactory.googleSignup = function () {
        return $http.get('/auth/google');
    }

    AuthFactory.resetPassword = function (token, login) {
        return $http.post('/reset/password/' + token, login);
    }

    AuthFactory.forgetPassword = function (email) {
        console.log("11111111", email)
        return $http.post('/forgot', email);
    }

    return AuthFactory;
});
