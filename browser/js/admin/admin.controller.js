app.controller('AdminCtrl', function ($scope, $log, allProducts, allUsers, allOrderDetails, ManageOrdersFactory) {
    $scope.products = allProducts;
    $scope.users = allUsers;
    
    //adding status to each orderDetail 
    allOrderDetails.forEach(function(orderDetail){
    	ManageOrdersFactory.findStatus(orderDetail.userOrderId)
    	.then(function(status){
    		orderDetail.status = status;
    	}).catch($log.error);
    })

    //adding user info to each orderDetail
    allOrderDetails.forEach(function(orderDetail){
    	ManageOrdersFactory.findUser(orderDetail.userOrderId)
    	.then(function(user){
    		orderDetail.user = user;
    	}).catch($log.error);
    })
    $scope.orders = allOrderDetails;
    console.log(allOrderDetails);

});
