// app.controller('ProfileCtrl', function($scope, UserFactory, $log){
// 	UserFactory.userProfileInfo(function(userInfo){
// 			 $scope.userInfo=userInfo;
// 	})

// })

app.controller('ProfileCtrl', function($scope, UserFactory, $stateParams, $log){
UserFactory.fetchOne($stateParams.id)
  .then(function(user) {
    $scope.user = user;
  })
  // .catch(function (err) {
    // $scope.error = 'Unauthorized'
    // console.error(err)
  // });

})