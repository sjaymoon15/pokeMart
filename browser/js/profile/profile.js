app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
             url: '/profile',
        templateUrl: 'js/profile/profile.html',
        controller:'ProfileCtrl'
        // resolve: {      
        // profileInfo: function (User, UserFactory) {
        //         return UserFactory.userProfileInfo();
        //     },
        // }
    });
});
                