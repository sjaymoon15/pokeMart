app.controller('ProfileCtrl', function($scope, UserFactory, $log){
	UserFactory.userProfileInfo(function(userInfo){
			 $scope.userInfo=userInfo;
	})

})

