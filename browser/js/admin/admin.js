app.config(function ($stateProvider) {
    $stateProvider
    .state('admin', {
        url: '/admin',
        templateUrl: 'js/admin/admin.html',
        controller: 'AdminCtrl',
        resolve: {
            allProducts: function (ProductFactory) {
                return ProductFactory.fetchAll();
            },
            allUsers: function (UserFactory) {
                return UserFactory.fetchAll();
            },
            allOrderDetails: function(ManageOrdersFactory){
                return ManageOrdersFactory.fetchAll();
            }
        }
    })
})
