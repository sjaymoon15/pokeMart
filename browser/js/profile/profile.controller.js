app.controller('ProfileCtrl', function($scope, UserFactory, $state){
	    UserFactory.fetchOne()
      .then(function(user){
       $scope.user = user;
       console.log('helloo',user.id)
      })

      $scope.user = {};
  
  $scope.saveUserInfo= function () {
        return UserFactory.updateUserBeforePayment($scope.user)       
  }
  $scope.dontSaveInfo=function(){
     $state.go('store');
  }
})

