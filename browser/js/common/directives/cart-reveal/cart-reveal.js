app.directive('shoppingCart', function(CartFactory, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/cart-reveal/cart-reveal.html',
        scope: {
            // cart: '=',
            active: '='
        },
        link: function (scope, elem, attr) {
            scope.class = 'checkout';
            CartFactory.fetchAllFromCart().then(function (cart) {
                scope.cart = cart;
            })

            scope.revealCart = function () {
                scope.class = 'checkout checkout--active';
            };
            scope.hideCart = function () {
                scope.active = 'inactive';
                scope.class = 'checkout'
            }
            $rootScope.$on('cartEvent', function (events, args) {
                console.log('add to cart')
                CartFactory.fetchAllFromCart().then(function (cart) {
                    scope.cart = cart;
                })
            })
        }
    }
})