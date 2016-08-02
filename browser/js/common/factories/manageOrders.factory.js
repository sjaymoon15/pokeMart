app.factory('ManageOrdersFactory', function ($http) {

    var cachedCart = [];
    var baseUrl = '/api/manageOrders/'
    var manageOrdersFactory = {};
    var getData = res => res.data;

    manageOrdersFactory.fetchAll = function () {
        return $http.get(baseUrl)
        .then(function (response) {
            angular.copy(response.data, cachedCart)
            return cachedCart;
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

    return manageOrdersFactory;

});
