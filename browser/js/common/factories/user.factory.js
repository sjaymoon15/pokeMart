app.factory('UserFactory', function ($http) {
    var UserFactory = {};

    var cachedUsers = [];
    var baseUrl = '/api/users/';
    var getData = res => res.data;

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


    UserFactory.findUser=function(id){
        return $http.get(baseUrl + id)
         .then(getData)
        .then(function(user){
            console.log('say my nameeeeeee', user)
            return user;
        })
    }

    UserFactory.updateUser = function (id, data) {
        return $http.get(baseUrl + id, data)
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

    return UserFactory;
})
