app.controller('OrderHistoriesCtrl', function ($log, $scope, OrderHistoriesFactory) {

    OrderHistoriesFactory.fetchAll()
    .then(function (userOrdersArr) {

        userOrdersArr.paidItems.forEach(function(arr, i){
            arr.date = new Date(userOrdersArr.date[i]).toString();
        })
        
        $scope.userOrders = userOrdersArr.paidItems;
    })
    .catch($log);
    
});
