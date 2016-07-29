app.controller('CheckoutCtrl', function ($scope, CartFactory) {

    CartFactory.fetchAllFromCart()
    .then(function (items) {
        $scope.items = items;
    })


});
