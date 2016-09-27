app.controller('ProfileCtrl', function($scope, UserFactory, $state){
	    UserFactory.fetchOne()
      .then(function(user){
       $scope.user = user;
       console.log('helloo',user.id)
      })

      $scope.user = {};
  
  $scope.saveUserInfo= function () {
         UserFactory.updateUserBeforePayment($scope.user) 
        .then(function(){
           Materialize.toast('You successfully updated your profile!', 1000);
        }).catch(function () {
            Materialize.toast('Something went wrong', 1000);
        })   
  }
  $scope.dontSaveInfo=function(){
     $state.go('store');
  }
})

