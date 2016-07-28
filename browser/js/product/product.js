app.config(function ($stateProvider) {
    $stateProvider.state('product', {
        url: '/products/:productId',
        templateUrl: 'js/product/product.html',
        controller: 'ProductCtrl',
        resolve: {
            theProduct: function (ProductFactory, $stateParams) {
                return ProductFactory.fetchById($stateParams.productId);
            },
            allReviews: function(ProductFactory, $stateParams) {
                return ProductFactory.fetchAllReviews($stateParams.productId);
            }
        }
    });
});
