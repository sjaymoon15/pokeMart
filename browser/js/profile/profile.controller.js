app.controller('ProfileCtrl', function($scope, $stateParams, UserFactory, $state){
	    UserFactory.fetchOne()
      .then(function(user){
       $scope.user = user;
       console.log('helloo',user.id)
      })

      $scope.user = {};
  
  $scope.saveUserInfo= function () {
        return UserFactory.updateUserBeforePayment($scope.user)       
  }
})

