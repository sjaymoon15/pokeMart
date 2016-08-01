app.directive('orderHistory', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/order-history/order-history.html',
        scope: {
            histories: '='
        },
        controller: 'OrderHistoryCtrl' //JA-SB: Controller is empty, do you need it? Why not use a link function?
    }
})
