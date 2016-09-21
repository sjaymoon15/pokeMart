// app.controller('ProfileCtrl', function($scope, UserFactory, $log){
// 	UserFactory.userProfileInfo(function(userInfo){
// 			 $scope.userInfo=userInfo;
// 	})

// })

app.controller('ProfileCtrl', function($scope, UserFactory, $stateParams, $log){
	   alert($stateParams.id, 'whyyy'); 
	   UserFactory.fetchOne($stateParams.id)
  .then(function(user) {
  	 alert($stateParams.id, 'noo'); 
  	
    $scope.user = user;
  })
  // .catch(function (err) {
  // 	 alert($stateParams.id); 
  //   console.error('blaaaa',$stateParams.id)
  // });

})