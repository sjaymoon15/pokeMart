app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
        // url: '/profile/:userId',
             url: '/profile/:userId',
        templateUrl: 'js/profile/profile.html',
        controller:'ProfileCtrl',
       //  resolve: {
       
       // singleUser: function (UserFactory, $stateParams) {
       //          return UserFactory.findUser($stateParams.userId);
       //      },
       //  }
    });
});
 

            