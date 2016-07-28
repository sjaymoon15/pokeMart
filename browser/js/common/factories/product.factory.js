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

    ProductFactory.createReview = function (productId, data) {
        return $http.post('/api/reviews/' + productId, data)
            .then(getData); // add a cache for reviews?
    }

    ProductFactory.fetchAllReviews = function (productId) {
        return $http.get('/api/reviews/' + productId).then(getData)
    }

    return ProductFactory;

})
