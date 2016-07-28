app.factory('ProductFactory', function ($http) {

    var baseUrl = '/api/products/';
    var getData = res => res.data;

    var ProductFactory = {};

    ProductFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData)
                .then(function (products) {
                    return products.map(ProductFactory.convert);
                })
    };

    ProductFactory.fetchById = function (id) {
        return $http.get(baseUrl + id)
                .then(getData)
                .then(ProductFactory.convert);

    };

    ProductFactory.convert = function (product) {
        product.imageUrl = '/images/' + product.id + '.png';
        return product;
    };

    return ProductFactory;

})
