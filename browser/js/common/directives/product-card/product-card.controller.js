app.controller('ProductCardCtrl', function($scope){
    $scope.categories = [
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

    $scope.filter = function (category) {
        return function (product) {
            if (!category) return true;
            else return product.category === category
        };
    };
})
