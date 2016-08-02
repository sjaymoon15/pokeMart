app.controller('CheckoutCtrl', function ($scope, CartFactory) {

    CartFactory.fetchAllFromCart()
    .then(function (items) {
        console.log(items)
        $scope.items = items;

  			//calculating total price and put that into $scope.total
        var itemsArr = items;
        var totalPriceEach = [];
        itemsArr.forEach(function(element){
        	totalPriceEach.push(element.price * element.quantity);
        })
        $scope.total = totalPriceEach.reduce( (prev, curr) => prev + curr );
    })

    $scope.checkout = CartFactory.checkout;

});
