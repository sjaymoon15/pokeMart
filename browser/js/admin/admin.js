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
                return UserFactory.fetchAll().catch(function (err) {
                    console.log(err)
                });
            },
            allOrderDetails: function(ManageOrdersFactory){
                return ManageOrdersFactory.fetchAll();
            },
            allUserOrders: function(ManageOrdersFactory){
                return ManageOrdersFactory.fetchAllUserOrders();
            }
        }
    })
})
