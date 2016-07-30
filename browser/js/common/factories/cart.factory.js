app.factory('CartFactory', function ($http, $log) {

    var cachedCart = [];
    var baseUrl = '/api/orders/cart/'
    var CartFactory = {};
    var getData = res => res.data;

    CartFactory.fetchAllFromCart = function () {
        return $http.get(baseUrl)
            .then(function (response) {
                angular.copy(response.data, cachedCart)
                return cachedCart.sort(function (a,b){
                    return b.id - a.id
                });
            })
              .catch($log);
    }

    CartFactory.addToCart = function (productId, quantity) {
        return $http.post(baseUrl + productId, {quantity: quantity})
            .then(function (response) {
                var item = response.data;
                cachedCart.push(item);
                return item;
            })
              .catch($log);
    }

    CartFactory.removeFromCart=function(orderId){
        return $http.delete(baseUrl+orderId)
        .success(function(){
           CartFactory.removeFromFrontEndCache(orderId) 
        })
        .then(function() {
            return cachedCart;
        })
        .catch($log);
    }
     CartFactory.changeQuantity=function(orderId, quantity, addOrSubtr){
        var runFunc=false;
        if (addOrSubtr==='add') {
            quantity++;
            runFunc=true;
        }
        else if (addOrSubtr==='subtract' && quantity>1) {
            quantity--;
             runFunc=true;
        }
        if (runFunc===true) {
            return $http.put(baseUrl + orderId, {quantity:quantity})
        .then(function(){
            CartFactory.changeFrontEndCacheQuantity(orderId,quantity);
        })
          .catch($log);
        }

      
     }

     CartFactory.removeFromFrontEndCache = function(orderId){
        var index;
        cachedCart.forEach(function(order,i){
            if (order.id === orderId) index = i;
        })

       cachedCart.splice(index,1);        
     }

     CartFactory.changeFrontEndCacheQuantity = function (orderId,quantity) {
        cachedCart.forEach(function(order){
            if (order.id === orderId) {
                order.quantity = quantity;
            }
        })
     }

    return CartFactory;

});
