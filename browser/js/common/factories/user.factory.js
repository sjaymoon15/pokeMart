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

    return UserFactory;
})
