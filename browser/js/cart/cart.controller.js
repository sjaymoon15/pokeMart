 app.controller('CartCtrl', function($scope, $log, cartContent, CartFactory){
 	$scope.cartContent=cartContent;
 	
 	$scope.remove= function(orderId) {
 		CartFactory.removeFromCart(orderId)
 		.then(function(newCart){
 			$scope.cartContent = newCart;
 		}).catch($log)
 	}
 	
 	$scope.changeQuantity=CartFactory.changeQuantity;
 })

