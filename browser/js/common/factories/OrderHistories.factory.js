app.factory('OrderHistoriesFactory', function ($http) {

    var cachedCart = [];
    var baseUrl = '/api/orders/paid/'
    var orderHistoriesFactory = {};
    var getData = res => res.data;

    orderHistoriesFactory.fetchAll = function () {
        return $http.get(baseUrl)
            .then(function (response) {
                angular.copy(response.data, cachedCart)
                return cachedCart;
            })
    }

 

    return orderHistoriesFactory;

});
