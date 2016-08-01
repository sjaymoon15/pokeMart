app.directive('userEntry', function (UserFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/user-entry/user-entry.html',
        scope: {
            user: '=',
            ngModel: '=' //JA-SB: Same as product-card.directive.js
        },
        link: function (scope, elem, attr) {
            scope.update = 'Update';
            scope.delete = 'Delete';
            scope.submitUpdate = function (id) {
                UserFactory.updateUser(id, scope.ngModel)
            };
            scope.deleteProduct = function (id) {
                UserFactory.deleteUser(id)
            };
        }
    }
})
