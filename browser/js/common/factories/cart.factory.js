app.factory('CartFactory', function ($http) {

    var cachedCart = [];
    var baseUrl = '/api/orders/cart/'
    var CartFactory = {};
    var getData = res => res.data;

    CartFactory.fetchAllFromCart = function () {
        return $http.get(baseUrl)
            .then(function (response) {
                angular.copy(response.data, cachedCart)
                return cachedCart;
            })
    }

    CartFactory.addToCart = function (productId, quantity) {
        return $http.post(baseUrl + productId, {quantity: quantity})
            .then(function (response) {
                var item = response.data;
                cachedCart.push(item);
                return item;
            })
    }

    return CartFactory;

});
