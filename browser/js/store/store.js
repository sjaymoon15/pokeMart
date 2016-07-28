app.config(function ($stateProvider) {
    $stateProvider.state('store', {
        url: '/store',
        templateUrl: 'js/store/store.html',
        controller: 'StoreCtrl',
        resolve: {
            products: function (ProductFactory) {
                return ProductFactory.fetchAll();
            }
        }
    });
});
