app.factory('CartFactory', function ($http, $log, $state, $rootScope) {

    var getData = res => res.data;
    var baseUrl = '/api/orders/cart/';
    var convert = function (item) {
        item.imageUrl = '/api/products/' + item.productId + '/image';
        return item;
    }
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
        .then(function (items) {
            CartFactory.cachedCart = items.map(convert);
            $rootScope.$emit('updateCart', CartFactory.cachedCart);
            return items.map(convert);
        })
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
            // .then(convert)
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
    }
    CartFactory.changeQuantity=function(orderId, quantity, addOrSubtr, amount = 1){
        var runFunc=false;
        if (addOrSubtr==='add') {
            addSuccessAnimation()
            quantity+= +amount;
            runFunc=true;
        }
        else if (addOrSubtr==='subtract' && quantity>1) {
            addRemoveAnimation();
            quantity-= +amount;
            runFunc=true;
        }
        if (runFunc===true) {
            return $http.put(baseUrl + orderId, {quantity:quantity})
            // .then(convert)
            .then(function(){
                CartFactory.changeFrontEndCacheQuantity(orderId,quantity);
            })
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
        var i = CartFactory.cachedCart.findIndex(function(order){
            // if (order.id === orderId) {
            //     order.quantity = quantity;
            // }
            return order.id === orderId;
        });
        CartFactory.cachedCart[i].quantity = quantity
    }

    CartFactory.checkout = function(){
        return $http.get(baseUrl + 'checkout')
        .then(function() {
            $state.go('orderHistories');
            CartFactory.cachedCart.splice(0, CartFactory.cachedCart.length);
        })
        .catch(function () {
            Materialize.toast('Oops, Something went wrong', 1000);
        })
    }

    CartFactory.getTotalCost = function(){
        var total = 0;
         return CartFactory.fetchAllFromCart()
            .then(function(cart){
                console.log(cart)
                cart.forEach(item => total += (item.price*item.quantity) )
                console.log('tota', total)
                return total;
            })
            .catch($log.error)
    }


    var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

    function addSuccessAnimation() {
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
