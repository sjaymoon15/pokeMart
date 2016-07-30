app.directive('productEntry', function (ProductFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/product-entry/product-entry.html',
        scope: {
            product: '=',
            ngModel: '='
        },
        link: function (scope, elem, attr) {
            scope.submitUpdate = function (id) {
                ProductFactory.updateProduct(id, scope.ngModel).then(function (updatedProduct) {
                    // check http status
                    // if update fail, notice admin by modal/alert
                })
            };
            scope.deleteProduct = function (id) {
                ProductFactory.deleteProduct(id);
            }
        }
    }
})
