app.controller('PaymentCtrl', function($scope,UserFactory, $log){
  $scope.info = {};
  $scope.validateUser= function () {
    console.log($scope.info)
        UserFactory.updateUserBeforePayment($scope.info)
        .then(function() {
          $scope.showCC = true;
        }).catch($log.error)
        
  }
})