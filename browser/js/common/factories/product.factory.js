app.factory('ProductFactory', function ($http) {


    var baseUrl = '/api/products/';
    var getData = res => res.data;
    var parseTimeStr = function (review) {
        var date = review.createdAt.substr(0, 10);
        review.date = date;
        return review;
    }

    var ProductFactory = {};
    ProductFactory.cachedProducts = [];
    ProductFactory.cachedReviews = [];

    ProductFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData)
                .then(function (products) {
                    return products.map(ProductFactory.convert);
                }).then(function (products) {
                    angular.copy(products, ProductFactory.cachedProducts); // why angular copy alters array order!!!!!!!
                    ProductFactory.cachedProducts.sort(function (a, b) {
                        return a.id - b.id;
                    })
                    return ProductFactory.cachedProducts;
                })
    };

    ProductFactory.updateProduct = function (id, data) {
        return $http.put(baseUrl + id, data)
                .then(getData)
                .then(ProductFactory.convert)
                .then(function (product) {
                    Materialize.toast('Updated', 1000);
                    var updatedInd = ProductFactory.cachedProducts.findIndex(function (product) {
                        return product.id === id;
                    });
                    ProductFactory.cachedProducts[updatedInd] = product;
                    return product;
                })
    }

    ProductFactory.deleteProduct = function (id) {
        return $http.delete(baseUrl + id).success(function() {
            Materialize.toast('Deleted', 1000);
            var deletedInd = ProductFactory.cachedProducts.findIndex(function (product) {
                return product.id === id;
            });
            ProductFactory.cachedProducts.splice(deletedInd, 1);
        });
    }

    ProductFactory.fetchById = function (id) {
        return $http.get(baseUrl + id)
                .then(getData)
                .then(ProductFactory.convert);

    };

    ProductFactory.convert = function (product) {
        product.imageUrl = baseUrl + product.id + '/image';
        return product;
    };

    ProductFactory.createReview = function (productId, data) {
        return $http.get('/api/users/getLoggedInUserId')
        .then(function (res) {
            var id = res.data.id;
            data.authorId = id;
        })
        .then(function () {
            $http.post('/api/reviews/' + productId, data)
                .then(function (response) {
                    var review = parseTimeStr(response.data);
                    ProductFactory.cachedReviews.push(review);
                    return review;
            });
        });
    }

    ProductFactory.fetchAllReviews = function (productId) {
        return $http.get('/api/reviews/' + productId)
            .then(function (response) {
                angular.copy(response.data, ProductFactory.cachedReviews);
                return ProductFactory.cachedReviews.map(parseTimeStr);
            })
    }

    return ProductFactory;

})
