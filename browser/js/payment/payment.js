app.config(function ($stateProvider) {
    $stateProvider.state('payment', {
        url: '/payment',
        templateUrl: 'js/payment/payment.html',
        controller:'PaymentCtrl',
        resolve: {
          totalCost: function(CartFactory) { return CartFactory.getTotalCost() },
          arrayOfItems: function(CartFactory) { return CartFactory.fetchAllFromCart() }
        }
    });
});
 