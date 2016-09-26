app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
             url: '/user',
        templateUrl: 'js/profile/profile.html',
        controller:'ProfileCtrl',
    });
});
                
