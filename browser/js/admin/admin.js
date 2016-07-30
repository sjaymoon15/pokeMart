app.config(function ($stateProvider) {
    $stateProvider.state('admin', {
        url: '/admin',
        templateUrl: 'js/admin/admin.html',
        controller: 'AdminCtrl',
        resolve: {
            allProducts: function (ProductFactory) {
                return ProductFactory.fetchAll().catch(function (err) {
                    console.error(err);
                })
            }
        }
    })
})
