app.factory('ProductFactory', function ($http) {

    var cachedProducts = [];
    var baseUrl = '/api/products/';
    var getData = res => res.data;

    var ProductFactory = {};

    ProductFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData)
                .then(function (products) {
                    return products.map(ProductFactory.convert);
                }).then(function (products) {
                    angular.copy(products, cachedProducts); // why angular copy alters array order!!!!!!!
                    cachedProducts.sort(function (a, b) {
                        return a.id - b.id;
                    })
                    return cachedProducts;
                })
    };

    ProductFactory.updateProduct = function (id, data) {
        return $http.put(baseUrl + id, data)
                .then(getData)
                .then(ProductFactory.convert)
                .then(function (product) {
                    var updatedInd = cachedProducts.findIndex(function (product) {
                        return product.id === id;
                    });
                    cachedProducts[updatedInd] = product;
                    return product;
                })
    }

    ProductFactory.deleteProduct = function (id) {
        return $http.delete(baseUrl + id).success(function() {
            var deletedInd = cachedProducts.findIndex(function (product) {
                return product.id === id;
            });
            cachedProducts.splice(deletedInd, 1);
        })
    }

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
