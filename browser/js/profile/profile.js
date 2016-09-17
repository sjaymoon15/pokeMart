app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
        url: '/profile',
        templateUrl: 'js/profile/profile.html',
        controller:'ProfileCtrl',
        resolve: {
            userProfile: function (UserFactory) {
                return UserFactory.findUser();
            }
        }
       
    });
});
 

    