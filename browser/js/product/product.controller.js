app.controller('ProductCtrl', function ($scope, theProduct, allReviews, ProductFactory) {
    // product
    $scope.product = theProduct;
    $scope.quantity = 1;
    $scope.reviews = allReviews;
    // review
    $scope.submitReview = function () {
        $scope.newReview.productId = $scope.product.id;
        ProductFactory.createReview($scope.product.id, $scope.newReview);
    }

})

