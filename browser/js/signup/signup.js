app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignupCtrl'
    });

});

app.controller('SignupCtrl', function ($scope, UserFactory) {
    $scope.signup = {};
    $scope.sendSignup = function (signupInfo) {
        UserFactory.signup(signupInfo);
    }
});
