
app.controller('AdminCtrl', function ($scope, allUserOrders, $log, allProducts, allUsers, allOrderDetails, ManageOrdersFactory) {

    $scope.products = allProducts;
    $scope.users = allUsers;
    $scope.userOrders = allUserOrders;

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
    allOrderDetails = allOrderDetails.sort(function (a, b) {
        return a.userOrderId - b.userOrderId;
    });
    allOrderDetails = _.groupBy(allOrderDetails, 'userOrderId')
    $scope.orders = $.map(allOrderDetails,function (order, i) {
        if (i) return [order];
    })
    console.log($scope.orders)

});
