app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
             url: '/user/:id',
        templateUrl: 'js/profile/profile.html',
        controller:'ProfileCtrl',
        // resolve: {      
        // profileInfo: function (UserFactory, $stateParams) {
        //         console.log('Users id:\n', $stateParams);
        //         return UserFactory.fetchOne($stateParams.id);
        //     }
        // }
    });
});
                

// app.config(function ($stateProvider) {
//     $stateProvider.state('user', {
//              url: '/users/:id',
//         templateUrl: 'js/profile/profile.html',
//         controller:'ProfileCtrl'
 
//     });
// });
             

// app.config(function ($stateProvider) {
//     $stateProvider.state('user', {
//              url: '/users',
//         templateUrl: 'js/profile/profile.html',
//         controller:'ProfileCtrl'
 
//     });
// });
