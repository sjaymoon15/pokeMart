app.controller('ProductCardCtrl', function($scope){

    //JA-SB: Consider storing in a factory so they can be reused elsewhere.
    $scope.categories = [
        {name: 'All'},
        {name: 'Fire'},
        {name: 'Water'},
        {name: 'Grass'},
        {name: 'Rock'},
        {name: 'Dragon'},
        {name: 'Psychic'},
        {name: 'Ice'},
        {name: 'Normal'},
        {name: 'Bug'},
        {name: 'Electric'},
        {name: 'Ground'},
        {name: 'Fairy'},
        {name: 'Fighting'},
        {name: 'Ghost'},
        {name: 'Poison'}
    ]

    //JA-SB: These filters look great, but try building a custom builder with app.filter that composes all three of these.
    $scope.filter = function (category) {
        return function (product) {
            if (!category || category === 'All') return true
            else return product.category === category
        };
    };
    $scope.searchFilter=function(searchingName) {
        return function (product) {
            if (!searchingName) return true;
            else {
                var len = searchingName.length
                console.log('product', product.title)
                return product.title.substring(0,len).toLowerCase()==searchingName.toLowerCase()
            }

        }
    }
    $scope.priceRangeFilter=function(min=0,max=2000){
        return function(product){
            return product.price>=min && product.price<=max;
        }
    }
    $scope.sortingFunc=function(sortType="untouched"){
        if (sortType==="untouched") return null;
        else if (sortType==="low") return 'price'
        else if (sortType==='high') return '-price'
        }
})

