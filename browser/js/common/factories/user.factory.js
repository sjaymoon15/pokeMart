app.factory('UserFactory', function ($http) {
    var UserFactory = {};
        UserFactory.cachedReviews=[];
    var cachedUsers = [];
    var test=[];
    var baseUrl = '/api/users/';
    var getData = res => res.data;
    var parseTimeStr = function (review) {
        var date = review.createdAt.substr(0, 10);
        review.date = date;
        return review;
    }

    UserFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData)
                .then(function (users) {
                    angular.copy(users, cachedUsers); // why angular copy alters array order!!!!!!!
                    cachedUsers.sort(function (a, b) {
                        return a.id - b.id;
                    })
                    return cachedUsers;
                })
    };
      UserFactory.fetchOne = function() {
         return $http.get(baseUrl + 'getLoggedInUserId')
            .then(getData)
  };

    UserFactory.updateUser = function (id, data) {
        return $http.put(baseUrl + id, data)
                .then(getData)
                .then(function (user) {
                    var updatedInd = cachedUsers.findIndex(function (user) {
                        return user.id === id;
                    });
                    cachedUsers[updatedInd] = user;
                    return user;
                })
    }

    UserFactory.deleteUser = function (id) {
        return $http.delete(baseUrl + id).success(function() {
            var deletedInd = cachedUsers.findIndex(function (user) {
                return user.id === id;
            });
            cachedUsers.splice(deletedInd, 1);
        });
    }

    UserFactory.updateUserBeforePayment = function (infoObj){
        return $http.get(baseUrl + 'getLoggedInUserId')
            .then(getData)
            .then(function(user){
                if(user.id === 'session'){
                return $http.put('api/orders/cart/updateSessionCart', infoObj)
                }
                else{
                return UserFactory.updateUser(user.id,infoObj)
                    .then(function () {
                        return $http.put('api/orders/cart/updateUserCart', infoObj)
                    })
                }
            })
    }


      UserFactory.fetchOneReview = function () {
        return $http.get(baseUrl + 'getLoggedInUserId')
        .then(getData)
          .then(function(user){
            return $http.get('/api/reviews/' + user.id + '/reviews')
            .then(function (response) {
                angular.copy(response.data, UserFactory.cachedReviews);                
                return UserFactory.cachedReviews.map(parseTimeStr);
            })
        })
    }
    return UserFactory;
})

