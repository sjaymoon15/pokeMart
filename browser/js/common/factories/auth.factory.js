app.factory('AuthFactory',  function($http){

    var getData = res => res.data;

    var AuthFactory = {};


    AuthFactory.signup = function (signupInfo) {
        return $http.post('/signup', signupInfo).then(getData)
    }

    AuthFactory.googleSignup = function () {
        return $http.get('/auth/google');
    }

    return AuthFactory;
});
