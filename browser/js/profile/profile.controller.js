app.controller('ProfileCtrl', function($scope, UserFactory, $state){
	    UserFactory.fetchOne()
      .then(function(user){
       $scope.user = user;
      })
      // .then(function(){
      //   UserFactory.fetchOneReview()
      // })
      // .then(function(reviews){
      //  $scope.reviews = reviews;
      //  })
      .catch(function () {
            Materialize.toast('Something went wrong', 1000);
        }) 

      $scope.user = {};
      $scope.reviews= {};
   

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
  $scope.showReviews=function(){
    UserFactory.fetchOneReview()
    .then(function(reviews){
      console.log("whatsupp", reviews)
      $scope.reviews = reviews;
    })
  }


})

