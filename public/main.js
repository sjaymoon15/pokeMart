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
    UserFactory.fetchOne($stateParams.id).then(function (user) {
        $scope.user = user;
    });
    // .catch(function (err) {
    // $scope.error = 'Unauthorized'
    // console.error(err)
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

app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D', 'Yes, I think we\'ve met before.', 'Gimme 3 mins... I just grabbed this really dope frittata', 'If Cooper could offer only one piece of advice, it would be to nevSQUIRREL!'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
    };
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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9SYW5kb21HcmVldGluZ3MuanMiLCJjb21tb24vZmFjdG9yaWVzL2F1dGguZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvY2FydC5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9tYW5hZ2VPcmRlcnMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvcHJvZHVjdC5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy91c2VyLmZhY3RvcnkuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5jb250cm9sbGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9waW50cmVzdC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Jldmlldy1lbnRyeS9zdGFyLXJhdGluZy5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLWVudHJ5L3VzZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3V0aWxpdHkvY2xpY2tBbnl3aGVyZUJ1dEhlcmUuZGlyZWN0aXZlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLFFBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxVQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLGdCQUFBLEVBQUEscUJBQUEsRUFBQSxnQkFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEscUJBQUEsRUFBQSxjQUFBLEVBQUE7QUFDQTtBQUNBLHNCQUFBLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQSx1QkFBQSxTQUFBLENBQUEsR0FBQTtBQUNBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxLQUZBO0FBR0EsMEJBQUEsZUFBQTs7QUFFQTtBQUVBLENBYkE7O0FBZUE7QUFDQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsSUFBQSxNQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FB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QUNBO0FBQ0E7O0FBRUE7O0FBRUEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxLQUhBO0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFFQSxDQVZBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLFlBREE7QUFFQSxxQkFBQSx5QkFGQTtBQUdBLG9CQUFBOztBQUhBLEtBQUE7QUFNQSxDQVBBOztBQ2RBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLG1CQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxhQUFBLFNBREE7QUFFQSxxQkFBQSx1QkFGQTtBQUdBLG9CQUFBO0FBSEEsS0FBQTtBQU1BLENBUkE7O0FBVUEsSUFBQSxVQUFBLENBQUEsWUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLE1BQUEsR0FBQSxFQUFBO0FBQ0EsV0FBQSxVQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxvQkFBQSxNQUFBLENBQUEsVUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsc0JBQUEsRUFBQTtBQUNBLDRCQUFBLEtBQUEsQ0FBQSxxQkFBQSxFQUFBLElBQUE7QUFDQSxhQUZBLE1BR0EsSUFBQSxhQUFBLG1CQUFBLEVBQUE7QUFDQSw0QkFBQSxLQUFBLENBQUEseUJBQUEsRUFBQSxJQUFBO0FBQ0EsYUFGQSxNQUdBO0FBQ0EsNEJBQUEsS0FBQSxDQUFBLG9CQUFB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QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsYUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEscUJBQUEsS0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFDQSxDQXhCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsVUFBQSxtQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxtQkFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsS0FIQTtBQUlBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsZ0JBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSxTQU5BLEVBT0EsSUFQQSxDQU9BLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsU0FYQSxDQUFBO0FBWUEsS0FiQTs7QUFlQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLGdCQUFBLGtCQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLFlBQUEsS0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBO0FBQUEsbUJBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQTtBQUFBLFNBQUEsQ0FBQTtBQUNBLGVBQUEsVUFBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsWUFBQSxZQUFBLGtCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxZQUNBLGNBREEsQ0FDQSxVQUFBLEVBREEsRUFDQSxVQUFBLFFBREEsRUFDQSxLQURBLEVBQ0EsUUFEQSxDQUFBO0FBRUEsU0FIQSxNQUdBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsT0FBQSxTQUFBLElBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFMQSxDQUFBO0FBTUE7QUFDQTtBQUNBLEtBaEJBOztBQWtCQSxnQkFBQSxjQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxPQUFBLEVBQ0EsT0FEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSx1QkFBQSxDQUFBLE9BQUE7QUFDQSxTQUhBLEVBSUEsSUFKQSxDQUlBLFlBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQU5BLENBQUE7QUFPQSxLQVRBO0FBVUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLEVBQUE7QUFBQSxZQUFBLE1BQUEseURBQUEsQ0FBQTs7QUFDQSxZQUFBLFVBQUEsS0FBQTtBQUNBLFlBQUEsZUFBQSxLQUFBLEVBQUE7QUFDQTtBQUNBLHdCQUFBLENBQUEsTUFBQTtBQUNBLHNCQUFBLElBQUE7QUFDQSxTQUpBLE1BS0EsSUFBQSxlQUFBLFVBQUEsSUFBQSxXQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0Esd0JBQUEsQ0FBQSxNQUFBO0FBQ0Esc0JBQUEsSUFBQTtBQUNBO0FBQ0EsWUFBQSxZQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLEVBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQTtBQURBLGFBRUEsSUFGQSxDQUVBLFlBQUE7QUFDQSw0QkFBQSwyQkFBQSxDQUFBLE9BQUEsRUFBQSxRQUFBO0FBQ0EsYUFKQSxDQUFBO0FBS0E7QUFHQSxLQXJCQTs7QUF1QkEsZ0JBQUEsdUJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsS0FBQTtBQUNBLG9CQUFBLFVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsTUFBQSxFQUFBLEtBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQTtBQUNBLFNBRkE7O0FBSUEsb0JBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLEtBUEE7O0FBU0EsZ0JBQUEsMkJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLElBQUEsWUFBQSxVQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxFQUFBLEtBQUEsT0FBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLG9CQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxLQVJBOztBQVVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFDQSxJQURBLENBQ0EsWUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQSxnQkFBQTtBQUNBLHdCQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLFlBQUEsVUFBQSxDQUFBLE1BQUE7QUFDQSxTQUpBLEVBS0EsS0FMQSxDQUtBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsNEJBQUEsRUFBQSxJQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFXQSxnQkFBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsUUFBQSxDQUFBO0FBQ0EsZUFBQSxZQUFBLGdCQUFBLEdBQ0EsSUFEQSxDQUNBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLElBQUE7QUFDQSxpQkFBQSxPQUFBLENBQUE7QUFBQSx1QkFBQSxTQUFBLEtBQUEsS0FBQSxHQUFBLEtBQUEsUUFBQTtBQUFBLGFBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsTUFBQSxFQUFBLEtBQUE7QUFDQSxtQkFBQSxLQUFBO0FBQ0EsU0FOQSxFQU9BLEtBUEEsQ0FPQSxLQUFBLEtBUEEsQ0FBQTtBQVFBLEtBVkE7O0FBYUEsUUFBQSxlQUFBLDhFQUFBOztBQUVBLGFBQUEsbUJBQUEsR0FBQTtBQUNBLFVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxxQkFBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLGNBQUEsWUFBQSxFQUFBLFdBQUEsQ0FBQSxxQkFBQTtBQUNBLFNBRkE7QUFHQTs7QUFJQSxhQUFBLGtCQUFBLEdBQUE7QUFDQSxVQUFBLFlBQUEsRUFBQSxRQUFBLENBQUEsZ0JBQUEsRUFBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxjQUFBLFlBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxTQUZBO0FBR0E7O0FBRUEsZ0JBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFFQSxDQTNKQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxxQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEscUJBQUEsRUFBQTtBQUNBLFFBQUEsbUJBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxvQkFBQTtBQUNBLFFBQUEsc0JBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsd0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsa0JBQUE7QUFDQSxtQkFBQSxrQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsa0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZ0JBQUE7QUFDQSxtQkFBQSxnQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsVUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsZUFBQSxTQUFBLFlBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsT0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsZUFBQSxNQUFBO0FBQ0EsS0FKQTs7QUFNQSxRQUFBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxjQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsQ0FBQSxlQUFBLE9BQUEsQ0FBQTtBQUNBLFNBSEEsRUFHQSxJQUhBLENBR0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLGVBQUEsY0FBQSxFQURBLENBQ0E7QUFDQSwyQkFBQSxjQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxlQUFBLGNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBOztBQWFBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsRUFHQSxJQUhBLENBR0EsVUFBQSxPQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsVUFBQSxJQUFBLE9BQUE7QUFDQSxtQkFBQSxPQUFBO0FBQ0EsU0FWQSxDQUFBO0FBV0EsS0FaQTs7QUFjQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTkEsQ0FBQTtBQU9BLEtBUkE7O0FBVUEsbUJBQUEsU0FBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsQ0FBQTtBQUlBLEtBTEE7O0FBT0EsbUJBQUEsT0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsT0FBQTtBQUNBLEtBSEE7O0FBS0EsbUJBQUEsWUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsa0JBQUEsU0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxTQUFBLGFBQUEsU0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLE1BQUE7QUFDQSxtQkFBQSxNQUFBO0FBQ0EsU0FMQSxDQUFBO0FBTUEsS0FQQTs7QUFTQSxtQkFBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGtCQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZUFBQSxhQUFBO0FBQ0EsbUJBQUEsZUFBQSxhQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsV0FBQSxjQUFBO0FBRUEsQ0FuRkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxjQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsYUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsV0FBQSxFQURBLENBQ0E7QUFDQSx3QkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLFdBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxJQUFBO0FBQ0EsU0FIQSxDQUFBO0FBSUEsS0FMQTs7QUFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0Esd0JBQUEsVUFBQSxJQUFBLElBQUE7QUFDQSxtQkFBQSxJQUFBO0FBQ0EsU0FSQSxDQUFBO0FBU0EsS0FWQTs7QUFZQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBBOztBQVNBLGdCQUFBLHVCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsbUJBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLEtBQUEsRUFBQSxLQUFBLFNBQUEsRUFBQTtBQUNBLHVCQUFBLE1BQUEsR0FBQSxDQUFBLG1DQUFBLEVBQUEsT0FBQSxDQUFBO0FBQ0EsYUFGQSxNQUdBO0FBQ0EsdUJBQUEsWUFBQSxVQUFBLENBQUEsS0FBQSxFQUFBLEVBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxZQUFBO0FBQ0EsMkJBQUEsTUFBQSxHQUFBLENBQUEsZ0NBQUEsRUFBQSxPQUFBLENBQUE7QUFDQSxpQkFIQSxDQUFBO0FBSUE7QUFDQSxTQVpBLENBQUE7QUFhQSxL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LE9BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLGVBQUE7QUFDQSxhQUZBOztBQU1BLHNCQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsV0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsS0FBQSxvQkFBQSxFQUFBO0FBQ0Esd0JBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQ0EsOEJBQUEsTUFBQSxDQUFBLFlBQUE7O0FBRUEsa0NBQUEsS0FBQSxDQUFBLE1BQUEsb0JBQUE7QUFDQSx5QkFIQTtBQUlBO0FBQ0E7QUFDQSxhQVRBO0FBV0E7QUF4QkEsS0FBQTtBQTBCQSxDQTNCQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIsc3RyaXBlUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbiAgICAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKCk7XG5cbiAgICAvLyBzdHJpcGVQcm92aWRlci5zZXRQdWJsaXNoYWJsZUtleSgnbXlfa2V5Jyk7XG5cbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuICAgICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCA9ICc5NDEwMzgyODI2ODYyNDInO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJcbmFwcC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBhbGxVc2VyT3JkZXJzLCAkbG9nLCBhbGxQcm9kdWN0cywgYWxsVXNlcnMsIGFsbE9yZGVyRGV0YWlscywgTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnByb2R1Y3RzID0gYWxsUHJvZHVjdHM7XG4gICAgJHNjb3BlLnVzZXJzID0gYWxsVXNlcnM7XG4gICAgJHNjb3BlLnVzZXJPcmRlcnMgPSBhbGxVc2VyT3JkZXJzO1xuXG4gICAgLy9hZGRpbmcgc3RhdHVzIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgIFx0XHRvcmRlckRldGFpbC5zdGF0dXMgPSBzdGF0dXM7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuXG4gICAgLy9hZGRpbmcgdXNlciBpbmZvIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnVzZXIgPSB1c2VyO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcbiAgICBhbGxPcmRlckRldGFpbHMgPSBhbGxPcmRlckRldGFpbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYS51c2VyT3JkZXJJZCAtIGIudXNlck9yZGVySWQ7XG4gICAgfSk7XG4gICAgYWxsT3JkZXJEZXRhaWxzID0gXy5ncm91cEJ5KGFsbE9yZGVyRGV0YWlscywgJ3VzZXJPcmRlcklkJylcbiAgICAkc2NvcGUub3JkZXJzID0gJC5tYXAoYWxsT3JkZXJEZXRhaWxzLGZ1bmN0aW9uIChvcmRlciwgaSkge1xuICAgICAgICBpZiAoaSkgcmV0dXJuIFtvcmRlcl07XG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygkc2NvcGUub3JkZXJzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhZG1pbicsIHtcbiAgICAgICAgdXJsOiAnL2FkbWluJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hZG1pbi9hZG1pbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FkbWluQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsbFByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyczogZnVuY3Rpb24gKFVzZXJGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmZldGNoQWxsKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxPcmRlckRldGFpbHM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlck9yZGVyczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufSlcbiIsIiBhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRsb2csIGNhcnRDb250ZW50LCBDYXJ0RmFjdG9yeSl7XG4gXHQkc2NvcGUuY2FydENvbnRlbnQ9Y2FydENvbnRlbnQ7XG5cbiBcdCRzY29wZS5yZW1vdmU9IGZ1bmN0aW9uKG9yZGVySWQpIHtcbiBcdFx0Q2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQob3JkZXJJZClcbiBcdFx0LnRoZW4oZnVuY3Rpb24obmV3Q2FydCl7XG4gXHRcdFx0JHNjb3BlLmNhcnRDb250ZW50ID0gbmV3Q2FydDtcbiBcdFx0fSkuY2F0Y2goJGxvZylcbiBcdH1cblxuIFx0JHNjb3BlLmNoYW5nZVF1YW50aXR5PSBmdW5jdGlvbiAoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eShjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KTtcbiAgICAgICAgJHNjb3BlLmNhcnRDb250ZW50ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICB9O1xuXG4gICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG4gICRzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0b3RhbCA9IDA7XG4gICAgY2FydENvbnRlbnQuZm9yRWFjaChjYXJ0ID0+IHRvdGFsICs9IChjYXJ0LnByaWNlICogY2FydC5xdWFudGl0eSkpXG5cbiAgICByZXR1cm4gdG90YWw7ICBcbiAgfVxuIH0pXG5cbiAiLCIgXG4gYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gXHQkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiBcdFx0dXJsOicvY2FydCcsXG4gXHRcdHRlbXBsYXRlVXJsOidqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gXHRcdGNvbnRyb2xsZXI6J0NhcnRDdHJsJyxcbiBcdFx0cmVzb2x2ZTp7XG4gXHRcdFx0Y2FydENvbnRlbnQ6ZnVuY3Rpb24oQ2FydEZhY3Rvcnkpe1xuXG4gXHRcdFx0XHRyZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpO1xuXG4gXHRcdFx0fVxuIFx0XHR9XG4gXHR9KVxuIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIiwiYXBwLmNvbnRyb2xsZXIoJ0NoZWNrb3V0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIENhcnRGYWN0b3J5KSB7XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coaXRlbXMpXG4gICAgICAgICRzY29wZS5pdGVtcyA9IGl0ZW1zO1xuXG4gIFx0XHRcdC8vY2FsY3VsYXRpbmcgdG90YWwgcHJpY2UgYW5kIHB1dCB0aGF0IGludG8gJHNjb3BlLnRvdGFsXG4gICAgICAgIHZhciBpdGVtc0FyciA9IGl0ZW1zO1xuICAgICAgICB2YXIgdG90YWxQcmljZUVhY2ggPSBbXTtcbiAgICAgICAgaXRlbXNBcnIuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KXtcbiAgICAgICAgXHR0b3RhbFByaWNlRWFjaC5wdXNoKGVsZW1lbnQucHJpY2UgKiBlbGVtZW50LnF1YW50aXR5KTtcbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnRvdGFsID0gdG90YWxQcmljZUVhY2gucmVkdWNlKCAocHJldiwgY3VycikgPT4gcHJldiArIGN1cnIgKTtcbiAgICB9KVxuXG4gICAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjaGVja291dCcsIHtcbiAgICAgICAgdXJsOiAnL2NoZWNrb3V0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jaGVja291dC9jaGVja291dC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NoZWNrb3V0Q3RybCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgWydhbmd1bGlrZScsICdmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICd1aS5tYXRlcmlhbGl6ZScsICdhbmd1bGFyLWlucHV0LXN0YXJzJywnYW5ndWxhci1zdHJpcGUnXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pOyAgIFxuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNBZG1pbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlci5pc0FkbWluO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Jlc2V0Jywge1xuICAgICAgICB1cmw6ICcvcmVzZXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Jlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGFzc3dvcmQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldC9wYXNzd29yZC86dG9rZW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Bhc3N3b3JkLnJlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgQXV0aEZhY3RvcnksICRzdGF0ZVBhcmFtcywgQ2FydEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgJHNjb3BlLnRva2VuID0gJHN0YXRlUGFyYW1zLnRva2VuO1xuXG4gICAgJHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKGVtYWlsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdDaGVjayB5b3VyIGVtYWlsJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgcGFzc3dvcmQpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZChwYXNzd29yZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJGxvZywgQ2FydEZhY3RvcnksIHRvdGFsQ29zdCwgYXJyYXlPZkl0ZW1zKXtcbiAgJHNjb3BlLmluZm8gPSB7fTtcbiAgXG4gICRzY29wZS52YWxpZGF0ZVVzZXI9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUuaW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNob3dDQyA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgICAgIFxuICB9XG4gICRzY29wZS50b3RhbENvc3QgPSB0b3RhbENvc3Q7XG4gICRzY29wZS5hcnJheU9mSXRlbXMgPSBhcnJheU9mSXRlbXM7XG4gICRzY29wZS5zdHJpbmdPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0udGl0bGUpLmpvaW4oJywnKVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXltZW50Jywge1xuICAgICAgICB1cmw6ICcvcGF5bWVudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcGF5bWVudC9wYXltZW50Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQYXltZW50Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB0b3RhbENvc3Q6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QoKSB9LFxuICAgICAgICAgIGFycmF5T2ZJdGVtczogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKSB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHRoZVByb2R1Y3QsIGFsbFJldmlld3MsIFByb2R1Y3RGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuICAgIC8vIHByb2R1Y3RcbiAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgJHNjb3BlLnByb2R1Y3QgPSB0aGVQcm9kdWN0O1xuICAgICRzY29wZS5yZXZpZXdzID0gYWxsUmV2aWV3cztcbiAgICAvLyByZXZpZXdcbiAgICAkc2NvcGUubW9kYWxPcGVuID0gZmFsc2U7XG4gICAgJHNjb3BlLnN1Ym1pdFJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLm5ld1Jldmlldy5wcm9kdWN0SWQgPSAkc2NvcGUucHJvZHVjdC5pZDtcbiAgICAgICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUubmV3UmV2aWV3KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXZpZXdzID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cztcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhJywgMTAwMCk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gYWRkIHRvIGNhcnRcbiAgICAkc2NvcGUuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5xdWFudGl0eSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhIFlvdXIgaXRlbSB3YXMgYWRkZWQgdG8geW91ciBjYXJ0IScsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgJHNjb3BlLmFycmF5TWFrZXIgPSBmdW5jdGlvbiAobnVtKXtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PW51bTsgaSArKyl7XG4gICAgICAgICAgICBhcnIucHVzaChpKVxuICAgICAgICB9ICBcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9XG5cbn0pICAgXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICIsIi8vIGFwcC5jb250cm9sbGVyKCdQcm9maWxlQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgVXNlckZhY3RvcnksICRsb2cpe1xuLy8gXHRVc2VyRmFjdG9yeS51c2VyUHJvZmlsZUluZm8oZnVuY3Rpb24odXNlckluZm8pe1xuLy8gXHRcdFx0ICRzY29wZS51c2VySW5mbz11c2VySW5mbztcbi8vIFx0fSlcblxuLy8gfSlcblxuYXBwLmNvbnRyb2xsZXIoJ1Byb2ZpbGVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCAkbG9nKXtcblVzZXJGYWN0b3J5LmZldGNoT25lKCRzdGF0ZVBhcmFtcy5pZClcbiAgLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgfSlcbiAgLy8gLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAvLyAkc2NvcGUuZXJyb3IgPSAnVW5hdXRob3JpemVkJ1xuICAgIC8vIGNvbnNvbGUuZXJyb3IoZXJyKVxuICAvLyB9KTtcblxufSkiLCIvLyBhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuLy8gICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9maWxlJywge1xuLy8gICAgICAgICAgICAgIHVybDogJy9wcm9maWxlJyxcbi8vICAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4vLyAgICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJ1xuLy8gICAgICAgICAvLyByZXNvbHZlOiB7ICAgICAgXG4vLyAgICAgICAgIC8vIHByb2ZpbGVJbmZvOiBmdW5jdGlvbiAoVXNlciwgVXNlckZhY3RvcnkpIHtcbi8vICAgICAgICAgLy8gICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXNlclByb2ZpbGVJbmZvKCk7XG4vLyAgICAgICAgIC8vICAgICB9LFxuLy8gICAgICAgICAvLyB9XG4vLyAgICAgfSk7XG4vLyB9KTtcbiAgICAgICAgICAgICAgICBcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndXNlcicsIHtcbiAgICAgICAgICAgICB1cmw6ICcvdXNlcnMvOmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJ1xuIFxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuICBhcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhGYWN0b3J5LCAkc3RhdGUpIHtcbiAgICAkc2NvcGUuc2lnbnVwID0ge307IFxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgQXV0aEZhY3Rvcnkuc2lnbnVwKHNpZ251cEluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSAnZW1haWwgZXhpc3RzIGFscmVhZHknKSB7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCAyMDAwKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ25vdCBhIHZhbGlkIGVtYWlsJyl7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0l0IGlzIG5vdCBhIHZhbGlkIGVtYWlsJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0dvIGFoZWFkIGFuZCBsb2dpbicsIDQwMDApO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuXG5cbiIsImFwcC5jb250cm9sbGVyKCdTdG9yZUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBwcm9kdWN0cykge1xuICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzO1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0b3JlJywge1xuICAgICAgICB1cmw6ICcvc3RvcmUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3N0b3JlL3N0b3JlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RvcmVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPcmRlckhpc3Rvcmllc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRDYXJ0ID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvcGFpZC8nXG4gICAgdmFyIG9yZGVySGlzdG9yaWVzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgb3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkQ2FydClcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gXG5cbiAgICByZXR1cm4gb3JkZXJIaXN0b3JpZXNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnLFxuICAgICAgICAnWWVzLCBJIHRoaW5rIHdlXFwndmUgbWV0IGJlZm9yZS4nLFxuICAgICAgICAnR2ltbWUgMyBtaW5zLi4uIEkganVzdCBncmFiYmVkIHRoaXMgcmVhbGx5IGRvcGUgZnJpdHRhdGEnLFxuICAgICAgICAnSWYgQ29vcGVyIGNvdWxkIG9mZmVyIG9ubHkgb25lIHBpZWNlIG9mIGFkdmljZSwgaXQgd291bGQgYmUgdG8gbmV2U1FVSVJSRUwhJyxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsICBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIHZhciBBdXRoRmFjdG9yeSA9IHt9O1xuXG5cbiAgICBBdXRoRmFjdG9yeS5zaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hdXRoL2dvb2dsZScpO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LnJlc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodG9rZW4sIGxvZ2luKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvcmVzZXQvcGFzc3dvcmQvJyArIHRva2VuLCBsb2dpbik7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9mb3Jnb3QnLCBlbWFpbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGhGYWN0b3J5O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnQ2FydEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHAsICRsb2csICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvY2FydC8nO1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaXRlbS5pbWFnZVVybCA9ICcvYXBpL3Byb2R1Y3RzLycgKyBpdGVtLnByb2R1Y3RJZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge307XG4gICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IFtdO1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc29ydChmdW5jdGlvbiAoYSxiKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5pZCAtIGEuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1cGRhdGVDYXJ0JywgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmRlbGV0ZUl0ZW0gPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBwcm9kdWN0SWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IHRoaXMuY2FjaGVkQ2FydC5maWx0ZXIoaXRlbSA9PiBpdGVtLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkKTtcbiAgICAgICAgcmV0dXJuIChkdXBsaWNhdGUubGVuZ3RoKSA/IGR1cGxpY2F0ZVswXSA6IG51bGw7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgcXVhbnRpdHkpIHtcbiAgICAgIFxuICAgICAgICB2YXIgZHVwbGljYXRlID0gQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzKHByb2R1Y3RJZCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeVxuICAgICAgICAgICAgLmNoYW5nZVF1YW50aXR5KGR1cGxpY2F0ZS5pZCwgZHVwbGljYXRlLnF1YW50aXR5LCAnYWRkJywgcXVhbnRpdHkgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArIHByb2R1Y3RJZCwge3F1YW50aXR5OiBxdWFudGl0eX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydD1mdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCtvcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpe1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUob3JkZXJJZClcbiAgICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5PWZ1bmN0aW9uKG9yZGVySWQsIHF1YW50aXR5LCBhZGRPclN1YnRyLCBhbW91bnQgPSAxKXtcbiAgICAgICAgdmFyIHJ1bkZ1bmM9ZmFsc2U7XG4gICAgICAgIGlmIChhZGRPclN1YnRyPT09J2FkZCcpIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcXVhbnRpdHkrPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFkZE9yU3VidHI9PT0nc3VidHJhY3QnICYmIHF1YW50aXR5PjEpIHtcbiAgICAgICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICAgICAgcXVhbnRpdHktPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5GdW5jPT09dHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgb3JkZXJJZCwge3F1YW50aXR5OnF1YW50aXR5fSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eShvcmRlcklkLHF1YW50aXR5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUgPSBmdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZvckVhY2goZnVuY3Rpb24ob3JkZXIsaSl7XG4gICAgICAgICAgICBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIGluZGV4ID0gaTtcbiAgICAgICAgfSlcblxuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkgPSBmdW5jdGlvbiAob3JkZXJJZCxxdWFudGl0eSkge1xuICAgICAgICB2YXIgaSA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZmluZEluZGV4KGZ1bmN0aW9uKG9yZGVyKXtcbiAgICAgICAgICAgIC8vIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkge1xuICAgICAgICAgICAgLy8gICAgIG9yZGVyLnF1YW50aXR5ID0gcXVhbnRpdHk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICByZXR1cm4gb3JkZXIuaWQgPT09IG9yZGVySWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0W2ldLnF1YW50aXR5ID0gcXVhbnRpdHlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdvcmRlckhpc3RvcmllcycpO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoMCwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5sZW5ndGgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIFNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBhZGRSZW1vdmVBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgc2hha2UnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICBDYXJ0RmFjdG9yeS5maW5kT25lVXNlckluZm89ZnVuY3Rpb24oKXtcbiAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5wdXNoKHJldmlldyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5O1xuXG59KVxuIiwiYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgIFVzZXJGYWN0b3J5LmZldGNoT25lID0gZnVuY3Rpb24oaWQpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgfSk7XG4gIH1cblxuICAgIC8vIFVzZXJGYWN0b3J5LmZpbmRVc2VyPWZ1bmN0aW9uKGlkKXtcbiAgICAvLyAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgLy8gICAgICAudGhlbihnZXREYXRhKVxuICAgIC8vICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKCdzYXkgbXkgbmFtZWVlZWVlZScsIHVzZXIpXG4gICAgLy8gICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAvLyAgICAgfSlcbiAgICAvLyB9XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9ICBcblxuICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCA9IGZ1bmN0aW9uIChpbmZvT2JqKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICAgICBpZih1c2VyLmlkID09PSAnc2Vzc2lvbicpe1xuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVTZXNzaW9uQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIodXNlci5pZCxpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlVXNlckNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gVXNlckZhY3RvcnkudXNlclByb2ZpbGVJbmZvID0gZnVuY3Rpb24oKXtcbiAgICAvLyAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAvLyAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAvLyAgICAgLnRoZW4oZnVuY3Rpb24odXNlckluZm8pe1xuICAgIC8vICAgICAgICAgcmV0dXJuIHVzZXJJbmZvO1xuICAgIC8vICAgICB9KVxuICAgIC8vIH1cbiAgICAvL2luc3RlYWQ6IHRlc3Q6XG5cblxuICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbn0pXG4iLCJhcHAuY29udHJvbGxlcignRkJsaWtlJywgW1xuICAgICAgJyRzY29wZScsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbiAgICAgICAgICAkc2NvcGUubXlNb2RlbCA9IHtcbiAgICAgICAgICAgICAgVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJyxcbiAgICAgICAgICAgICAgTmFtZTogXCJQb2tlbWFydFwiLFxuICAgICAgICAgICAgICBJbWFnZVVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbSdcbiAgICAgICAgICB9O1xuICAgICAgfVxuICBdKTsgICAgIiwiYW5ndWxhci5tb2R1bGUoJ2FuZ3VsaWtlJylcbiAgICAuZGlyZWN0aXZlKCdmYkxpa2UnLCBbXG4gICAgICAgICckd2luZG93JywgJyRyb290U2NvcGUnLCBmdW5jdGlvbiAoJHdpbmRvdywgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6J0ZCbGlrZScsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgZmJMaWtlOiAnPT8nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGF0dHJzLmZiTGlrZT1teU1vZGVsLlVybDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LkZCKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIEZhY2Vib29rIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL3Nkay5qcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LkZCLmluaXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBJZDogJHJvb3RTY29wZS5mYWNlYm9va0FwcElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ZmJtbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJ3YyLjAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gICBcbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyTGlrZUJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWF0dHJzLmZiTGlrZSAmJiAhc2NvcGUuZmJMaWtlICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgnZmJMaWtlJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8ZGl2IGNsYXNzPVwiZmItbGlrZVwiJyArICghIXNjb3BlLmZiTGlrZSA/ICcgZGF0YS1ocmVmPVwiJyArIHNjb3BlLmZiTGlrZSArICdcIicgOiAnJykgKyAnIGRhdGEtbGF5b3V0PVwiYnV0dG9uX2NvdW50XCIgZGF0YS1hY3Rpb249XCJsaWtlXCIgZGF0YS1zaG93LWZhY2VzPVwidHJ1ZVwiIGRhdGEtc2hhcmU9XCJ0cnVlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5YRkJNTC5wYXJzZShlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCJhcHAuZGlyZWN0aXZlKCdwaW5JdCcsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgZnVuY3Rpb24gKCR3aW5kb3csICRsb2NhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIHBpbkl0OiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHBpbkl0SW1hZ2U6ICc9JyxcbiAgICAgICAgICAgICAgICAgICAgcGluSXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjonUGludEN0cmwnLFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBQaW50ZXJlc3QgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBkLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdTQ1JJUFQnKVswXSwgcCA9IGQuY3JlYXRlRWxlbWVudCgnU0NSSVBUJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5zcmMgPSAnLy9hc3NldHMucGludGVyZXN0LmNvbS9qcy9waW5pdC5qcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcFsnZGF0YS1waW4tYnVpbGQnXSA9ICdwYXJzZVBpbnMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQocC5vbmxvYWQsIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocCwgZik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KCR3aW5kb3cuZG9jdW1lbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyUGluSXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLnBpbkl0ICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgncGluSXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCIvL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9JyArIChzY29wZS5waW5JdFVybCB8fCAkbG9jYXRpb24uYWJzVXJsKCkpICsgJyZtZWRpYT0nICsgc2NvcGUucGluSXRJbWFnZSArICcmZGVzY3JpcHRpb249JyArIHNjb3BlLnBpbkl0ICsgJ1wiIGRhdGEtcGluLWRvPVwiYnV0dG9uUGluXCIgZGF0YS1waW4tY29uZmlnPVwiYmVzaWRlXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cucGFyc2VQaW5zKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsIi8vIGFwcC5jb250cm9sbGVyKCdUd2l0dGVyQ3RybCcsIFtcbi8vICAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4vLyAgICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4vLyAgICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4vLyAgICAgICAgICAgICAgIE5hbWU6IFwiUG9rZW1hcnRcIixcbi8vICAgICAgICAgICAgICAgSW1hZ2VVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nXG4vLyAgICAgICAgICAgfTtcbi8vICAgICAgIH1cbi8vICAgXSk7ICAgICIsImFwcC5kaXJlY3RpdmUoJ3R3ZWV0JywgW1xuICAgICAgICAnJHdpbmRvdycsICckbG9jYXRpb24nLFxuICAgICAgICBmdW5jdGlvbiAoJHdpbmRvdywgJGxvY2F0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHdlZXQ6ICc9JyxcbiAgICAgICAgICAgICAgICAgICAgdHdlZXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY29udHJvbGxlcjonVHdpdHRlckN0cmwnLFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnR3dHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIFR3aXR0ZXIgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRTY3JpcHQoJy8vcGxhdGZvcm0udHdpdHRlci5jb20vd2lkZ2V0cy5qcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclR3ZWV0QnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS50d2VldCAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ3R3ZWV0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCJodHRwczovL3R3aXR0ZXIuY29tL3NoYXJlXCIgY2xhc3M9XCJ0d2l0dGVyLXNoYXJlLWJ1dHRvblwiIGRhdGEtdGV4dD1cIicgKyBzY29wZS50d2VldCArICdcIiBkYXRhLXVybD1cIicgKyAoc2NvcGUudHdlZXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICdcIj5Ud2VldDwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LnR3dHRyLndpZGdldHMubG9hZChlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsgICAiLCJhcHAuZGlyZWN0aXZlKCdzaG9wcGluZ0NhcnQnLCBmdW5jdGlvbihDYXJ0RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBhY3RpdmU6ICc9JyxcbiAgICAgICAgICAgIGFkZEFuZFJldmVhbENhcmQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICAvLyBzY29wZTogeyBzZXRGbjogJyYnIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ3VwZGF0ZUNhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gY2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzY29wZS5yZXZlYWxDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0IGNoZWNrb3V0LS1hY3RpdmUnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmhpZGVDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmFjdGl2ZSA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICAgICAgICAgIGlmKHNjb3BlLmNhcnQpXG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UgKiBpdGVtLnF1YW50aXR5KSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgLy8gc2NvcGUuc2V0Rm4oe3RoZURpckZuOiBzY29wZS51cGRhdGVNYXB9KTtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Nob3AnLCBzdGF0ZTogJ3N0b3JlJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVMb2dvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjk3cHggLTMwNnB4JylcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51bnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjkzcHggLTlweCcpXG5cbiAgICAgICAgICAgIH0gICBcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldEFkbWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEF1dGhJbnRlcmNlcHRvcik7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5hZG1pbiA9IEF1dGhTZXJ2aWNlLmlzQWRtaW4odXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG4gICAgICAgICAgICBzZXRBZG1pbigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ29hdXRoQnV0dG9uJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBwcm92aWRlck5hbWU6ICdAJ1xuICAgIH0sXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJy9qcy9jb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmh0bWwnXG4gIH1cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJFbnRyeScsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIG9yZGVyRGV0YWlsczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzLCBlLCBhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzLm9yZGVyRGV0YWlscyk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yeUN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuXHRcbn0pIiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJIaXN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgaGlzdG9yaWVzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yeUN0cmwnXG4gICBcbiAgICB9XG5cbn0pXG4gICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuXG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllcyA9IFtcbiAgICAgICAge25hbWU6ICdBbGwnfSxcbiAgICAgICAge25hbWU6ICdGaXJlJ30sXG4gICAgICAgIHtuYW1lOiAnV2F0ZXInfSxcbiAgICAgICAge25hbWU6ICdHcmFzcyd9LFxuICAgICAgICB7bmFtZTogJ1JvY2snfSxcbiAgICAgICAge25hbWU6ICdEcmFnb24nfSxcbiAgICAgICAge25hbWU6ICdQc3ljaGljJ30sXG4gICAgICAgIHtuYW1lOiAnSWNlJ30sXG4gICAgICAgIHtuYW1lOiAnTm9ybWFsJ30sXG4gICAgICAgIHtuYW1lOiAnQnVnJ30sXG4gICAgICAgIHtuYW1lOiAnRWxlY3RyaWMnfSxcbiAgICAgICAge25hbWU6ICdHcm91bmQnfSxcbiAgICAgICAge25hbWU6ICdGYWlyeSd9LFxuICAgICAgICB7bmFtZTogJ0ZpZ2h0aW5nJ30sXG4gICAgICAgIHtuYW1lOiAnR2hvc3QnfSxcbiAgICAgICAge25hbWU6ICdQb2lzb24nfVxuICAgIF1cblxuICAgICRzY29wZS5maWx0ZXIgPSBmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5IHx8IGNhdGVnb3J5ID09PSAnQWxsJykgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIGVsc2UgcmV0dXJuIHByb2R1Y3QuY2F0ZWdvcnkgPT09IGNhdGVnb3J5XG4gICAgICAgIH07XG4gICAgfTtcbiAgICAkc2NvcGUuc2VhcmNoRmlsdGVyPWZ1bmN0aW9uKHNlYXJjaGluZ05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICBpZiAoIXNlYXJjaGluZ05hbWUpIHJldHVybiB0cnVlOyAgICAgICAgICAgXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbGVuID0gc2VhcmNoaW5nTmFtZS5sZW5ndGhcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHJvZHVjdCcsIHByb2R1Y3QudGl0bGUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QudGl0bGUuc3Vic3RyaW5nKDAsbGVuKS50b0xvd2VyQ2FzZSgpPT1zZWFyY2hpbmdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxuICAgICRzY29wZS5wcmljZVJhbmdlRmlsdGVyPWZ1bmN0aW9uKG1pbj0wLG1heD0yMDAwKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHByb2R1Y3Qpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QucHJpY2U+PW1pbiAmJiBwcm9kdWN0LnByaWNlPD1tYXg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnNvcnRpbmdGdW5jPWZ1bmN0aW9uKHNvcnRUeXBlPVwidW50b3VjaGVkXCIpe1xuICAgICAgICBpZiAoc29ydFR5cGU9PT1cInVudG91Y2hlZFwiKSByZXR1cm4gbnVsbDtcbiAgICAgICAgZWxzZSBpZiAoc29ydFR5cGU9PT1cImxvd1wiKSByZXR1cm4gJ3ByaWNlJ1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PSdoaWdoJykgcmV0dXJuICctcHJpY2UnXG4gICAgICAgIH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3Byb2R1Y3RDYXJkJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDYXJkQ3RybCdcbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdEVudHJ5JywgZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0OiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zdWJtaXRVcGRhdGUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS51cGRhdGVQcm9kdWN0KGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0KGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiLy8gYXBwLmRpcmVjdGl2ZSgnc3RhclJhdGluZycsIGZ1bmN0aW9uICgpIHtcbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgcmVzdHJpY3Q6ICdFQScsXG4vLyAgICAgICB0ZW1wbGF0ZTpcbi8vICAgICAgICAgJzxzcGFuIGNsYXNzPVwic3RhcnNcIj4nICtcbi8vICAgICAgICAgICc8ZGl2IGNsYXNzPVwic3RhcnMtZmlsbGVkIGxlZnRcIj4nICtcbi8vICAgICAgICAgICAgICc8c3Bhbj7imIU8L3NwYW4+JyArXG4vLyAgICAgICAgICAnPC9kaXY+JyArXG4vLyAgICAgICAnPC9zcGFuPidcbi8vICAgICB9O1xuLy8gfSlcbiIsIiAvLyBhcHAuY29udHJvbGxlcignU2VhcmNoQmFyQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG4gLy8gXHQkc2NvcGUucHJvZHVjdD1cbiAvLyB9KSIsImFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKCl7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6J0UnLFxuXHRcdHRlbXBsYXRlVXJsOidqcy9jb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjonUHJvZHVjdENhcmRDdHJsJ1xuXHR9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyRW50cnknLCBmdW5jdGlvbiAoVXNlckZhY3RvcnksIEF1dGhGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLWVudHJ5L3VzZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICAgICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKHtlbWFpbDogZW1haWx9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RvbmUnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKHVzZXJJZCkge1xuICAgICAgICAgICAgICAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyKHVzZXJJZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdFcmFzZSBmcm9tIHBsYW5ldCBFYXJ0aCcsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJPcmRlcicsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyT3JkZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzKGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXJPcmRlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyKGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJcbmFwcC5kaXJlY3RpdmUoJ2NsaWNrQW55d2hlcmVCdXRIZXJlJywgZnVuY3Rpb24oJGRvY3VtZW50KXtcbiAgcmV0dXJuIHtcbiAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgIGNsaWNrQW55d2hlcmVCdXRIZXJlOiAnJidcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbCwgYXR0cikge1xuXG4gICAgICAgICAgICAgICAkKCcubG9nbycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICBcblxuICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmlkICE9PSAnY2FydC1pY29uJyAmJiBlLnRhcmdldC5pZCAhPT0gJ2FkZC10by1jYXJ0LWJ1dHRvbicpIHtcbiAgICAgICAgICAgICAgICAgICBpZiAoZWwgIT09IGUudGFyZ2V0ICYmICFlbFswXS5jb250YWlucyhlLnRhcmdldCkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWwoc2NvcGUuY2xpY2tBbnl3aGVyZUJ1dEhlcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIH1cbiAgICAgICAgfVxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
