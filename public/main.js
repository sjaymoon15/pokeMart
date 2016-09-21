'use strict';

window.app = angular.module('FullstackGeneratedApp', ['angulike', 'fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ui.materialize', 'angular-input-stars', 'angular-stripe']);

app.config(function ($urlRouterProvider, $locationProvider, $uiViewScrollProvider, stripeProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
    $uiViewScrollProvider.useAnchorScroll();

    // stripeProvider.setPublishableKey('my_key');
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
    $rootScope.facebookAppId = '941038282686242';
});

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, FullstackPics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(FullstackPics);
});

app.controller('AdminCtrl', function ($scope, allUserOrders, $log, allProducts, allUsers, allOrderDetails, ManageOrdersFactory) {

    $scope.products = allProducts;
    $scope.users = allUsers;
    $scope.userOrders = allUserOrders;

    //adding status to each orderDetail
    allOrderDetails.forEach(function (orderDetail) {
        ManageOrdersFactory.findStatus(orderDetail.userOrderId).then(function (status) {
            orderDetail.status = status;
        }).catch($log.error);
    });

    //adding user info to each orderDetail
    allOrderDetails.forEach(function (orderDetail) {
        ManageOrdersFactory.findUser(orderDetail.userOrderId).then(function (user) {
            orderDetail.user = user;
        }).catch($log.error);
    });
    allOrderDetails = allOrderDetails.sort(function (a, b) {
        return a.userOrderId - b.userOrderId;
    });
    allOrderDetails = _.groupBy(allOrderDetails, 'userOrderId');
    $scope.orders = $.map(allOrderDetails, function (order, i) {
        if (i) return [order];
    });
    console.log($scope.orders);
});

app.config(function ($stateProvider) {
    $stateProvider.state('admin', {
        url: '/admin',
        templateUrl: 'js/admin/admin.html',
        controller: 'AdminCtrl',
        resolve: {
            allProducts: function allProducts(ProductFactory) {
                return ProductFactory.fetchAll();
            },
            allUsers: function allUsers(UserFactory) {
                return UserFactory.fetchAll();
            },
            allOrderDetails: function allOrderDetails(ManageOrdersFactory) {
                return ManageOrdersFactory.fetchAll();
            },
            allUserOrders: function allUserOrders(ManageOrdersFactory) {
                return ManageOrdersFactory.fetchAllUserOrders();
            }
        }
    });
});

app.controller('CartCtrl', function ($scope, $log, cartContent, CartFactory) {
    $scope.cartContent = cartContent;

    $scope.remove = function (orderId) {
        CartFactory.removeFromCart(orderId).then(function (newCart) {
            $scope.cartContent = newCart;
        }).catch($log);
    };

    $scope.changeQuantity = function (cartId, quantity, addOrSubtract) {
        CartFactory.changeQuantity(cartId, quantity, addOrSubtract);
        $scope.cartContent = CartFactory.cachedCart;
    };

    $scope.checkout = CartFactory.checkout;

    $scope.total = function () {
        var total = 0;
        cartContent.forEach(function (cart) {
            return total += cart.price * cart.quantity;
        });

        return total;
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('cart', {
        url: '/cart',
        templateUrl: 'js/cart/cart.html',
        controller: 'CartCtrl',
        resolve: {
            cartContent: function cartContent(CartFactory) {

                return CartFactory.fetchAllFromCart();
            }
        }
    });
});

app.controller('CheckoutCtrl', function ($scope, CartFactory) {

    CartFactory.fetchAllFromCart().then(function (items) {
        console.log(items);
        $scope.items = items;

        //calculating total price and put that into $scope.total
        var itemsArr = items;
        var totalPriceEach = [];
        itemsArr.forEach(function (element) {
            totalPriceEach.push(element.price * element.quantity);
        });
        $scope.total = totalPriceEach.reduce(function (prev, curr) {
            return prev + curr;
        });
    });

    $scope.checkout = CartFactory.checkout;
});

app.config(function ($stateProvider) {
    $stateProvider.state('checkout', {
        url: '/checkout',
        templateUrl: 'js/checkout/checkout.html',
        controller: 'CheckoutCtrl'
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', ['angulike', 'fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ui.materialize', 'angular-input-stars', 'angular-stripe']);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

        this.isAdmin = function (user) {
            return user.isAdmin;
        };

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function (sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function () {
            this.id = null;
            this.user = null;
        };
    });
})();

app.controller('OrderHistoriesCtrl', function ($log, $scope, OrderHistoriesFactory) {

    OrderHistoriesFactory.fetchAll().then(function (userOrdersArr) {

        userOrdersArr.paidItems.forEach(function (arr, i) {
            arr.date = new Date(userOrdersArr.date[i]).toString();
        });

        $scope.userOrders = userOrdersArr.paidItems;
    }).catch($log);
});

app.config(function ($stateProvider) {
    $stateProvider.state('orderHistories', {
        url: '/histories',
        templateUrl: 'js/history/orderHistories.html',
        controller: 'OrderHistoriesCtrl'
    });
});

app.directive('animation', function ($state) {
    var animationEndEvents = 'webkitAnimationEnd oanimationend msAnimationEnd animationend';
    var createCharacters = function createCharacters() {
        var characters = {
            ash: ['ash', 'ash-green-bag'],
            others: ['james', 'cassidy', 'jessie']
        };

        function getY() {
            return (Math.random() * 3 + 29).toFixed(2);
        }

        function getZ(y) {
            return Math.floor((20 - y) * 100);
        }

        function randomCharacters(who) {
            return characters[who][Math.floor(Math.random() * characters[who].length)];
        }

        function makeCharacter(who) {

            var xDelay = who === 'ash' ? 4 : 4.8;
            var delay = '-webkit-animation-delay: ' + (Math.random() * 2.7 + xDelay).toFixed(3) + 's;';
            var character = randomCharacters(who);
            var bottom = getY();
            var y = 'bottom: ' + bottom + '%;';
            var z = 'z-index: ' + getZ(bottom) + ';';
            var style = "style='" + delay + " " + y + " " + z + "'";

            return "" + "<i class='" + character + " opening-scene' " + style + ">" + "<i class=" + character + "-right " + "style='" + delay + "'></i>" + "</i>";
        }

        var ash = Math.floor(Math.random() * 16) + 16;
        var others = Math.floor(Math.random() * 8) + 8;

        var horde = '';

        for (var i = 0; i < ash; i++) {
            horde += makeCharacter('ash');
        }

        for (var j = 0; j < others; j++) {
            horde += makeCharacter('others');
        }

        document.getElementById('humans').innerHTML = horde;
    };

    return {
        restrict: 'E',
        template: '<div class="running-animation">' + '<i class="pikachu opening-scene">' + '<i class="pikachu-right"></i>' + '<div class="quote exclamation"></div>' + '</i>' + '<div id="humans"></div>' + '</div>',
        compile: function compile() {
            return {
                pre: function pre() {
                    $('#main').addClass('here');
                    createCharacters();
                },
                post: function post() {

                    $('.opening-scene').addClass('move');
                    $('.move').on(animationEndEvents, function (e) {
                        $state.go('store');
                    });
                }
            };
        },
        scope: function scope() {}
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html'
    });
});

app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });

    $stateProvider.state('reset', {
        url: '/reset',
        templateUrl: 'js/login/reset.html',
        controller: 'LoginCtrl'
    });

    $stateProvider.state('password', {
        url: '/reset/password/:token',
        templateUrl: 'js/login/password.reset.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state, AuthFactory, $stateParams, CartFactory) {

    $scope.login = {};
    $scope.error = null;
    $scope.token = $stateParams.token;

    $scope.forgetPassword = function (email) {
        AuthFactory.forgetPassword(email).then(function () {
            Materialize.toast('Check your email', 1000);
        });
    };
    $scope.resetPassword = function (token, password) {
        AuthFactory.resetPassword(password).then(function () {
            $state.go('store');
        });
    };

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            return CartFactory.fetchAllFromCart();
        }).then(function (cart) {
            $state.go('store');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});

app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function controller($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });
});

app.factory('SecretStash', function ($http) {

    var getStash = function getStash() {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };
});
app.controller('PaymentCtrl', function ($scope, UserFactory, $log, CartFactory, totalCost, arrayOfItems) {
    $scope.info = {};

    $scope.validateUser = function () {

        UserFactory.updateUserBeforePayment($scope.info).then(function () {
            $scope.showCC = true;
        }).catch($log.error);
    };
    $scope.totalCost = totalCost;
    $scope.arrayOfItems = arrayOfItems;
    $scope.stringOfItems = arrayOfItems.map(function (item) {
        return item.title;
    }).join(',');
});
app.config(function ($stateProvider) {
    $stateProvider.state('payment', {
        url: '/payment',
        templateUrl: 'js/payment/payment.html',
        controller: 'PaymentCtrl',
        resolve: {
            totalCost: function totalCost(CartFactory) {
                return CartFactory.getTotalCost();
            },
            arrayOfItems: function arrayOfItems(CartFactory) {
                return CartFactory.fetchAllFromCart();
            }
        }
    });
});

app.controller('ProductCtrl', function ($scope, theProduct, allReviews, ProductFactory, CartFactory) {
    // product
    $scope.newReview = {};
    $scope.product = theProduct;
    $scope.reviews = allReviews;
    // review
    $scope.modalOpen = false;
    $scope.submitReview = function () {
        $scope.newReview.productId = $scope.product.id;
        ProductFactory.createReview($scope.product.id, $scope.newReview).then(function () {
            $scope.reviews = ProductFactory.cachedReviews;
            $scope.newReview = {};
            Materialize.toast('Thank you!', 1000);
        }).catch(function () {
            Materialize.toast('Something went wrong', 1000);
        });
    };
    // add to cart
    $scope.addToCart = function () {
        CartFactory.addToCart($scope.product.id, $scope.quantity).then(function () {
            Materialize.toast('Thank you! Your item was added to your cart!', 1000);
        });
    };
    $scope.arrayMaker = function (num) {
        var arr = [];
        for (var i = 1; i <= num; i++) {
            arr.push(i);
        }
        return arr;
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('product', {
        autoscroll: 'true',
        url: '/products/:productId',
        templateUrl: 'js/product/product.html',
        controller: 'ProductCtrl',
        resolve: {
            theProduct: function theProduct(ProductFactory, $stateParams) {
                return ProductFactory.fetchById($stateParams.productId);
            },
            allReviews: function allReviews(ProductFactory, $stateParams) {
                return ProductFactory.fetchAllReviews($stateParams.productId);
            }
        }
    });
});

// app.controller('ProfileCtrl', function($scope, UserFactory, $log){
// 	UserFactory.userProfileInfo(function(userInfo){
// 			 $scope.userInfo=userInfo;
// 	})

// })

app.controller('ProfileCtrl', function ($scope, UserFactory, $stateParams, $log) {
    alert($stateParams.id, 'whyyy');
    UserFactory.fetchOne($stateParams.id).then(function (user) {
        alert($stateParams.id, 'noo');

        $scope.user = user;
    });
    // .catch(function (err) {
    // 	 alert($stateParams.id); 
    //   console.error('blaaaa',$stateParams.id)
    // });
});
// app.config(function ($stateProvider) {
//     $stateProvider.state('profile', {
//              url: '/profile',
//         templateUrl: 'js/profile/profile.html',
//         controller:'ProfileCtrl'
//         // resolve: {      
//         // profileInfo: function (User, UserFactory) {
//         //         return UserFactory.userProfileInfo();
//         //     },
//         // }
//     });
// });


app.config(function ($stateProvider) {
    $stateProvider.state('user', {
        url: '/users/:id',
        templateUrl: 'js/profile/profile.html',
        controller: 'ProfileCtrl'

    });
});

app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignupCtrl'
    });
});

app.controller('SignupCtrl', function ($scope, AuthFactory, $state) {
    $scope.signup = {};
    $scope.sendSignup = function (signupInfo) {
        AuthFactory.signup(signupInfo).then(function (response) {
            if (response === 'email exists already') {
                Materialize.toast('User already exists', 2000);
            } else if (response === 'not a valid email') {
                Materialize.toast('It is not a valid email', 2000);
            } else {
                Materialize.toast('Go ahead and login', 4000);
                $state.go('login');
            }
        });
    };
    $scope.googleSignup = AuthFactory.googleSignup;
});

app.controller('StoreCtrl', function ($scope, products) {
    $scope.products = products;
});

app.config(function ($stateProvider) {
    $stateProvider.state('store', {
        url: '/store',
        templateUrl: 'js/store/store.html',
        controller: 'StoreCtrl',
        resolve: {
            products: function products(ProductFactory) {
                return ProductFactory.fetchAll();
            }
        }
    });
});

app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('OrderHistoriesFactory', function ($http) {

    var cachedCart = [];
    var baseUrl = '/api/orders/paid/';
    var orderHistoriesFactory = {};
    var getData = function getData(res) {
        return res.data;
    };

    orderHistoriesFactory.fetchAll = function () {
        return $http.get(baseUrl).then(function (response) {
            angular.copy(response.data, cachedCart);
            return cachedCart;
        });
    };

    return orderHistoriesFactory;
});

app.factory('AuthFactory', function ($http) {

    var getData = function getData(res) {
        return res.data;
    };

    var AuthFactory = {};

    AuthFactory.signup = function (signupInfo) {
        return $http.post('/signup', signupInfo).then(getData);
    };

    AuthFactory.googleSignup = function () {
        return $http.get('/auth/google');
    };

    AuthFactory.resetPassword = function (token, login) {
        return $http.post('/reset/password/' + token, login);
    };

    AuthFactory.forgetPassword = function (email) {
        return $http.post('/forgot', email);
    };

    return AuthFactory;
});

app.factory('CartFactory', function ($http, $log, $state, $rootScope) {

    var getData = function getData(res) {
        return res.data;
    };
    var baseUrl = '/api/orders/cart/';
    var convert = function convert(item) {
        item.imageUrl = '/api/products/' + item.productId + '/image';
        return item;
    };
    var CartFactory = {};
    CartFactory.cachedCart = [];

    CartFactory.fetchAllFromCart = function () {
        return $http.get(baseUrl).then(function (response) {
            angular.copy(response.data, CartFactory.cachedCart);
            return CartFactory.cachedCart.sort(function (a, b) {
                return b.id - a.id;
            });
        }).then(function (items) {
            CartFactory.cachedCart = items.map(convert);
            $rootScope.$emit('updateCart', CartFactory.cachedCart);
            return items.map(convert);
        });
    };

    CartFactory.deleteItem = function (productId) {
        return $http.delete(baseUrl + productId).then(function (response) {
            angular.copy(response.data, CartFactory.cachedCart);
            return CartFactory.cachedCart;
        });
    };

    CartFactory.checkForDuplicates = function (productId) {
        var duplicate = this.cachedCart.filter(function (item) {
            return item.productId === productId;
        });
        return duplicate.length ? duplicate[0] : null;
    };

    CartFactory.addToCart = function (productId, quantity) {

        var duplicate = CartFactory.checkForDuplicates(productId);
        if (duplicate) {
            return CartFactory.changeQuantity(duplicate.id, duplicate.quantity, 'add', quantity);
        } else {
            addSuccessAnimation();
            return $http.post(baseUrl + productId, { quantity: quantity }).then(function (response) {
                var item = response.data;
                CartFactory.cachedCart.push(item);
                return item;
            });
            // .then(convert)
        }
    };

    CartFactory.removeFromCart = function (orderId) {
        addRemoveAnimation();
        return $http.delete(baseUrl + orderId).success(function () {
            CartFactory.removeFromFrontEndCache(orderId);
        }).then(function () {
            return CartFactory.cachedCart;
        });
    };
    CartFactory.changeQuantity = function (orderId, quantity, addOrSubtr) {
        var amount = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];

        var runFunc = false;
        if (addOrSubtr === 'add') {
            addSuccessAnimation();
            quantity += +amount;
            runFunc = true;
        } else if (addOrSubtr === 'subtract' && quantity > 1) {
            addRemoveAnimation();
            quantity -= +amount;
            runFunc = true;
        }
        if (runFunc === true) {
            return $http.put(baseUrl + orderId, { quantity: quantity })
            // .then(convert)
            .then(function () {
                CartFactory.changeFrontEndCacheQuantity(orderId, quantity);
            });
        }
    };

    CartFactory.removeFromFrontEndCache = function (orderId) {
        var index;
        CartFactory.cachedCart.forEach(function (order, i) {
            if (order.id === orderId) index = i;
        });

        CartFactory.cachedCart.splice(index, 1);
    };

    CartFactory.changeFrontEndCacheQuantity = function (orderId, quantity) {
        var i = CartFactory.cachedCart.findIndex(function (order) {
            // if (order.id === orderId) {
            //     order.quantity = quantity;
            // }
            return order.id === orderId;
        });
        CartFactory.cachedCart[i].quantity = quantity;
    };

    CartFactory.checkout = function () {
        return $http.get(baseUrl + 'checkout').then(function () {
            $state.go('orderHistories');
            CartFactory.cachedCart.splice(0, CartFactory.cachedCart.length);
        }).catch(function () {
            Materialize.toast('Oops, Something went wrong', 1000);
        });
    };

    CartFactory.getTotalCost = function () {
        var total = 0;
        return CartFactory.fetchAllFromCart().then(function (cart) {
            console.log(cart);
            cart.forEach(function (item) {
                return total += item.price * item.quantity;
            });
            console.log('tota', total);
            return total;
        }).catch($log.error);
    };

    var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

    function addSuccessAnimation() {
        $('#cart-icon').addClass('animated rubberBand').one(animationEnd, function () {
            $('#cart-icon').removeClass('animated rubberBand');
        });
    }

    function addRemoveAnimation() {
        $('#cart-icon').addClass('animated shake').one(animationEnd, function () {
            $('#cart-icon').removeClass('animated shake');
        });
    }

    CartFactory.findOneUserInfo = function () {
        return $http.get(baseUrl + 'checkout');
    };

    return CartFactory;
});

app.factory('ManageOrdersFactory', function ($http) {

    var cachedOrderDetails = [];
    var cachedUserOrders = [];
    var baseUrl = '/api/manageOrders/';
    var manageOrdersFactory = {};
    var getData = function getData(res) {
        return res.data;
    };

    manageOrdersFactory.fetchAll = function () {
        return $http.get(baseUrl).then(function (response) {
            angular.copy(response.data, cachedOrderDetails);
            return cachedOrderDetails;
        });
    };

    manageOrdersFactory.fetchAllUserOrders = function () {
        return $http.get(baseUrl + 'userOrder').then(function (response) {
            angular.copy(response.data, cachedUserOrders);
            return cachedUserOrders;
        });
    };

    manageOrdersFactory.findStatus = function (userOrderId) {
        return $http.get(baseUrl + 'userOrder/' + userOrderId).then(getData);
    };

    manageOrdersFactory.findUser = function (userOrderId) {
        return $http.get(baseUrl + 'user/' + userOrderId).then(getData);
    };

    manageOrdersFactory.updateStatus = function (userOrderId, data) {
        return $http.put(baseUrl + 'userOrder/' + userOrderId, data).then(getData).then(function (userOrder) {
            Materialize.toast("Updated", 1000);
            var updatedInd = cachedUserOrders.findIndex(function (userOrder) {
                return userOrder.id === userOrderId;
            });
            cachedUserOrders[updatedInd] = userOrder;
            return userOrder;
        });
    };
    manageOrdersFactory.deleteUserOrder = function (userOrderId) {
        return $http.delete(baseUrl + 'userOrder/' + userOrderId).success(function () {
            Materialize.toast("Deleted", 1000);
            var deletedInd = cachedUserOrders.findIndex(function (userOrder) {
                return userOrder.id === userOrderId;
            });
            cachedUserOrders.splice(deletedInd, 1);
        });
    };

    return manageOrdersFactory;
});

app.factory('ProductFactory', function ($http) {

    var baseUrl = '/api/products/';
    var getData = function getData(res) {
        return res.data;
    };
    var parseTimeStr = function parseTimeStr(review) {
        var date = review.createdAt.substr(0, 10);
        review.date = date;
        return review;
    };

    var ProductFactory = {};
    ProductFactory.cachedProducts = [];
    ProductFactory.cachedReviews = [];

    ProductFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData).then(function (products) {
            return products.map(ProductFactory.convert);
        }).then(function (products) {
            angular.copy(products, ProductFactory.cachedProducts); // why angular copy alters array order!!!!!!!
            ProductFactory.cachedProducts.sort(function (a, b) {
                return a.id - b.id;
            });
            return ProductFactory.cachedProducts;
        });
    };

    ProductFactory.updateProduct = function (id, data) {
        return $http.put(baseUrl + id, data).then(getData).then(ProductFactory.convert).then(function (product) {
            Materialize.toast('Updated', 1000);
            var updatedInd = ProductFactory.cachedProducts.findIndex(function (product) {
                return product.id === id;
            });
            ProductFactory.cachedProducts[updatedInd] = product;
            return product;
        });
    };

    ProductFactory.deleteProduct = function (id) {
        return $http.delete(baseUrl + id).success(function () {
            Materialize.toast('Deleted', 1000);
            var deletedInd = ProductFactory.cachedProducts.findIndex(function (product) {
                return product.id === id;
            });
            ProductFactory.cachedProducts.splice(deletedInd, 1);
        });
    };

    ProductFactory.fetchById = function (id) {
        return $http.get(baseUrl + id).then(getData).then(ProductFactory.convert);
    };

    ProductFactory.convert = function (product) {
        product.imageUrl = baseUrl + product.id + '/image';
        return product;
    };

    ProductFactory.createReview = function (productId, data) {
        return $http.post('/api/reviews/' + productId, data).then(function (response) {
            var review = parseTimeStr(response.data);
            ProductFactory.cachedReviews.push(review);
            return review;
        });
    };

    ProductFactory.fetchAllReviews = function (productId) {
        return $http.get('/api/reviews/' + productId).then(function (response) {
            angular.copy(response.data, ProductFactory.cachedReviews);
            return ProductFactory.cachedReviews.map(parseTimeStr);
        });
    };

    return ProductFactory;
});

app.factory('UserFactory', function ($http) {
    var UserFactory = {};

    var cachedUsers = [];
    var baseUrl = '/api/users/';
    var getData = function getData(res) {
        return res.data;
    };

    UserFactory.fetchAll = function () {
        return $http.get(baseUrl).then(getData).then(function (users) {
            angular.copy(users, cachedUsers); // why angular copy alters array order!!!!!!!
            cachedUsers.sort(function (a, b) {
                return a.id - b.id;
            });
            return cachedUsers;
        });
    };

    UserFactory.fetchOne = function (id) {
        return $http.get(baseUrl + id).then(function (response) {
            return response.data;
        });
    };

    // UserFactory.findUser=function(id){
    //     return $http.get(baseUrl + id)
    //      .then(getData)
    //     .then(function(user){
    //         console.log('say my nameeeeeee', user)
    //         return user;
    //     })
    // }

    UserFactory.updateUser = function (id, data) {
        return $http.get(baseUrl + id, data).then(getData).then(function (user) {
            var updatedInd = cachedUsers.findIndex(function (user) {
                return user.id === id;
            });
            cachedUsers[updatedInd] = user;
            return user;
        });
    };

    UserFactory.deleteUser = function (id) {
        return $http.delete(baseUrl + id).success(function () {
            var deletedInd = cachedUsers.findIndex(function (user) {
                return user.id === id;
            });
            cachedUsers.splice(deletedInd, 1);
        });
    };

    UserFactory.updateUserBeforePayment = function (infoObj) {
        return $http.get(baseUrl + 'getLoggedInUserId').then(getData).then(function (user) {
            if (user.id === 'session') {
                return $http.put('api/orders/cart/updateSessionCart', infoObj);
            } else {
                return UserFactory.updateUser(user.id, infoObj).then(function () {
                    return $http.put('api/orders/cart/updateUserCart', infoObj);
                });
            }
        });
    };

    // UserFactory.userProfileInfo = function(){
    //     return $http.get(baseUrl + 'getLoggedInUserId')
    //     .then(getData)
    //     .then(function(userInfo){
    //         return userInfo;
    //     })
    // }
    //instead: test:


    return UserFactory;
});

app.directive('shoppingCart', function (CartFactory, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/cart-reveal/cart-reveal.html',
        scope: {
            active: '=',
            addAndRevealCard: '='
        },
        // scope: { setFn: '&' },
        link: function link(scope, elem, attr) {
            scope.showCart = 'checkout';
            CartFactory.fetchAllFromCart().then(function (cart) {
                scope.cart = CartFactory.cachedCart;
            });
            $rootScope.$on('updateCart', function (event, cart) {
                scope.cart = cart;
            });
            scope.revealCart = function () {
                scope.showCart = 'checkout checkout--active';
            };
            scope.hideCart = function () {
                scope.active = 'inactive';
                scope.showCart = 'checkout';
            };
            scope.total = function () {
                var total = 0;
                if (scope.cart) scope.cart.forEach(function (item) {
                    return total += item.price * item.quantity;
                });
                return total;
            };
            // scope.setFn({theDirFn: scope.updateMap});
        }
    };
});

app.controller('FBlike', ['$scope', function ($scope) {
    $scope.myModel = {
        Url: 'http://pokemart-fsa.herokuapp.com',
        Name: "Pokemart",
        ImageUrl: 'http://pokemart-fsa.herokuapp.com'
    };
}]);
angular.module('angulike').directive('fbLike', ['$window', '$rootScope', function ($window, $rootScope) {
    return {
        restrict: 'A',
        controller: 'FBlike',
        scope: {
            fbLike: '=?'
        },
        link: function link(scope, element, attrs) {
            // attrs.fbLike=myModel.Url;
            if (!$window.FB) {
                // Load Facebook SDK if not already loaded
                $.getScript('//connect.facebook.net/en_US/sdk.js', function () {
                    $window.FB.init({
                        appId: $rootScope.facebookAppId,
                        xfbml: true,
                        version: 'v2.0'
                    });
                    renderLikeButton();
                });
            } else {
                renderLikeButton();
            }

            var watchAdded = false;
            function renderLikeButton() {
                if (!!attrs.fbLike && !scope.fbLike && !watchAdded) {
                    // wait for data if it hasn't loaded yet
                    watchAdded = true;
                    var unbindWatch = scope.$watch('fbLike', function (newValue, oldValue) {
                        if (newValue) {
                            renderLikeButton();

                            // only need to run once
                            unbindWatch();
                        }
                    });
                    return;
                } else {
                    element.html('<div class="fb-like"' + (!!scope.fbLike ? ' data-href="' + scope.fbLike + '"' : '') + ' data-layout="button_count" data-action="like" data-show-faces="true" data-share="true"></div>');
                    $window.FB.XFBML.parse(element.parent()[0]);
                }
            }
        }
    };
}]);
app.directive('pinIt', ['$window', '$location', function ($window, $location) {
    return {
        restrict: 'A',
        scope: {
            pinIt: '=',
            pinItImage: '=',
            pinItUrl: '='
        },
        controller: 'PintCtrl',
        link: function link(scope, element, attrs) {
            if (!$window.parsePins) {
                // Load Pinterest SDK if not already loaded
                (function (d) {
                    var f = d.getElementsByTagName('SCRIPT')[0],
                        p = d.createElement('SCRIPT');
                    p.type = 'text/javascript';
                    p.async = true;
                    p.src = '//assets.pinterest.com/js/pinit.js';
                    p['data-pin-build'] = 'parsePins';
                    p.onload = function () {
                        if (!!$window.parsePins) {
                            renderPinItButton();
                        } else {
                            setTimeout(p.onload, 100);
                        }
                    };
                    f.parentNode.insertBefore(p, f);
                })($window.document);
            } else {
                renderPinItButton();
            }

            var watchAdded = false;
            function renderPinItButton() {
                if (!scope.pinIt && !watchAdded) {
                    // wait for data if it hasn't loaded yet
                    watchAdded = true;
                    var unbindWatch = scope.$watch('pinIt', function (newValue, oldValue) {
                        if (newValue) {
                            renderPinItButton();

                            // only need to run once
                            unbindWatch();
                        }
                    });
                    return;
                } else {
                    element.html('<a href="//www.pinterest.com/pin/create/button/?url=' + (scope.pinItUrl || $location.absUrl()) + '&media=' + scope.pinItImage + '&description=' + scope.pinIt + '" data-pin-do="buttonPin" data-pin-config="beside"></a>');
                    $window.parsePins(element.parent()[0]);
                }
            }
        }
    };
}]);
// app.controller('TwitterCtrl', [
//       '$scope', function ($scope) {
//           $scope.myModel = {
//               Url: 'http://pokemart-fsa.herokuapp.com',
//               Name: "Pokemart",
//               ImageUrl: 'http://pokemart-fsa.herokuapp.com'
//           };
//       }
//   ]);    
app.directive('tweet', ['$window', '$location', function ($window, $location) {
    return {
        restrict: 'A',
        scope: {
            tweet: '=',
            tweetUrl: '='
        },
        // controller:'TwitterCtrl',
        link: function link(scope, element, attrs) {
            if (!$window.twttr) {
                // Load Twitter SDK if not already loaded
                $.getScript('//platform.twitter.com/widgets.js', function () {
                    renderTweetButton();
                });
            } else {
                renderTweetButton();
            }

            var watchAdded = false;
            function renderTweetButton() {
                if (!scope.tweet && !watchAdded) {
                    // wait for data if it hasn't loaded yet
                    watchAdded = true;
                    var unbindWatch = scope.$watch('tweet', function (newValue, oldValue) {
                        if (newValue) {
                            renderTweetButton();

                            // only need to run once
                            unbindWatch();
                        }
                    });
                    return;
                } else {
                    element.html('<a href="https://twitter.com/share" class="twitter-share-button" data-text="' + scope.tweet + '" data-url="' + (scope.tweetUrl || $location.absUrl()) + '">Tweet</a>');
                    $window.twttr.widgets.load(element.parent()[0]);
                }
            }
        }
    };
}]);
app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});
'use strict';

app.directive('oauthButton', function () {
    return {
        scope: {
            providerName: '@'
        },
        restrict: 'E',
        templateUrl: '/js/common/directives/oauth-button/oauth-button.html'
    };
});

app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Shop', state: 'store' }];

            scope.toggleLogo = function () {
                $('.pokeball i.great').css('background-position', '-297px -306px');
            };

            scope.untoggleLogo = function () {
                $('.pokeball i.great').css('background-position', '-293px -9px');
            };

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            var setAdmin = function setAdmin() {
                // console.log(AuthInterceptor);
                AuthService.getLoggedInUser().then(function (user) {
                    scope.admin = AuthService.isAdmin(user);
                });
            };

            setUser();
            setAdmin();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});

app.directive('orderEntry', function (ManageOrdersFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/order-entry/order-entry.html',
        scope: {
            orderDetails: '='
        },
        link: function link(s, e, a) {
            console.log(s.orderDetails);
        }
    };
});

app.controller('OrderHistoryCtrl', function ($scope) {});
app.directive('orderHistory', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/order-history/order-history.html',
        scope: {
            histories: '='
        },
        controller: 'OrderHistoryCtrl'

    };
});

app.controller('ProductCardCtrl', function ($scope) {

    $scope.categories = [{ name: 'All' }, { name: 'Fire' }, { name: 'Water' }, { name: 'Grass' }, { name: 'Rock' }, { name: 'Dragon' }, { name: 'Psychic' }, { name: 'Ice' }, { name: 'Normal' }, { name: 'Bug' }, { name: 'Electric' }, { name: 'Ground' }, { name: 'Fairy' }, { name: 'Fighting' }, { name: 'Ghost' }, { name: 'Poison' }];

    $scope.filter = function (category) {
        return function (product) {
            if (!category || category === 'All') return true;else return product.category === category;
        };
    };
    $scope.searchFilter = function (searchingName) {
        return function (product) {
            if (!searchingName) return true;else {
                var len = searchingName.length;
                console.log('product', product.title);
                return product.title.substring(0, len).toLowerCase() == searchingName.toLowerCase();
            }
        };
    };
    $scope.priceRangeFilter = function () {
        var min = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
        var max = arguments.length <= 1 || arguments[1] === undefined ? 2000 : arguments[1];

        return function (product) {
            return product.price >= min && product.price <= max;
        };
    };
    $scope.sortingFunc = function () {
        var sortType = arguments.length <= 0 || arguments[0] === undefined ? "untouched" : arguments[0];

        if (sortType === "untouched") return null;else if (sortType === "low") return 'price';else if (sortType === 'high') return '-price';
    };
});

app.directive('productCard', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/product-card/product-card.html',
        scope: {
            products: '='
        },
        controller: 'ProductCardCtrl'
    };
});

app.directive('productEntry', function (ProductFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/product-entry/product-entry.html',
        scope: {
            product: '=',
            ngModel: '='
        },
        link: function link(scope, elem, attr) {
            scope.submitUpdate = function (id) {
                ProductFactory.updateProduct(id, scope.ngModel);
            };
            scope.deleteProduct = function (id) {
                ProductFactory.deleteProduct(id);
            };
        }
    };
});

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
    };
});
// app.directive('starRating', function () {
//     return {
//       restrict: 'EA',
//       template:
//         '<span class="stars">' +
//          '<div class="stars-filled left">' +
//             '<span>★</span>' +
//          '</div>' +
//       '</span>'
//     };
// })

// app.controller('SearchBarCtrl', function($scope){
// 	$scope.product=
// })
app.directive('searchBar', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/search-bar/search-bar.html',
        controller: 'ProductCardCtrl'
    };
});

app.directive('userEntry', function (UserFactory, AuthFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/user-entry/user-entry.html',
        scope: {
            user: '=',
            ngModel: '='
        },
        link: function link(scope, elem, attr) {
            scope.forgetPassword = function (email) {
                AuthFactory.forgetPassword({ email: email }).then(function () {
                    Materialize.toast('Done', 1000);
                }).catch(function () {
                    Materialize.toast('Oops, something went wrong', 1000);
                });
            };
            scope.deleteUser = function (userId) {
                UserFactory.deleteUser(userId).then(function () {
                    Materialize.toast('Erase from planet Earth', 1000);
                }).catch(function () {
                    Materialize.toast('Oops, something went wrong', 1000);
                });
            };
        }
    };
});

app.directive('userOrder', function (ManageOrdersFactory) {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/user-order/user-order.html',
        scope: {
            userOrder: '=',
            ngModel: '='
        },
        link: function link(scope, elem, attr) {
            scope.updateStatus = function (id) {
                ManageOrdersFactory.updateStatus(id, scope.ngModel);
            };
            scope.deleteUserOrder = function (id) {
                ManageOrdersFactory.deleteUserOrder(id);
            };
        }
    };
});

app.directive('clickAnywhereButHere', function ($document) {
    return {
        restrict: 'A',
        scope: {
            clickAnywhereButHere: '&'
        },
        link: function link(scope, el, attr) {

            $('.logo').on('click', function (e) {
                e.stopPropagation();
            });

            $document.on('click', function (e) {
                if (e.target.id !== 'cart-icon' && e.target.id !== 'add-to-cart-button') {
                    if (el !== e.target && !el[0].contains(e.target)) {
                        scope.$apply(function () {

                            scope.$eval(scope.clickAnywhereButHere);
                        });
                    }
                }
            });
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5jb250cm9sbGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9waW50cmVzdC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yZXZpZXctZW50cnkvc3Rhci1yYXRpbmcuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91dGlsaXR5L2NsaWNrQW55d2hlcmVCdXRIZXJlLmRpcmVjdGl2ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxRQUFBLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBNkJBLGVBQUEsYUFBQSxHQUFBLGlCQUFBO0FBQ0EsQ0F2Q0E7O0FDcEJBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsUUFEQTtBQUVBLG9CQUFBLGlCQUZBO0FBR0EscUJBQUE7QUFIQSxLQUFBO0FBTUEsQ0FUQTs7QUFXQSxJQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTs7QUFFQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEVBQUEsT0FBQSxDQUFBLGFBQUEsQ0FBQTtBQUVBLENBTEE7O0FDVkEsSUFBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQSxlQUFBLEVBQUEsbUJBQUEsRUFBQTs7QUFFQSxXQUFBLFFBQUEsR0FBQSxXQUFBO0FBQ0EsV0FBQSxLQUFBLEdBQUEsUUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLGFBQUE7O0FBRUE7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esd0JBQUEsTUFBQSxHQUFBLE1BQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7O0FBT0E7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxRQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esd0JBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7QUFNQSxzQkFBQSxnQkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsR0FBQSxFQUFBLFdBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxzQkFBQSxFQUFBLE9BQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLE1BQUE7QUFFQSxDQTlCQTs7QUNEQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUNBLEtBREEsQ0FDQSxPQURBLEVBQ0E7QUFDQSxhQUFBLFFBREE7QUFFQSxxQkFBQSxxQkFGQTtBQUdBLG9CQUFBLFdBSEE7QUFJQSxpQkFBQTtBQUNBLHlCQUFBLHFCQUFBLGNBQUEsRUFBQTtBQUNBLHVCQUFBLGVBQUEsUUFBQSxFQUFBO0FBQ0EsYUFIQTtBQUlBLHNCQUFBLGtCQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLFlBQUEsUUFBQSxFQUFBO0FBQ0EsYUFOQTtBQU9BLDZCQUFBLHlCQUFBLG1CQUFBLEVBQUE7QUFDQSx1QkFBQSxvQkFBQSxRQUFBLEVBQUE7QUFDQSxhQVRB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QUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsYUFBQSxFQUFBLEVBQUEsT0FBQTtBQUNBLGdCQUFBLFFBQUEsQ0FBQSxhQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxJQUFBLEVBQUE7QUFDQSxjQUFBLGFBQUEsRUFBQSxFQUFBLEtBQUE7O0FBRUEsZUFBQSxJQUFBLEdBQUEsSUFBQTtBQUNBLEtBTEE7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUVBLENBYkE7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGFBQUEsWUFEQTtBQUVBLHFCQUFBLHlCQUZBO0FBR0Esb0JBQUE7O0FBSEEsS0FBQTtBQU1BLENBUEE7O0FDZEEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGFBQUEsU0FEQTtBQUVBLHFCQUFBLHVCQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBO0FBTUEsQ0FSQTs7QUFVQSxJQUFBLFVBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTtBQUNBLG9CQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxzQkFBQSxFQUFBO0FBQ0EsNEJBQUEsS0FBQSxDQUFBLHFCQUFBLEVBQUEsSUFBQTtBQUNBLGFBRkEsTUFHQSxJQUFBLGFBQUEsbUJBQUEsRUFBQTtBQUNBLDRCQUFBLEtBQUEsQ0FBQSx5QkFBQSxFQUFBLElBQUE7QUFDQSxhQUZBLE1BR0E7QUFDQSw0QkFBQSxLQUFBLENBQUEsb0JBQUEsRUFBQSxJQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLE9BQUE7QUFDQTtBQUNBLFNBWkE7QUFhQSxLQWRBO0FBZUEsV0FBQSxZQUFBLEdBQUEsWUFBQSxZQUFBO0FBQ0EsQ0FsQkE7O0FDVkEsSUFBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFdBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxDQUZBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsUUFEQTtBQUVBLHFCQUFBLHFCQUZBO0FBR0Esb0JBQUEsV0FIQTtBQUlBLGlCQUFBO0FBQ0Esc0JBQUEsa0JBQUEsY0FBQSxFQUFBO0FBQ0EsdUJBQUEsZUFBQSxRQUFBLEVBQUE7QUFDQTtBQUhBO0FBSkEsS0FBQTtBQVVBLENBWEE7O0FDQUEsSUFBQSxPQUFBLENBQUEsZUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBLENBQ0EsdURBREEsRUFFQSxxSEFGQSxFQUdBLGlEQUhBLEVBSUEsaURBSkEsRUFLQSx1REFMQSxFQU1BLHVEQU5BLEVBT0EsdURBUEEsRUFRQSx1REFSQSxFQVNBLHVEQVRBLEVBVUEsdURBVkEsRUFXQSx1REFYQSxFQVlBLHVEQVpBLEVBYUEsdURBYkEsRUFjQSx1REFkQSxFQWVBLHVEQWZBLEVBZ0JBLHVEQWhCQSxFQWlCQSx1REFqQkEsRUFrQkEsdURBbEJBLEVBbUJBLHVEQW5CQSxFQW9CQSx1REFwQkEsRUFxQkEsdURBckJBLEVBc0JBLHVEQXRCQSxFQXVCQSx1REF2QkEsRUF3QkEsdURBeEJBLEVBeUJBLHVEQXpCQSxFQTBCQSx1REExQkEsQ0FBQTtBQTRCQSxDQTdCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSx1QkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsYUFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLG1CQUFBO0FBQ0EsUUFBQSx3QkFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSwwQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxVQUFBO0FBQ0EsbUJBQUEsVUFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBVUEsV0FBQSxxQkFBQTtBQUVBLENBbkJBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLFFBQUEsY0FBQSxFQUFBOztBQUdBLGdCQUFBLE1BQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsY0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxhQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxxQkFBQSxLQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxLQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLFdBQUEsV0FBQTtBQUNBLENBeEJBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBO0FBQ0EsUUFBQSxVQUFBLG1CQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQSxDQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsUUFBQSxHQUFBLG1CQUFBLEtBQUEsU0FBQSxHQUFBLFFBQUE7QUFDQSxlQUFBLElBQUE7QUFDQSxLQUhBO0FBSUEsUUFBQSxjQUFBLEVBQUE7QUFDQSxnQkFBQSxVQUFBLEdBQUEsRUFBQTs7QUFFQSxnQkFBQSxnQkFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLFNBTkEsRUFPQSxJQVBBLENBT0EsVUFBQSxLQUFBLEVBQUE7QUFDQSx3QkFBQSxVQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsdUJBQUEsS0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxTQVhBLENBQUE7QUFZQSxLQWJBOztBQWVBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsZ0JBQUEsa0JBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsWUFBQSxLQUFBLFVBQUEsQ0FBQSxN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RUFLQSxLQUxBLENBS0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSw0QkFBQSxFQUFBLElBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLGdCQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUE7QUFDQSxlQUFBLFlBQUEsZ0JBQUEsR0FDQSxJQURBLENBQ0EsVUFBQSxJQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsSUFBQTtBQUNBLGlCQUFBLE9BQUEsQ0FBQTtBQUFBLHVCQUFBLFNBQUEsS0FBQSxLQUFBLEdBQUEsS0FBQSxRQUFBO0FBQUEsYUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQTtBQUNBLG1CQUFBLEtBQUE7QUFDQSxTQU5BLEVBT0EsS0FQQSxDQU9BLEtBQUEsS0FQQSxDQUFBO0FBUUEsS0FWQTs7QUFhQSxRQUFBLGVBQUEsOEVBQUE7O0FBRUEsYUFBQSxtQkFBQSxHQUFBO0FBQ0EsVUFBQSxZQUFBLEVBQUEsUUFBQSxDQUFBLHFCQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsV0FBQSxDQUFBLHFCQUFBO0FBQ0EsU0FGQTtBQUdBOztBQUlBLGFBQUEsa0JBQUEsR0FBQTtBQUNBLFVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxnQkFBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLGNBQUEsWUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLFNBRkE7QUFHQTs7QUFFQSxnQkFBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLFdBQUEsV0FBQTtBQUVBLENBM0pBOztBQ0FBLElBQUEsT0FBQSxDQUFBLHFCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxxQkFBQSxFQUFBO0FBQ0EsUUFBQSxtQkFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLG9CQUFBO0FBQ0EsUUFBQSxzQkFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSx3QkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxrQkFBQTtBQUNBLG1CQUFBLGtCQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSx3QkFBQSxrQkFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxnQkFBQTtBQUNBLG1CQUFBLGdCQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSx3QkFBQSxVQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxDQUFBO0FBRUEsS0FIQTs7QUFLQSx3QkFBQSxRQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsT0FBQSxHQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxDQUFBO0FBRUEsS0FIQTs7QUFLQSx3QkFBQSxZQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxpQkFBQSxTQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx1QkFBQSxVQUFBLEVBQUEsS0FBQSxXQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsNkJBQUEsVUFBQSxJQUFBLFNBQUE7QUFDQSxtQkFBQSxTQUFBO0FBQ0EsU0FUQSxDQUFBO0FBVUEsS0FYQTtBQVlBLHdCQUFBLGVBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUNBLE9BREEsQ0FDQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxpQkFBQSxTQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx1QkFBQSxVQUFBLEVBQUEsS0FBQSxXQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsNkJBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFXQSxXQUFBLG1CQUFBO0FBRUEsQ0EzREE7O0FDQUEsSUFBQSxPQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFHQSxRQUFBLFVBQUEsZ0JBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBO0FBQ0EsUUFBQSxlQUFBLFNBQUEsWUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsT0FBQSxPQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxlQUFBLE1BQUE7QUFDQSxLQUpBOztBQU1BLFFBQUEsaUJBQUEsRUFBQTtBQUNBLG1CQUFBLGNBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsYUFBQSxHQUFBLEVBQUE7O0FBRUEsbUJBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsR0FBQSxDQUFBLGVBQUEsT0FBQSxDQUFBO0FBQ0EsU0FIQSxFQUdBLElBSEEsQ0FHQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsZUFBQSxjQUFBLEVBREEsQ0FDQTtBQUNBLDJCQUFBLGNBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLGVBQUEsY0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7O0FBYUEsbUJBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLGVBQUEsT0FGQSxFQUdBLElBSEEsQ0FHQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsZUFBQSxjQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDJCQUFBLGNBQUEsQ0FBQSxVQUFBLElBQUEsT0FBQTtBQUNBLG1CQUFBLE9BQUE7QUFDQSxTQVZBLENBQUE7QUFXQSxLQVpBOztBQWNBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FOQSxDQUFBO0FBT0EsS0FSQTs7QUFVQSxtQkFBQSxTQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLGVBQUEsT0FGQSxDQUFBO0FBSUEsS0FMQTs7QUFPQSxtQkFBQSxPQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxnQkFBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxPQUFBO0FBQ0EsS0FIQTs7QUFLQSxtQkFBQSxZQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxrQkFBQSxTQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLFNBQUEsYUFBQSxTQUFBLElBQUEsQ0FBQTtBQUNBLDJCQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQTtBQUNBLG1CQUFBLE1BQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBBOztBQVNBLG1CQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsa0JBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxlQUFBLGFBQUE7QUFDQSxtQkFBQSxlQUFBLGFBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxXQUFBLGNBQUE7QUFFQSxDQW5GQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLGNBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxhQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxXQUFBLEVBREEsQ0FDQTtBQUNBLHdCQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsV0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLElBQUE7QUFDQSxTQUhBLENBQUE7QUFLQSxLQU5BOztBQVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxVQUFBLElBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFDQSxTQVJBLENBQUE7QUFTQSxLQVZBOztBQVlBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLFlBQUE7QUFDQSxnQkFB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QSxPQUFBLEVBSEEsRUFJQSxFQUFBLE1BQUEsT0FBQSxFQUpBLEVBS0EsRUFBQSxNQUFBLE1BQUEsRUFMQSxFQU1BLEVBQUEsTUFBQSxRQUFBLEVBTkEsRUFPQSxFQUFBLE1BQUEsU0FBQSxFQVBBLEVBUUEsRUFBQSxNQUFBLEtBQUEsRUFSQSxFQVNBLEVBQUEsTUFBQSxRQUFBLEVBVEEsRUFVQSxFQUFBLE1BQUEsS0FBQSxFQVZBLEVBV0EsRUFBQSxNQUFBLFVBQUEsRUFYQSxFQVlBLEVBQUEsTUFBQSxRQUFBLEVBWkEsRUFhQSxFQUFBLE1BQUEsT0FBQSxFQWJBLEVBY0EsRUFBQSxNQUFBLFVBQUEsRUFkQSxFQWVBLEVBQUEsTUFBQSxPQUFBLEVBZkEsRUFnQkEsRUFBQSxNQUFBLFFBQUEsRUFoQkEsQ0FBQTs7QUFtQkEsV0FBQSxNQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLElBQUEsYUFBQSxLQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQSxPQUFBLFFBQUEsUUFBQSxLQUFBLFFBQUE7QUFDQSxTQUhBO0FBSUEsS0FMQTtBQU1BLFdBQUEsWUFBQSxHQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsYUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBLEtBQ0E7QUFDQSxvQkFBQSxNQUFBLGNBQUEsTUFBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsUUFBQSxLQUFBO0FBQ0EsdUJBQUEsUUFBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsV0FBQSxNQUFBLGNBQUEsV0FBQSxFQUFBO0FBQ0E7QUFFQSxTQVJBO0FBU0EsS0FWQTtBQVdBLFdBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQUEsWUFBQSxHQUFBLHlEQUFBLENBQUE7QUFBQSxZQUFBLEdBQUEseURBQUEsSUFBQTs7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0Es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IiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydhbmd1bGlrZScsICdmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICd1aS5tYXRlcmlhbGl6ZScsICdhbmd1bGFyLWlucHV0LXN0YXJzJywnYW5ndWxhci1zdHJpcGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICR1aVZpZXdTY3JvbGxQcm92aWRlcixzdHJpcGVQcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xuICAgICR1aVZpZXdTY3JvbGxQcm92aWRlci51c2VBbmNob3JTY3JvbGwoKTtcblxuICAgIC8vIHN0cmlwZVByb3ZpZGVyLnNldFB1Ymxpc2hhYmxlS2V5KCdteV9rZXknKTtcblxufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgJHJvb3RTY29wZS5mYWNlYm9va0FwcElkID0gJzk0MTAzODI4MjY4NjI0Mic7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsIlxuYXBwLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIGFsbFVzZXJPcmRlcnMsICRsb2csIGFsbFByb2R1Y3RzLCBhbGxVc2VycywgYWxsT3JkZXJEZXRhaWxzLCBNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0cztcbiAgICAkc2NvcGUudXNlcnMgPSBhbGxVc2VycztcbiAgICAkc2NvcGUudXNlck9yZGVycyA9IGFsbFVzZXJPcmRlcnM7XG5cbiAgICAvL2FkZGluZyBzdGF0dXMgdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyhvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnN0YXR1cyA9IHN0YXR1cztcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG5cbiAgICAvL2FkZGluZyB1c2VyIGluZm8gdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwudXNlciA9IHVzZXI7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuICAgIGFsbE9yZGVyRGV0YWlscyA9IGFsbE9yZGVyRGV0YWlscy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLnVzZXJPcmRlcklkIC0gYi51c2VyT3JkZXJJZDtcbiAgICB9KTtcbiAgICBhbGxPcmRlckRldGFpbHMgPSBfLmdyb3VwQnkoYWxsT3JkZXJEZXRhaWxzLCAndXNlck9yZGVySWQnKVxuICAgICRzY29wZS5vcmRlcnMgPSAkLm1hcChhbGxPcmRlckRldGFpbHMsZnVuY3Rpb24gKG9yZGVyLCBpKSB7XG4gICAgICAgIGlmIChpKSByZXR1cm4gW29yZGVyXTtcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCRzY29wZS5vcmRlcnMpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FkbWluJywge1xuICAgICAgICB1cmw6ICcvYWRtaW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkbWluL2FkbWluLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWRtaW5DdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxsUHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJzOiBmdW5jdGlvbiAoVXNlckZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbE9yZGVyRGV0YWlsczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyT3JkZXJzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59KVxuIiwiIGFwcC5jb250cm9sbGVyKCdDYXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGxvZywgY2FydENvbnRlbnQsIENhcnRGYWN0b3J5KXtcbiBcdCRzY29wZS5jYXJ0Q29udGVudD1jYXJ0Q29udGVudDtcblxuIFx0JHNjb3BlLnJlbW92ZT0gZnVuY3Rpb24ob3JkZXJJZCkge1xuIFx0XHRDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydChvcmRlcklkKVxuIFx0XHQudGhlbihmdW5jdGlvbihuZXdDYXJ0KXtcbiBcdFx0XHQkc2NvcGUuY2FydENvbnRlbnQgPSBuZXdDYXJ0O1xuIFx0XHR9KS5jYXRjaCgkbG9nKVxuIFx0fVxuXG4gXHQkc2NvcGUuY2hhbmdlUXVhbnRpdHk9IGZ1bmN0aW9uIChjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5KGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpO1xuICAgICAgICAkc2NvcGUuY2FydENvbnRlbnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgIH07XG5cbiAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbiAgJHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvdGFsID0gMDtcbiAgICBjYXJ0Q29udGVudC5mb3JFYWNoKGNhcnQgPT4gdG90YWwgKz0gKGNhcnQucHJpY2UgKiBjYXJ0LnF1YW50aXR5KSlcblxuICAgIHJldHVybiB0b3RhbDsgIFxuICB9XG4gfSlcblxuICIsIiBcbiBhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiBcdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjYXJ0Jywge1xuIFx0XHR1cmw6Jy9jYXJ0JyxcbiBcdFx0dGVtcGxhdGVVcmw6J2pzL2NhcnQvY2FydC5odG1sJyxcbiBcdFx0Y29udHJvbGxlcjonQ2FydEN0cmwnLFxuIFx0XHRyZXNvbHZlOntcbiBcdFx0XHRjYXJ0Q29udGVudDpmdW5jdGlvbihDYXJ0RmFjdG9yeSl7XG5cbiBcdFx0XHRcdHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCk7XG5cbiBcdFx0XHR9XG4gXHRcdH1cbiBcdH0pXG4gfSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAiLCJhcHAuY29udHJvbGxlcignQ2hlY2tvdXRDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQ2FydEZhY3RvcnkpIHtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICBjb25zb2xlLmxvZyhpdGVtcylcbiAgICAgICAgJHNjb3BlLml0ZW1zID0gaXRlbXM7XG5cbiAgXHRcdFx0Ly9jYWxjdWxhdGluZyB0b3RhbCBwcmljZSBhbmQgcHV0IHRoYXQgaW50byAkc2NvcGUudG90YWxcbiAgICAgICAgdmFyIGl0ZW1zQXJyID0gaXRlbXM7XG4gICAgICAgIHZhciB0b3RhbFByaWNlRWFjaCA9IFtdO1xuICAgICAgICBpdGVtc0Fyci5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICBcdHRvdGFsUHJpY2VFYWNoLnB1c2goZWxlbWVudC5wcmljZSAqIGVsZW1lbnQucXVhbnRpdHkpO1xuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUudG90YWwgPSB0b3RhbFByaWNlRWFjaC5yZWR1Y2UoIChwcmV2LCBjdXJyKSA9PiBwcmV2ICsgY3VyciApO1xuICAgIH0pXG5cbiAgICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NoZWNrb3V0Jywge1xuICAgICAgICB1cmw6ICcvY2hlY2tvdXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NoZWNrb3V0L2NoZWNrb3V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ2hlY2tvdXRDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbJ2FuZ3VsaWtlJywgJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7ICAgXG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc0FkbWluID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VyLmlzQWRtaW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3JpZXNDdHJsJywgZnVuY3Rpb24gKCRsb2csICRzY29wZSwgT3JkZXJIaXN0b3JpZXNGYWN0b3J5KSB7XG5cbiAgICBPcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyT3JkZXJzQXJyKSB7XG5cbiAgICAgICAgdXNlck9yZGVyc0Fyci5wYWlkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihhcnIsIGkpe1xuICAgICAgICAgICAgYXJyLmRhdGUgPSBuZXcgRGF0ZSh1c2VyT3JkZXJzQXJyLmRhdGVbaV0pLnRvU3RyaW5nKCk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICAkc2NvcGUudXNlck9yZGVycyA9IHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zO1xuICAgIH0pXG4gICAgLmNhdGNoKCRsb2cpO1xuICAgIFxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ29yZGVySGlzdG9yaWVzJywge1xuICAgICAgICB1cmw6ICcvaGlzdG9yaWVzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9oaXN0b3J5L29yZGVySGlzdG9yaWVzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3JpZXNDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdhbmltYXRpb24nLCBmdW5jdGlvbiAoJHN0YXRlKSB7XG4gICAgdmFyIGFuaW1hdGlvbkVuZEV2ZW50cyA9ICd3ZWJraXRBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBtc0FuaW1hdGlvbkVuZCBhbmltYXRpb25lbmQnO1xuICAgIHZhciBjcmVhdGVDaGFyYWN0ZXJzID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAgICAgICAgYXNoOiBbXG4gICAgICAgICAgICAgICAgJ2FzaCcsXG4gICAgICAgICAgICAgICAgJ2FzaC1ncmVlbi1iYWcnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG90aGVyczogW1xuICAgICAgICAgICAgICAgICdqYW1lcycsXG4gICAgICAgICAgICAgICAgJ2Nhc3NpZHknLFxuICAgICAgICAgICAgICAgICdqZXNzaWUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WSAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCggTWF0aC5yYW5kb20oKSAqIDMgKSArIDI5KS50b0ZpeGVkKDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WiAoeSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDIwIC0geSkgKiAxMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmFuZG9tQ2hhcmFjdGVycyAod2hvKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyc1t3aG9dWyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogY2hhcmFjdGVyc1t3aG9dLmxlbmd0aCApIF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYWtlQ2hhcmFjdGVyICh3aG8pIHtcblxuICAgICAgICAgICAgdmFyIHhEZWxheSA9ICggd2hvID09PSAnYXNoJyApID8gNCA6IDQuODtcbiAgICAgICAgICAgIHZhciBkZWxheSA9ICctd2Via2l0LWFuaW1hdGlvbi1kZWxheTogJyArICggTWF0aC5yYW5kb20oKSAqIDIuNyArIHhEZWxheSApLnRvRml4ZWQoMykgKyAnczsnO1xuICAgICAgICAgICAgdmFyIGNoYXJhY3RlciA9IHJhbmRvbUNoYXJhY3RlcnMoIHdobyApO1xuICAgICAgICAgICAgdmFyIGJvdHRvbSA9IGdldFkoKTtcbiAgICAgICAgICAgIHZhciB5ID0gJ2JvdHRvbTogJysgYm90dG9tICsnJTsnO1xuICAgICAgICAgICAgdmFyIHogPSAnei1pbmRleDogJysgZ2V0WiggYm90dG9tICkgKyAnOyc7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBcInN0eWxlPSdcIitkZWxheStcIiBcIit5K1wiIFwiK3orXCInXCI7XG5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICtcbiAgICAgICAgICAgICAgICBcIjxpIGNsYXNzPSdcIiArIGNoYXJhY3RlciArIFwiIG9wZW5pbmctc2NlbmUnIFwiKyBzdHlsZSArIFwiPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8aSBjbGFzcz1cIiArIGNoYXJhY3RlciArIFwiLXJpZ2h0IFwiICsgXCJzdHlsZT0nXCIrIGRlbGF5ICsgXCInPjwvaT5cIiArXG4gICAgICAgICAgICAgICAgXCI8L2k+XCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXNoID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDE2ICkgKyAxNjtcbiAgICAgICAgdmFyIG90aGVycyA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiA4ICkgKyA4O1xuXG4gICAgICAgIHZhciBob3JkZSA9ICcnO1xuXG4gICAgICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGFzaDsgaSsrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ2FzaCcgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoIHZhciBqID0gMDsgaiA8IG90aGVyczsgaisrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ290aGVycycgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdodW1hbnMnKS5pbm5lckhUTUwgPSBob3JkZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicnVubmluZy1hbmltYXRpb25cIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUgb3BlbmluZy1zY2VuZVwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUtcmlnaHRcIj48L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJxdW90ZSBleGNsYW1hdGlvblwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzwvaT4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiaHVtYW5zXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICBjb21waWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbWFpbicpLmFkZENsYXNzKCdoZXJlJylcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQ2hhcmFjdGVycygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcG9zdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICQoJy5vcGVuaW5nLXNjZW5lJykuYWRkQ2xhc3MoJ21vdmUnKVxuICAgICAgICAgICAgICAgICAgICAkKCcubW92ZScpLm9uKGFuaW1hdGlvbkVuZEV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY29wZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVzZXQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0L3Bhc3N3b3JkLzp0b2tlbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcGFzc3dvcmQucmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBBdXRoRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAkc2NvcGUudG9rZW4gPSAkc3RhdGVQYXJhbXMudG9rZW47XG5cbiAgICAkc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoZW1haWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0NoZWNrIHlvdXIgZW1haWwnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBwYXNzd29yZCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkKHBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ1BheW1lbnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLFVzZXJGYWN0b3J5LCAkbG9nLCBDYXJ0RmFjdG9yeSwgdG90YWxDb3N0LCBhcnJheU9mSXRlbXMpe1xuICAkc2NvcGUuaW5mbyA9IHt9O1xuICBcbiAgJHNjb3BlLnZhbGlkYXRlVXNlcj0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50KCRzY29wZS5pbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuc2hvd0NDID0gdHJ1ZTtcbiAgICAgICAgfSkuY2F0Y2goJGxvZy5lcnJvcilcbiAgICAgICAgXG4gIH1cbiAgJHNjb3BlLnRvdGFsQ29zdCA9IHRvdGFsQ29zdDtcbiAgJHNjb3BlLmFycmF5T2ZJdGVtcyA9IGFycmF5T2ZJdGVtcztcbiAgJHNjb3BlLnN0cmluZ09mSXRlbXMgPSBhcnJheU9mSXRlbXMubWFwKGl0ZW0gPT4gaXRlbS50aXRsZSkuam9pbignLCcpXG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3BheW1lbnQnLCB7XG4gICAgICAgIHVybDogJy9wYXltZW50JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wYXltZW50L3BheW1lbnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1BheW1lbnRDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIHRvdGFsQ29zdDogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCgpIH0sXG4gICAgICAgICAgYXJyYXlPZkl0ZW1zOiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgdGhlUHJvZHVjdCwgYWxsUmV2aWV3cywgUHJvZHVjdEZhY3RvcnksIENhcnRGYWN0b3J5KSB7XG4gICAgLy8gcHJvZHVjdFxuICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAkc2NvcGUucHJvZHVjdCA9IHRoZVByb2R1Y3Q7XG4gICAgJHNjb3BlLnJldmlld3MgPSBhbGxSZXZpZXdzO1xuICAgIC8vIHJldmlld1xuICAgICRzY29wZS5tb2RhbE9wZW4gPSBmYWxzZTtcbiAgICAkc2NvcGUuc3VibWl0UmV2aWV3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubmV3UmV2aWV3LnByb2R1Y3RJZCA9ICRzY29wZS5wcm9kdWN0LmlkO1xuICAgICAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5uZXdSZXZpZXcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnJldmlld3MgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEnLCAxMDAwKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1NvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBhZGQgdG8gY2FydFxuICAgICRzY29wZS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCgkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLnF1YW50aXR5KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEgWW91ciBpdGVtIHdhcyBhZGRlZCB0byB5b3VyIGNhcnQhJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUuYXJyYXlNYWtlciA9IGZ1bmN0aW9uIChudW0pe1xuICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9bnVtOyBpICsrKXtcbiAgICAgICAgICAgIGFyci5wdXNoKGkpXG4gICAgICAgIH0gIFxuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH1cblxufSkgICBcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZHVjdCcsIHtcbiAgICAgICAgYXV0b3Njcm9sbDogJ3RydWUnLFxuICAgICAgICB1cmw6ICcvcHJvZHVjdHMvOnByb2R1Y3RJZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdC9wcm9kdWN0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICB0aGVQcm9kdWN0OiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQoJHN0YXRlUGFyYW1zLnByb2R1Y3RJZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsUmV2aWV3czogZnVuY3Rpb24oUHJvZHVjdEZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbFJldmlld3MoJHN0YXRlUGFyYW1zLnByb2R1Y3RJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIiwiLy8gYXBwLmNvbnRyb2xsZXIoJ1Byb2ZpbGVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJGxvZyl7XG4vLyBcdFVzZXJGYWN0b3J5LnVzZXJQcm9maWxlSW5mbyhmdW5jdGlvbih1c2VySW5mbyl7XG4vLyBcdFx0XHQgJHNjb3BlLnVzZXJJbmZvPXVzZXJJbmZvO1xuLy8gXHR9KVxuXG4vLyB9KVxuXG5hcHAuY29udHJvbGxlcignUHJvZmlsZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGVQYXJhbXMsICRsb2cpe1xuXHQgICBhbGVydCgkc3RhdGVQYXJhbXMuaWQsICd3aHl5eScpOyBcblx0ICAgVXNlckZhY3RvcnkuZmV0Y2hPbmUoJHN0YXRlUGFyYW1zLmlkKVxuICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gIFx0IGFsZXJ0KCRzdGF0ZVBhcmFtcy5pZCwgJ25vbycpOyBcbiAgXHRcbiAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gIH0pXG4gIC8vIC5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gIC8vIFx0IGFsZXJ0KCRzdGF0ZVBhcmFtcy5pZCk7IFxuICAvLyAgIGNvbnNvbGUuZXJyb3IoJ2JsYWFhYScsJHN0YXRlUGFyYW1zLmlkKVxuICAvLyB9KTtcblxufSkiLCIvLyBhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9maWxlJywge1xuLy8gICAgICAgICAgICAgIHVybDogJy9wcm9maWxlJyxcbi8vICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4vLyAgICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJ1xuLy8gICAgICAgICAvLyByZXNvbHZlOiB7ICAgICAgXG4vLyAgICAgICAgIC8vIHByb2ZpbGVJbmZvOiBmdW5jdGlvbiAoVXNlciwgVXNlckZhY3RvcnkpIHtcbi8vICAgICAgICAgLy8gICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXNlclByb2ZpbGVJbmZvKCk7XG4vLyAgICAgICAgIC8vICAgICB9LFxuLy8gICAgICAgICAvLyB9XG4vLyAgICAgfSk7XG4vLyB9KTtcbiAgICAgICAgICAgICAgICBcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcicsIHtcbiAgICAgICAgICAgICB1cmw6ICcvdXNlcnMvOmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJ1xuIFxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuICBhcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhGYWN0b3J5LCAkc3RhdGUpIHtcbiAgICAkc2NvcGUuc2lnbnVwID0ge307IFxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgQXV0aEZhY3Rvcnkuc2lnbnVwKHNpZ251cEluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSAnZW1haWwgZXhpc3RzIGFscmVhZHknKSB7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCAyMDAwKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ25vdCBhIHZhbGlkIGVtYWlsJyl7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0l0IGlzIG5vdCBhIHZhbGlkIGVtYWlsJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0dvIGFoZWFkIGFuZCBsb2dpbicsIDQwMDApO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuXG5cbiIsImFwcC5jb250cm9sbGVyKCdTdG9yZUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBwcm9kdWN0cykge1xuICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzO1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0b3JlJywge1xuICAgICAgICB1cmw6ICcvc3RvcmUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3N0b3JlL3N0b3JlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RvcmVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPcmRlckhpc3Rvcmllc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRDYXJ0ID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvcGFpZC8nXG4gICAgdmFyIG9yZGVySGlzdG9yaWVzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgb3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkQ2FydClcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gXG5cbiAgICByZXR1cm4gb3JkZXJIaXN0b3JpZXNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsICBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIHZhciBBdXRoRmFjdG9yeSA9IHt9O1xuXG5cbiAgICBBdXRoRmFjdG9yeS5zaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hdXRoL2dvb2dsZScpO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LnJlc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodG9rZW4sIGxvZ2luKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvcmVzZXQvcGFzc3dvcmQvJyArIHRva2VuLCBsb2dpbik7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9mb3Jnb3QnLCBlbWFpbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGhGYWN0b3J5O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnQ2FydEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHAsICRsb2csICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvY2FydC8nO1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaXRlbS5pbWFnZVVybCA9ICcvYXBpL3Byb2R1Y3RzLycgKyBpdGVtLnByb2R1Y3RJZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge307XG4gICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IFtdO1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc29ydChmdW5jdGlvbiAoYSxiKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5pZCAtIGEuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1cGRhdGVDYXJ0JywgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmRlbGV0ZUl0ZW0gPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBwcm9kdWN0SWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IHRoaXMuY2FjaGVkQ2FydC5maWx0ZXIoaXRlbSA9PiBpdGVtLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkKTtcbiAgICAgICAgcmV0dXJuIChkdXBsaWNhdGUubGVuZ3RoKSA/IGR1cGxpY2F0ZVswXSA6IG51bGw7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgcXVhbnRpdHkpIHtcbiAgICAgIFxuICAgICAgICB2YXIgZHVwbGljYXRlID0gQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzKHByb2R1Y3RJZCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeVxuICAgICAgICAgICAgLmNoYW5nZVF1YW50aXR5KGR1cGxpY2F0ZS5pZCwgZHVwbGljYXRlLnF1YW50aXR5LCAnYWRkJywgcXVhbnRpdHkgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArIHByb2R1Y3RJZCwge3F1YW50aXR5OiBxdWFudGl0eX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydD1mdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCtvcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpe1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUob3JkZXJJZClcbiAgICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5PWZ1bmN0aW9uKG9yZGVySWQsIHF1YW50aXR5LCBhZGRPclN1YnRyLCBhbW91bnQgPSAxKXtcbiAgICAgICAgdmFyIHJ1bkZ1bmM9ZmFsc2U7XG4gICAgICAgIGlmIChhZGRPclN1YnRyPT09J2FkZCcpIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcXVhbnRpdHkrPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFkZE9yU3VidHI9PT0nc3VidHJhY3QnICYmIHF1YW50aXR5PjEpIHtcbiAgICAgICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICAgICAgcXVhbnRpdHktPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5GdW5jPT09dHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgb3JkZXJJZCwge3F1YW50aXR5OnF1YW50aXR5fSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eShvcmRlcklkLHF1YW50aXR5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUgPSBmdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZvckVhY2goZnVuY3Rpb24ob3JkZXIsaSl7XG4gICAgICAgICAgICBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIGluZGV4ID0gaTtcbiAgICAgICAgfSlcblxuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkgPSBmdW5jdGlvbiAob3JkZXJJZCxxdWFudGl0eSkge1xuICAgICAgICB2YXIgaSA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZmluZEluZGV4KGZ1bmN0aW9uKG9yZGVyKXtcbiAgICAgICAgICAgIC8vIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkge1xuICAgICAgICAgICAgLy8gICAgIG9yZGVyLnF1YW50aXR5ID0gcXVhbnRpdHk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICByZXR1cm4gb3JkZXIuaWQgPT09IG9yZGVySWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0W2ldLnF1YW50aXR5ID0gcXVhbnRpdHlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdvcmRlckhpc3RvcmllcycpO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoMCwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5sZW5ndGgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIFNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBhZGRSZW1vdmVBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgc2hha2UnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICBDYXJ0RmFjdG9yeS5maW5kT25lVXNlckluZm89ZnVuY3Rpb24oKXtcbiAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5wdXNoKHJldmlldyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5O1xuXG59KVxuIiwiYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgIFVzZXJGYWN0b3J5LmZldGNoT25lID0gZnVuY3Rpb24oaWQpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgfSlcbiAgICBcbiAgfVxuXG4gICAgLy8gVXNlckZhY3RvcnkuZmluZFVzZXI9ZnVuY3Rpb24oaWQpe1xuICAgIC8vICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAvLyAgICAgIC50aGVuKGdldERhdGEpXG4gICAgLy8gICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coJ3NheSBteSBuYW1lZWVlZWVlJywgdXNlcilcbiAgICAvLyAgICAgICAgIHJldHVybiB1c2VyO1xuICAgIC8vICAgICB9KVxuICAgIC8vIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnNbdXBkYXRlZEluZF0gPSB1c2VyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgICAgICAgICB9KVxuICAgIH0gIFxuXG4gICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2Vycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50ID0gZnVuY3Rpb24gKGluZm9PYmope1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgICAgIGlmKHVzZXIuaWQgPT09ICdzZXNzaW9uJyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVNlc3Npb25DYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXBkYXRlVXNlcih1c2VyLmlkLGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVVc2VyQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyBVc2VyRmFjdG9yeS51c2VyUHJvZmlsZUluZm8gPSBmdW5jdGlvbigpe1xuICAgIC8vICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgIC8vICAgICAudGhlbihnZXREYXRhKVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbih1c2VySW5mbyl7XG4gICAgLy8gICAgICAgICByZXR1cm4gdXNlckluZm87XG4gICAgLy8gICAgIH0pXG4gICAgLy8gfVxuICAgIC8vaW5zdGVhZDogdGVzdDpcblxuXG4gICAgcmV0dXJuIFVzZXJGYWN0b3J5O1xufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3Nob3BwaW5nQ2FydCcsIGZ1bmN0aW9uKENhcnRGYWN0b3J5LCAkcm9vdFNjb3BlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9jYXJ0LXJldmVhbC9jYXJ0LXJldmVhbC5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGFjdGl2ZTogJz0nLFxuICAgICAgICAgICAgYWRkQW5kUmV2ZWFsQ2FyZDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHNjb3BlOiB7IHNldEZuOiAnJicgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbigndXBkYXRlQ2FydCcsIGZ1bmN0aW9uIChldmVudCwgY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBjYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNjb3BlLnJldmVhbENhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQgY2hlY2tvdXQtLWFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuaGlkZUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuYWN0aXZlID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuY2FydClcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSAqIGl0ZW0ucXVhbnRpdHkpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyBzY29wZS5zZXRGbih7dGhlRGlyRm46IHNjb3BlLnVwZGF0ZU1hcH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbnRyb2xsZXIoJ0ZCbGlrZScsIFtcbiAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4gICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4gICAgICAgICAgICAgIE5hbWU6IFwiUG9rZW1hcnRcIixcbiAgICAgICAgICAgICAgSW1hZ2VVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgXSk7ICAgICIsImFuZ3VsYXIubW9kdWxlKCdhbmd1bGlrZScpXG4gICAgLmRpcmVjdGl2ZSgnZmJMaWtlJywgW1xuICAgICAgICAnJHdpbmRvdycsICckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOidGQmxpa2UnLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIGZiTGlrZTogJz0/J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAvLyBhdHRycy5mYkxpa2U9bXlNb2RlbC5Vcmw7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5GQikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBGYWNlYm9vayBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5pbml0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGZibWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICd2Mi4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9ICAgXG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckxpa2VCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5mYkxpa2UgJiYgIXNjb3BlLmZiTGlrZSAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ2ZiTGlrZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImZiLWxpa2VcIicgKyAoISFzY29wZS5mYkxpa2UgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5mYkxpa2UgKyAnXCInIDogJycpICsgJyBkYXRhLWxheW91dD1cImJ1dHRvbl9jb3VudFwiIGRhdGEtYWN0aW9uPVwibGlrZVwiIGRhdGEtc2hvdy1mYWNlcz1cInRydWVcIiBkYXRhLXNoYXJlPVwidHJ1ZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuWEZCTUwucGFyc2UoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiYXBwLmRpcmVjdGl2ZSgncGluSXQnLCBbXG4gICAgICAgICckd2luZG93JywgJyRsb2NhdGlvbicsXG4gICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBwaW5JdDogJz0nLFxuICAgICAgICAgICAgICAgICAgICBwaW5JdEltYWdlOiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHBpbkl0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6J1BpbnRDdHJsJyxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgUGludGVyZXN0IFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnU0NSSVBUJylbMF0sIHAgPSBkLmNyZWF0ZUVsZW1lbnQoJ1NDUklQVCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuc3JjID0gJy8vYXNzZXRzLnBpbnRlcmVzdC5jb20vanMvcGluaXQuanMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBbJ2RhdGEtcGluLWJ1aWxkJ10gPSAncGFyc2VQaW5zJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHAub25sb2FkLCAxMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHAsIGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSgkd2luZG93LmRvY3VtZW50KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclBpbkl0QnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS5waW5JdCAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ3Bpbkl0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiLy93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPScgKyAoc2NvcGUucGluSXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICcmbWVkaWE9JyArIHNjb3BlLnBpbkl0SW1hZ2UgKyAnJmRlc2NyaXB0aW9uPScgKyBzY29wZS5waW5JdCArICdcIiBkYXRhLXBpbi1kbz1cImJ1dHRvblBpblwiIGRhdGEtcGluLWNvbmZpZz1cImJlc2lkZVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LnBhcnNlUGlucyhlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCIvLyBhcHAuY29udHJvbGxlcignVHdpdHRlckN0cmwnLCBbXG4vLyAgICAgICAnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xuLy8gICAgICAgICAgICRzY29wZS5teU1vZGVsID0ge1xuLy8gICAgICAgICAgICAgICBVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nLFxuLy8gICAgICAgICAgICAgICBOYW1lOiBcIlBva2VtYXJ0XCIsXG4vLyAgICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuLy8gICAgICAgICAgIH07XG4vLyAgICAgICB9XG4vLyAgIF0pOyAgICAiLCJhcHAuZGlyZWN0aXZlKCd0d2VldCcsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgZnVuY3Rpb24gKCR3aW5kb3csICRsb2NhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR3ZWV0OiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHR3ZWV0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNvbnRyb2xsZXI6J1R3aXR0ZXJDdHJsJyxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy50d3R0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBUd2l0dGVyIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL3BsYXRmb3JtLnR3aXR0ZXIuY29tL3dpZGdldHMuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuIFxuICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJUd2VldEJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHdlZXQgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCd0d2VldCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiaHR0cHM6Ly90d2l0dGVyLmNvbS9zaGFyZVwiIGNsYXNzPVwidHdpdHRlci1zaGFyZS1idXR0b25cIiBkYXRhLXRleHQ9XCInICsgc2NvcGUudHdlZXQgKyAnXCIgZGF0YS11cmw9XCInICsgKHNjb3BlLnR3ZWV0VXJsIHx8ICRsb2NhdGlvbi5hYnNVcmwoKSkgKyAnXCI+VHdlZXQ8L2E+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy50d3R0ci53aWRnZXRzLmxvYWQoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7ICAgIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuYXBwLmRpcmVjdGl2ZSgnb2F1dGhCdXR0b24nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHByb3ZpZGVyTmFtZTogJ0AnXG4gICAgfSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnL2pzL2NvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uaHRtbCdcbiAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Nob3AnLCBzdGF0ZTogJ3N0b3JlJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVMb2dvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjk3cHggLTMwNnB4JylcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51bnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjkzcHggLTlweCcpXG5cbiAgICAgICAgICAgIH0gICBcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldEFkbWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEF1dGhJbnRlcmNlcHRvcik7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5hZG1pbiA9IEF1dGhTZXJ2aWNlLmlzQWRtaW4odXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG4gICAgICAgICAgICBzZXRBZG1pbigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdvcmRlckVudHJ5JywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgb3JkZXJEZXRhaWxzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHMsIGUsIGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHMub3JkZXJEZXRhaWxzKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3J5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cdFxufSkiLCJhcHAuZGlyZWN0aXZlKCdvcmRlckhpc3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBoaXN0b3JpZXM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3J5Q3RybCdcbiAgIFxuICAgIH1cblxufSlcbiAgIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0RW50cnknLCBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3Q6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdFVwZGF0ZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIvLyBhcHAuZGlyZWN0aXZlKCdzdGFyUmF0aW5nJywgZnVuY3Rpb24gKCkge1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICByZXN0cmljdDogJ0VBJyxcbi8vICAgICAgIHRlbXBsYXRlOlxuLy8gICAgICAgICAnPHNwYW4gY2xhc3M9XCJzdGFyc1wiPicgK1xuLy8gICAgICAgICAgJzxkaXYgY2xhc3M9XCJzdGFycy1maWxsZWQgbGVmdFwiPicgK1xuLy8gICAgICAgICAgICAgJzxzcGFuPuKYhTwvc3Bhbj4nICtcbi8vICAgICAgICAgICc8L2Rpdj4nICtcbi8vICAgICAgICc8L3NwYW4+J1xuLy8gICAgIH07XG4vLyB9KVxuIiwiIC8vIGFwcC5jb250cm9sbGVyKCdTZWFyY2hCYXJDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcbiAvLyBcdCRzY29wZS5wcm9kdWN0PVxuIC8vIH0pIiwiYXBwLmRpcmVjdGl2ZSgnc2VhcmNoQmFyJywgZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5odG1sJyxcblx0XHRjb250cm9sbGVyOidQcm9kdWN0Q2FyZEN0cmwnXG5cdH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJFbnRyeScsIGZ1bmN0aW9uIChVc2VyRmFjdG9yeSwgQXV0aEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgICAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoe2VtYWlsOiBlbWFpbH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRG9uZScsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAodXNlcklkKSB7XG4gICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIodXNlcklkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0VyYXNlIGZyb20gcGxhbmV0IEVhcnRoJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlck9yZGVyJywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXJPcmRlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsIlxuYXBwLmRpcmVjdGl2ZSgnY2xpY2tBbnl3aGVyZUJ1dEhlcmUnLCBmdW5jdGlvbigkZG9jdW1lbnQpe1xuICByZXR1cm4ge1xuICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgY2xpY2tBbnl3aGVyZUJ1dEhlcmU6ICcmJ1xuICAgICAgICAgICB9LFxuICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsLCBhdHRyKSB7XG5cbiAgICAgICAgICAgICAgICQoJy5sb2dvJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAkZG9jdW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQuaWQgIT09ICdjYXJ0LWljb24nICYmIGUudGFyZ2V0LmlkICE9PSAnYWRkLXRvLWNhcnQtYnV0dG9uJykge1xuICAgICAgICAgICAgICAgICAgIGlmIChlbCAhPT0gZS50YXJnZXQgJiYgIWVsWzBdLmNvbnRhaW5zKGUudGFyZ2V0KSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbChzY29wZS5jbGlja0FueXdoZXJlQnV0SGVyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgfVxuICAgICAgICB9XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
