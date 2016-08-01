app.directive('productEntry', function (ProductFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/product-entry/product-entry.html',
        scope: {
            product: '=',
            ngModel: '=' //JA-SB: Redundant since you have two-way binding with "product"
        },
        link: function (scope, elem, attr) {
            scope.update = 'Update';
            scope.delete = 'Delete';
            scope.submitUpdate = function (id) {
                ProductFactory.updateProduct(id, scope.ngModel)
            };
            scope.deleteProduct = function (id) {
                ProductFactory.deleteProduct(id)
            };
        }
    }
})
