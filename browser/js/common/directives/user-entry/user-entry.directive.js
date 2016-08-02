app.directive('userEntry', function (UserFactory, AuthFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/user-entry/user-entry.html',
        scope: {
            user: '=',
            ngModel: '='
        },
        link: function (scope, elem, attr) {
            scope.resetPassword = AuthFactory.resetPassword;
            scope.deleteUser = UserFactory.deleteUser;
        }
    }
})
