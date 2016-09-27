app.controller('PaymentCtrl', function($scope,UserFactory, $state, $log, CartFactory, totalCost, arrayOfItems){
  $scope.info = {};
  
  $scope.validateUser= function () {

        UserFactory.updateUserBeforePayment($scope.info)
        .then(function() {
          $scope.showCC = true;
        }).catch($log.error)
        
  }
  $scope.edit=function(){
    $state.go('cart')

  }
  $scope.totalCost = totalCost;
  $scope.arrayOfItems = arrayOfItems;
  $scope.stringOfItems = arrayOfItems.map(item => item.title).join(',')
})