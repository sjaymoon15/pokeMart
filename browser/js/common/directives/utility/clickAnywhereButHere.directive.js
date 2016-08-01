
app.directive('clickAnywhereButHere', function($document){
  return {
           restrict: 'A',
           scope: {
               clickAnywhereButHere: '&'
           },
           link: function (scope, el, attr) {

               $('.logo').on('click', function(e){
                e.stopPropagation();
               })

         

               $document.on('click', function (e) {
                if (e.target.id !== 'cart-icon' && e.target.id !== 'add-to-cart-button') {
                   if (el !== e.target && !el[0].contains(e.target) ) {
                    console.log(el[0].id)
                        scope.$apply(function () {

                            scope.$eval(scope.clickAnywhereButHere);
                        });
                    }
                  }
               });

           }
        }
});
