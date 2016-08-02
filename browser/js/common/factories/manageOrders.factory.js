app.factory('ManageOrdersFactory', function ($http) {

    var cachedOrderDetails = [];
    var cachedUserOrders = [];
    var baseUrl = '/api/manageOrders/'
    var manageOrdersFactory = {};
    var getData = res => res.data;

    manageOrdersFactory.fetchAll = function () {
        return $http.get(baseUrl)
        .then(function (response) {
            angular.copy(response.data, cachedOrderDetails)
            return cachedOrderDetails;
        })
    }

    manageOrdersFactory.fetchAllUserOrders = function(){
        return $http.get(baseUrl+ 'userOrder')
        .then(function(response){
            angular.copy(response.data, cachedUserOrders)
            return cachedUserOrders;
        })
    }

    manageOrdersFactory.findStatus = function(userOrderId){
        return $http.get(baseUrl+ 'userOrder/'+ userOrderId)
        .then(getData)
    }

    manageOrdersFactory.findUser = function(userOrderId){
        return $http.get(baseUrl+ 'user/' + userOrderId)
        .then(getData)
    }

    manageOrdersFactory.updateStatus = function(userOrderId, data){
        return $http.put(baseUrl+ 'userOrder/'+ userOrderId, data)
        .then(getData)
        .then(function(userOrder){
            Materialize.toast("Updated", 1000);
            var updatedInd = cachedUserOrders.findIndex(function (userOrder) {
                        return userOrder.id === userOrderId;
                    });
                    cachedUserOrders[updatedInd] = userOrder;
                    return userOrder;
        })
    }
    manageOrdersFactory.deleteUserOrder = function (userOrderId) {
        return $http.delete(baseUrl+ 'userOrder/'+ userOrderId)
        .success(function() {
            Materialize.toast("Deleted", 1000);
            var deletedInd = cachedUserOrders.findIndex(function (userOrder) {
                return userOrder.id === userOrderId;
            });
            cachedUserOrders.splice(deletedInd, 1);
        });
    }

    return manageOrdersFactory;

});
