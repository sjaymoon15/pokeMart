app.controller('ProfileCtrl', function($scope, UserFactory, $log){
	UserFactory.userProfileInfo(function(userInfo){
			 $scope.userInfo=userInfo;
	})

	// })
})

// app.controller('ProfileCtrl', function($scope, UserFactory, profileInfo,  $log){
// 	UserFactory.userProfileInfo(function(user){
// 		 $scope.profileInfo=profileInfo;
// 	})
// })
