app.factory('CartFactory', function ($http, $log, $state) {

    var getData = res => res.data;
    var baseUrl = '/api/orders/cart/';
    var CartFactory = {};
    CartFactory.cachedCart = [];

    CartFactory.fetchAllFromCart = function () {
        return $http.get(baseUrl)
        .then(function (response) {
            angular.copy(response.data, CartFactory.cachedCart)
            return CartFactory.cachedCart.sort(function (a,b){
                return b.id - a.id
            });
        })
        .catch($log);   //JA-SB: Don't want to catch errors here. If a factory method returns a promise to another part of the
                        //application, handle the error there. Also it's $log.error, not $log
    }

    CartFactory.deleteItem = function(productId){
        return $http.delete(baseUrl + productId)
        .then(function(response){
            angular.copy(response.data, CartFactory.cachedCart)
            return CartFactory.cachedCart;
        })
    }

    CartFactory.checkForDuplicates = function(productId){
        var duplicate = this.cachedCart.filter(item => item.productId === productId);
        return (duplicate.length) ? duplicate[0] : null;
    }

    CartFactory.addToCart = function (productId, quantity) {
        var duplicate = CartFactory.checkForDuplicates(productId);
        if (duplicate) {
            return CartFactory
            .changeQuantity(duplicate.id, duplicate.quantity, 'add', quantity );
        } else {
            addSuccessAnimation()
            return $http.post(baseUrl + productId, {quantity: quantity})
            .then(function (response) {
                var item = response.data;
                CartFactory.cachedCart.push(item);
                return item;
            })
        }
    }

    CartFactory.removeFromCart=function(orderId){
        addRemoveAnimation();
        return $http.delete(baseUrl+orderId)
        .success(function(){
            CartFactory.removeFromFrontEndCache(orderId)
         })
        .then(function() {
            return CartFactory.cachedCart;
        })
        .catch($log); //JA-SB: Don't catch here, use $log.error
    }
    CartFactory.changeQuantity=function(orderId, quantity, addOrSubtr, amount = 1){
        var runFunc=false;
        if (addOrSubtr==='add') {
            addSuccessAnimation()
            quantity+= +amount;
            runFunc=true; //JA-SB: Consider refactoring to check for skipping conditions first
        }
        else if (addOrSubtr==='subtract' && quantity>1) {
            addRemoveAnimation();
            quantity-= +amount;
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
        .catch($log) // JA-SB: Don't catch here.
    }


    var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

    function addSuccessAnimation() {    //JA-SB: Does not belong in a factory. Could broadcast event from factory,
                                        //but any change in the DOM should be handled in a controller.
        $('#cart-icon').addClass('animated rubberBand').one(animationEnd, function () {
            $('#cart-icon').removeClass('animated rubberBand');
        })
    }

    function addRemoveAnimation() {
        $('#cart-icon').addClass('animated shake').one(animationEnd, function () {
            $('#cart-icon').removeClass('animated shake');
        })
    }

    return CartFactory;

});
