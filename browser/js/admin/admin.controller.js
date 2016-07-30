app.controller('AdminCtrl', function ($scope, allProducts, allUsers) {
    $scope.products = allProducts;
    $scope.users = allUsers;
});
