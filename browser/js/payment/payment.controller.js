// app.controller('PaymentCtrl', function ($scope, $http, stripe) {
//   $scope.charge = function () {
//     console.log($scope.payment)
//     return stripe.card.createToken($scope.payment.card)
//       .then(function (response) {
//         console.log('token created for card ending in ', response.card.last4);
//         var payment = angular.copy($scope.payment);
//         payment.card = void 0;
//         payment.token = response.id;
//         return $http.post('https://yourserver.com/payments', payment);
//       })
//       .then(function (payment) {
//         console.log('successfully submitted payment for $', payment.amount);
//       })
//       .catch(function (err) {
//         if (err.type && /^Stripe/.test(err.type)) {
//           console.log('Stripe error: ', err.message);
//         }
//         else {
//           console.log('Other error occurred, possibly with your API', err.message);
//         }
//       });
//   };
// });