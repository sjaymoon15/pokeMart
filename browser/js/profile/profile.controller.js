// app.controller('ProfileCtrl', function($scope, UserFactory, $log){
// 	UserFactory.userProfileInfo(function(userInfo){
// 			 $scope.userInfo=userInfo;
// 	})

// })

app.controller('ProfileCtrl', function($scope, $stateParams, UserFactory, $state){
	   // $scope.user = profileInfo;
    
	    UserFactory.fetchOne()
      .then(function(user){
       $scope.user = user;
       console.log('helloo',user.id)
      })
  // .then(function(user) {
  // 	 alert($stateParams.id, 'noo', user); 
  	
  //   $scope.user = user;
  // })
  // .catch(function (err) {
  // 	 alert($stateParams.id); 
  //   console.error('blaaaa',$stateParams.id)
  // });
// console.log('helloo',user.id)
})

// app.controller('ProfileCtrl', function($scope, UserFactory, $stateParams, $log){
// 	console.log('meeeee', user.id)
 
// 	console.log('meeeee', user.id)
// 	   UserFactory.fetchOne()
//       .then(function(user) {

//   	console.log('meeeee', user.id)
//     $scope.user = user;
//   })
//    .catch(function (err) {
   	  
//      console.error('blaaaa',$stateParams.id, user, user.id)
//    });
	 
// })