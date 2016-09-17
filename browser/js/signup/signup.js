app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignupCtrl'
    });

});

  app.controller('SignupCtrl', function ($scope, AuthFactory, $state) {
    $scope.signup = {}; 
    $scope.sendSignup = function (signupInfo) {
        AuthFactory.signup(signupInfo)
        .then(function (response) {
            if (response === 'email exists already') {
                Materialize.toast('User already exists', 2000);
            } 
            else if (response === 'not a valid email'){
                Materialize.toast('It is not a valid email', 2000);
            }
            else {
                 Materialize.toast('Go ahead and login', 4000);
                $state.go('login');
            }
        })
    }
    $scope.googleSignup = AuthFactory.googleSignup;
});


