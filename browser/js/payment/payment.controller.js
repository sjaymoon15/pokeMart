app.controller('PaymentCtrl', function($scope,UserFactory, $log, CartFactory){
  $scope.info = {};
  $scope.validateUser= function () {
    console.log($scope.info)
        UserFactory.updateUserBeforePayment($scope.info)
        .then(function() {
          $scope.showCC = true;
        }).catch($log.error)
        
  }

  $scope.getTotalCost = CartFactory.getTotalCost().catch($log.error)

  $scope.cartItemsToString = CartFactory.cartItemsToString().catch($log.error)
})