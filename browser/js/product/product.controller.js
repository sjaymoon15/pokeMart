app.controller('ProductCtrl', function ($scope, theProduct, allReviews, ProductFactory, CartFactory) {
    // product
    $scope.newReview = {};
    $scope.product = theProduct;
    $scope.reviews = allReviews;
    // review
    $scope.submitReview = function () {
        $scope.newReview.productId = $scope.product.id;
        ProductFactory.createReview($scope.product.id, $scope.newReview);
    }
    $scope.rating = 5;
    // add to cart
    $scope.addToCart = function () {
        CartFactory.addToCart($scope.product.id, $scope.quantity)

    };
    $scope.arrayMaker = function (num){
        var arr = [];
        for (var i = 1; i <=num; i ++){
            arr.push(i)
        }
        return arr;
    }
})

