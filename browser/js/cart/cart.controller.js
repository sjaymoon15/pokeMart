 app.controller('CartCtrl', function($scope, $log, cartContent, CartFactory){
 	$scope.cartContent=cartContent;
 	
 	$scope.remove= function(orderId) {
 		CartFactory.removeFromCart(orderId)
 		.then(function(newCart){
 			$scope.cartContent = newCart;
 		}).catch($log)
 	}
 	
 	$scope.changeQuantity=CartFactory.changeQuantity;

  $scope.checkout = CartFactory.checkout;

  $scope.total = function() {
    console.log(cartContent)
    var total = 0;
    cartContent.forEach(cart => total += (cart.price * cart.quantity))
    
    return total;
  }
 })

