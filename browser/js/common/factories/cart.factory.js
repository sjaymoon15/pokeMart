app.factory('CartFactory', function ($http, $log, $state) {


    var baseUrl = '/api/orders/cart/'
    var CartFactory = {};
    CartFactory.cachedCart = [];
    var getData = res => res.data;

    CartFactory.fetchAllFromCart = function () {
        return $http.get(baseUrl)
        .then(function (response) {
            angular.copy(response.data, CartFactory.cachedCart)
            return CartFactory.cachedCart.sort(function (a,b){
                return b.id - a.id
            });
        })
        .catch($log);
    }

    CartFactory.deleteItem = function(productId){
        return $http.delete(baseUrl + productId)
        .then(function(response){
            angular.copy(response.data, CartFactory.cachedCart)
            return CartFactory.cachedCart;
        })
    }

    CartFactory.checkForDuplicates = function(productId){
        console.log(this.cachedCart)
        var duplicate = this.cachedCart.filter(item => item.productId === productId);
        console.log(duplicate);
        return (duplicate.length) ? duplicate[0] : null;
    }

    CartFactory.addToCart = function (productId, quantity) {
        var duplicate = CartFactory.checkForDuplicates(productId);
        if (duplicate) {
            return CartFactory
            .changeQuantity(duplicate.id, duplicate.quantity, 'add' );
        } else {
            return $http.post(baseUrl + productId, {quantity: quantity})
            .then(function (response) {
                var item = response.data;
                CartFactory.cachedCart.push(item);
                return item;
            })
        }
    }

        // return CartFactory.checkForDuplicates(productId)
        // .then(function(resultObj) {
        //     if (resultObj.found){
        //         console.log(resultObj.orderId)
        //         return CartFactory.changeQuantity(resultObj.orderId, resultObj.quantity, 'add' );
        //     }

        //     else {

        //     return $http.post(baseUrl + productId, {quantity: quantity})
        //     .then(function (response) {
        //         var item = response.data;
        //         CartFactory.cachedCart.push(item);
        //         return item;
        //         })
        //      }
        // }).catch($log)

        // }

    CartFactory.removeFromCart=function(orderId){
        return $http.delete(baseUrl+orderId)
        .success(function(){
            CartFactory.removeFromFrontEndCache(orderId)
         })
        .then(function() {
            return CartFactory.cachedCart;
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
            console.log('update quan')
            return $http.put(baseUrl + orderId, {quantity:quantity})
            .then(function(){
                CartFactory.changeFrontEndCacheQuantity(orderId,quantity);
            })
            .catch($log);
        }


    }

    CartFactory.removeFromFrontEndCache = function(orderId){
        var index;
        CartFactory.cachedCart.forEach(function(order,i){
            if (order.id === orderId) index = i;
        })

        CartFactory.cachedCart.splice(index,1);
    }

    CartFactory.changeFrontEndCacheQuantity = function (orderId,quantity) {
        CartFactory.cachedCart.forEach(function(order){
            if (order.id === orderId) {
                order.quantity = quantity;
            }
        })
    }

    CartFactory.checkout = function(){
        return $http.get(baseUrl + 'checkout')
        .success(function() { $state.go('orderHistories') } )
        .catch($log)
    }

    return CartFactory;

});
