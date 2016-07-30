app.controller('OrderHistoriesCtrl', function ($log, $scope, OrderHistoriesFactory) {

    OrderHistoriesFactory.fetchAll()
    .then(function (userOrdersArr) {

        userOrdersArr.paidItems.forEach(function(arr, i){
            arr.date = userOrdersArr.date[i].substr(0,10);
        })
        
        $scope.userOrders = userOrdersArr.paidItems;
    })
    .catch($log);
    
});
