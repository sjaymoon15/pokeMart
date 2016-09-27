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

    var app = angular.module('fsaPreBuilt', []);

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

app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
        url: '/profile',
        templateUrl: 'js/profile/profile.html',
        controller: 'ProfileCtrl',
        resolve: {
            userProfile: function userProfile(UserFactory) {
                return UserFactory.findUser();
            }
        }

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

    UserFactory.findUser = function (id) {
        return $http.get(baseUrl + id).then(getData).then(function (user) {
            console.log('say my nameeeeeee', user);
            return user;
        });
    };

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
        // scope: {
        //     fbLike: '=?'
        // },
        link: function link(scope, element, attrs) {

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
app.controller('PintCtrl', ['$scope', function ($scope) {
    $scope.myModel = {
        Url: 'http://pokemart-fsa.herokuapp.com',
        Name: "Pokemart",
        ImageUrl: 'http://pokemart-fsa.herokuapp.com'
    };
}]);
app.directive('pinIt', ['$window', '$location', function ($window, $location) {
    return {
        restrict: 'A',
        // scope: {
        //     pinIt: '=',
        //     pinItImage: '=',
        //     pinItUrl: '='
        // },
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
        // scope: {
        //     tweet: '=',
        //     tweetUrl: '='
        // },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInN0b3JlL3N0b3JlLmNvbnRyb2xsZXIuanMiLCJzdG9yZS9zdG9yZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvT3JkZXJIaXN0b3JpZXMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5jb250cm9sbGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvcGludHJlc3QuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2FuZ3VsaWtlL3BpbnRyZXN0LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2FuZ3VsaWtlL3R3aXR0ZXIuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2FuZ3VsaWtlL3R3aXR0ZXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Jldmlldy1lbnRyeS9zdGFyLXJhdGluZy5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLWVudHJ5L3VzZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3V0aWxpdHkvY2xpY2tBbnl3aGVyZUJ1dEhlcmUuZGlyZWN0aXZlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBLE9BQUEsR0FBQSxHQUFBLFFBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxVQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLGdCQUFBLEVBQUEscUJBQUEsRUFBQSxnQkFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEscUJBQUEsRUFBQSxjQUFBLEVBQUE7QUFDQTtBQUNBLHNCQUFBLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQSx1QkFBQSxTQUFBLENBQUEsR0FBQTtBQUNBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxLQUZBO0FBR0EsMEJBQUEsZUFBQTs7QUFFQTtBQUVBLENBYkE7O0FBZUE7QUFDQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FB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LEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFDQSxDQXhCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsVUFBQSxtQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxtQkFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsS0FIQTtBQUlBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsZ0JBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSxTQU5BLEVBT0EsSUFQQSxDQU9BLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsU0FYQSxDQUFBO0FBWUEsS0FiQTs7QUFlQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLGdCQUFBLGtCQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLFlBQUEsS0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBO0FBQUEsbUJBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQTtBQUFBLFNBQUEsQ0FBQTtBQUNBLGVBQUEsVUFBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsWUFBQSxZQUFBLGtCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxZQUNBLGNBREEsQ0FDQSxVQUFBLEVBREEsRUFDQSxVQUFBLFFBREEsRUFDQSxLQURBLEVBQ0EsUUFEQSxDQUFBO0FBRUEsU0FIQSxNQUdBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsT0FBQSxTQUFBLElBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFMQSxDQUFBO0FBTUE7QUFDQTtBQUNBLEtBaEJBOztBQWtCQSxnQkFBQSxjQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxPQUFBLEVBQ0EsT0FEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSx1QkFBQSxDQUFBLE9BQUE7QUFDQSxTQUhBLEVBSUEsSUFKQSxDQUlBLFlBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQU5BLENBQUE7QUFPQSxLQVRBO0FBVUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLEVBQUE7QUFBQSxZQUFBLE1BQUEseURBQUEsQ0FBQTs7QUFDQSxZQUFBLFVBQUEsS0FBQTtBQUNBLFlBQUEsZUFBQSxLQUFBLEVBQUE7QUFDQTtBQUNBLHdCQUFBLENBQUEsTUFBQTtBQUNBLHNCQUFBLElBQUE7QUFDQSxTQUpBLE1BS0EsSUFBQSxlQUFBLFVBQUEsSUFBQSxXQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0Esd0JBQUEsQ0FBQSxNQUFBO0FBQ0Esc0JBQUEsSUFBQTtBQUNBO0FBQ0EsWUFBQSxZQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBLEVBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQTtBQURBLGFBRUEsSUFGQSxDQUVBLFlBQUE7QUFDQSw0QkFBQSwyQkFBQSxDQUFBLE9BQUEsRUFBQSxRQUFBO0FBQ0EsYUFKQSxDQUFBO0FBS0E7QUFHQSxLQXJCQTs7QUF1QkEsZ0JBQUEsdUJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsS0FBQTtBQUNBLG9CQUFBLFVBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsTUFBQSxFQUFBLEtBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQTtBQUNBLFNBRkE7O0FBSUEsb0JBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsQ0FBQTtBQUNBLEtBUEE7O0FBU0EsZ0JBQUEsMkJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLElBQUEsWUFBQSxVQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxFQUFBLEtBQUEsT0FBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLG9CQUFBLFVBQUEsQ0FBQSxDQUFBLEVBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxLQVJBOztBQVVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFDQSxJQURBLENBQ0EsWUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQSxnQkFBQTtBQUNBLHdCQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLFlBQUEsVUFBQSxDQUFBLE1BQUE7QUFDQSxTQUpBLEVBS0EsS0FMQSxDQUtBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsNEJBQUEsRUFBQSxJQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFXQSxnQkFBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsUUFBQSxDQUFBO0FBQ0EsZUFBQSxZQUFBLGdCQUFBLEdBQ0EsSUFEQSxDQUNBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLElBQUE7QUFDQSxpQkFBQSxPQUFBLENBQUE7QUFBQSx1QkFBQSxTQUFBLEtBQUEsS0FBQSxHQUFBLEtBQUEsUUFBQTtBQUFBLGFBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsTUFBQSxFQUFBLEtBQUE7QUFDQSxtQkFBQSxLQUFBO0FBQ0EsU0FOQSxFQU9BLEtBUEEsQ0FPQSxLQUFBLEtBUEEsQ0FBQTtBQVFBLEtBVkE7O0FBYUEsUUFBQSxlQUFBLDhFQUFBOztBQUVBLGFBQUEsbUJBQUEsR0FBQTtBQUNBLFVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxxQkFBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLGNBQUEsWUFBQSxFQUFBLFdBQUEsQ0FBQSxxQkFBQTtBQUNBLFNBRkE7QUFHQTs7QUFJQSxhQUFBLGtCQUFBLEdBQUE7QUFDQSxVQUFBLFlBQUEsRUFBQSxRQUFBLENBQUEsZ0JBQUEsRUFBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxjQUFBLFlBQUEsRUFBQSxXQUFBLENBQUEsZ0JBQUE7QUFDQSxTQUZBO0FBR0E7O0FBRUEsZ0JBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFFQSxDQTNKQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxxQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEscUJBQUEsRUFBQTtBQUNBLFFBQUEsbUJBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxvQkFBQTtBQUNBLFFBQUEsc0JBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsd0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsa0JBQUE7QUFDQSxtQkFBQSxrQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsa0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZ0JBQUE7QUFDQSxtQkFBQSxnQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsVUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsZUFBQSxTQUFBLFlBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsT0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsZUFBQSxNQUFBO0FBQ0EsS0FKQTs7QUFNQSxRQUFBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxjQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsQ0FBQSxlQUFBLE9BQUEsQ0FBQTtBQUNBLFNBSEEsRUFHQSxJQUhBLENBR0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLGVBQUEsY0FBQSxFQURBLENBQ0E7QUFDQSwyQkFBQSxjQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxlQUFBLGNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBOztBQWFBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsRUFHQSxJQUhBLENBR0EsVUFBQSxPQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsVUFBQSxJQUFBLE9BQUE7QUFDQSxtQkFBQSxPQUFBO0FBQ0EsU0FWQSxDQUFBO0FBV0EsS0FaQTs7QUFjQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTkEsQ0FBQTtBQU9BLEtBUkE7O0FBVUEsbUJBQUEsU0FBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsQ0FBQTtBQUlBLEtBTEE7O0FBT0EsbUJBQUEsT0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsT0FBQTtBQUNBLEtBSEE7O0FBS0EsbUJBQUEsWUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsa0JBQUEsU0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxTQUFBLGFBQUEsU0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLE1BQUE7QUFDQSxtQkFBQSxNQUFBO0FBQ0EsU0FMQSxDQUFBO0FBTUEsS0FQQTs7QUFTQSxtQkFBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGtCQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZUFBQSxhQUFBO0FBQ0EsbUJBQUEsZUFBQSxhQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsV0FBQSxjQUFBO0FBRUEsQ0FuRkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxjQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsYUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsV0FBQSxFQURBLENBQ0E7QUFDQSx3QkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLFdBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVlBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxJQUFBO0FBQ0EsbUJBQUEsSUFBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxVQUFBLElBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFDQSxTQVJBLENBQUE7QUFTQSxLQVZBOztBQVlBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLFlBQUE7QUFDQSxnQkFBQSxhQUFBLFlBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLHdCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsZ0JBQUEsdUJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxtQkFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsS0FBQSxFQUFBLEtBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsTUFBQSxHQUFBLENBQUEsbUNBQUEsRUFBQSxPQUFBLENBQUE7QUFDQSxhQUZBLE1BR0E7QUFDQSx1QkFBQSxZQUFBLFVBQUEsQ0FBQSxLQUFBLEVBQUEsRUFBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSwyQkFBQSxNQUFBLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLE9BQUEsQ0FBQTtBQUNBLGlCQUhBLENBQUE7QUFJQTtBQUNBLFNBWkEsQ0FBQTtBQWFBLEtBZEE7O0FBZ0JBLFdBQUEsV0FBQTtBQUNBLENBbEVBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLG1EQUZBO0FBR0EsZUFBQTtBQUNBLG9CQUFBLEdBREE7QUFFQSw4QkFBQTtBQUZBLFNBSEE7QUFPQTtBQUNBLGNBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLFFBQUEsR0FBQSxVQUFBO0FBQ0Esd0JBQUEsZ0JBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxzQkFBQSxJQUFBLEdBQUEsWUFBQSxVQUFBO0FBQ0EsYUFGQTtBQUdBLHVCQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esc0JBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxhQUZBO0FBR0Esa0JBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxzQkFBQSxRQUFBLEdBQUEsMkJBQUE7QUFFQSxhQUhBO0FBSUEsa0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxzQkFBQSxNQUFBLEdBQUEsVUFBQTtBQUNBLHNCQUFBLFFBQUEsR0FBQSxVQUFBO0FBQ0EsYUFIQTtBQUlBLGtCQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0Esb0JBQUEsUUFBQSxDQUFBO0FBQ0Esb0JBQUEsTUFBQSxJQUFBLEVBQ0EsTUFBQSxJQUFBLENBQUEsT0FBQSxDQUFBO0FBQUEsMkJBQUEsU0FBQSxLQUFBLEtBQUEsR0FBQSxLQUFBLFFBQUE7QUFBQSxpQkFBQTtBQUNBLHVCQUFBLEtBQUE7QUFDQSxhQUxBO0FBTUE7QUFFQTtBQWhDQSxLQUFBO0FBa0NBLENBbkNBOztBQ0FBLElBQUEsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUNBLFFBREEsRUFDQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBO0FBQ0EsYUFBQSxtQ0FEQTtBQUVBLGNBQUEsVUFGQTtBQUdBLGtCQUFBO0FBSEEsS0FBQTtBQUtBLENBUEEsQ0FBQTtBQ0FBLElBQUEsVUFBQSxDQUFBLFFBQUEsRUFBQSxDQUNBLFFBREEsRUFDQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBO0FBQ0EsYUFBQSxtQ0FEQTtBQUVBLGNBQUEsVUFGQTtBQUdBLGtCQUFBO0FBSEEsS0FBQTtBQUtBLENBUEEsQ0FBQTtBQ0FBLFFBQUEsTUFBQSxDQUFB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O0FBQ0EsYUFGQTs7QUFNQSxzQkFBQSxFQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxLQUFBLFdBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsb0JBQUEsRUFBQTtBQUNBLHdCQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUNBLDhCQUFBLE1BQUEsQ0FBQSxZQUFBOztBQUVBLGtDQUFBLEtBQUEsQ0FBQSxNQUFBLG9CQUFBO0FBQ0EseUJBSEE7QUFJQTtBQUNBO0FBQ0EsYUFUQTtBQVdBO0FBeEJBLEtBQUE7QUEwQkEsQ0EzQkEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcblxud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2FuZ3VsaWtlJywgJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVpVmlld1Njcm9sbFByb3ZpZGVyLHN0cmlwZVByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG4gICAgJHVpVmlld1Njcm9sbFByb3ZpZGVyLnVzZUFuY2hvclNjcm9sbCgpO1xuXG4gICAgLy8gc3RyaXBlUHJvdmlkZXIuc2V0UHVibGlzaGFibGVLZXkoJ215X2tleScpO1xuXG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICAkcm9vdFNjb3BlLmZhY2Vib29rQXBwSWQgPSAnOTQxMDM4MjgyNjg2MjQyJztcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7IiwiXG5hcHAuY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgYWxsVXNlck9yZGVycywgJGxvZywgYWxsUHJvZHVjdHMsIGFsbFVzZXJzLCBhbGxPcmRlckRldGFpbHMsIE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcblxuICAgICRzY29wZS5wcm9kdWN0cyA9IGFsbFByb2R1Y3RzO1xuICAgICRzY29wZS51c2VycyA9IGFsbFVzZXJzO1xuICAgICRzY29wZS51c2VyT3JkZXJzID0gYWxsVXNlck9yZGVycztcblxuICAgIC8vYWRkaW5nIHN0YXR1cyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kU3RhdHVzKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwuc3RhdHVzID0gc3RhdHVzO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcblxuICAgIC8vYWRkaW5nIHVzZXIgaW5mbyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kVXNlcihvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0XHRvcmRlckRldGFpbC51c2VyID0gdXNlcjtcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG4gICAgYWxsT3JkZXJEZXRhaWxzID0gYWxsT3JkZXJEZXRhaWxzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEudXNlck9yZGVySWQgLSBiLnVzZXJPcmRlcklkO1xuICAgIH0pO1xuICAgIGFsbE9yZGVyRGV0YWlscyA9IF8uZ3JvdXBCeShhbGxPcmRlckRldGFpbHMsICd1c2VyT3JkZXJJZCcpXG4gICAgJHNjb3BlLm9yZGVycyA9ICQubWFwKGFsbE9yZGVyRGV0YWlscyxmdW5jdGlvbiAob3JkZXIsIGkpIHtcbiAgICAgICAgaWYgKGkpIHJldHVybiBbb3JkZXJdO1xuICAgIH0pXG4gICAgY29uc29sZS5sb2coJHNjb3BlLm9yZGVycyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYWRtaW4nLCB7XG4gICAgICAgIHVybDogJy9hZG1pbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWRtaW4vYWRtaW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBZG1pbkN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBhbGxQcm9kdWN0czogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlcnM6IGZ1bmN0aW9uIChVc2VyRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS5mZXRjaEFsbCgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsT3JkZXJEZXRhaWxzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJPcmRlcnM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsVXNlck9yZGVycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn0pXG4iLCIgYXBwLmNvbnRyb2xsZXIoJ0NhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkbG9nLCBjYXJ0Q29udGVudCwgQ2FydEZhY3Rvcnkpe1xuIFx0JHNjb3BlLmNhcnRDb250ZW50PWNhcnRDb250ZW50O1xuXG4gXHQkc2NvcGUucmVtb3ZlPSBmdW5jdGlvbihvcmRlcklkKSB7XG4gXHRcdENhcnRGYWN0b3J5LnJlbW92ZUZyb21DYXJ0KG9yZGVySWQpXG4gXHRcdC50aGVuKGZ1bmN0aW9uKG5ld0NhcnQpe1xuIFx0XHRcdCRzY29wZS5jYXJ0Q29udGVudCA9IG5ld0NhcnQ7XG4gXHRcdH0pLmNhdGNoKCRsb2cpXG4gXHR9XG5cbiBcdCRzY29wZS5jaGFuZ2VRdWFudGl0eT0gZnVuY3Rpb24gKGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2hhbmdlUXVhbnRpdHkoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCk7XG4gICAgICAgICRzY29wZS5jYXJ0Q29udGVudCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgfTtcblxuICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxuICAkc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG90YWwgPSAwO1xuICAgIGNhcnRDb250ZW50LmZvckVhY2goY2FydCA9PiB0b3RhbCArPSAoY2FydC5wcmljZSAqIGNhcnQucXVhbnRpdHkpKVxuXG4gICAgcmV0dXJuIHRvdGFsOyAgXG4gIH1cbiB9KVxuXG4gIiwiIGFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuIFx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NhcnQnLCB7XG4gXHRcdHVybDonL2NhcnQnLFxuIFx0XHR0ZW1wbGF0ZVVybDonanMvY2FydC9jYXJ0Lmh0bWwnLFxuIFx0XHRjb250cm9sbGVyOidDYXJ0Q3RybCcsXG4gXHRcdHJlc29sdmU6e1xuIFx0XHRcdGNhcnRDb250ZW50OmZ1bmN0aW9uKENhcnRGYWN0b3J5KXtcblxuIFx0XHRcdFx0cmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKTtcblxuIFx0XHRcdH1cbiBcdFx0fVxuIFx0fSlcbiB9KVxuXG4iLCJhcHAuY29udHJvbGxlcignQ2hlY2tvdXRDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQ2FydEZhY3RvcnkpIHtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICBjb25zb2xlLmxvZyhpdGVtcylcbiAgICAgICAgJHNjb3BlLml0ZW1zID0gaXRlbXM7XG5cbiAgXHRcdFx0Ly9jYWxjdWxhdGluZyB0b3RhbCBwcmljZSBhbmQgcHV0IHRoYXQgaW50byAkc2NvcGUudG90YWxcbiAgICAgICAgdmFyIGl0ZW1zQXJyID0gaXRlbXM7XG4gICAgICAgIHZhciB0b3RhbFByaWNlRWFjaCA9IFtdO1xuICAgICAgICBpdGVtc0Fyci5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICBcdHRvdGFsUHJpY2VFYWNoLnB1c2goZWxlbWVudC5wcmljZSAqIGVsZW1lbnQucXVhbnRpdHkpO1xuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUudG90YWwgPSB0b3RhbFByaWNlRWFjaC5yZWR1Y2UoIChwcmV2LCBjdXJyKSA9PiBwcmV2ICsgY3VyciApO1xuICAgIH0pXG5cbiAgICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NoZWNrb3V0Jywge1xuICAgICAgICB1cmw6ICcvY2hlY2tvdXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NoZWNrb3V0L2NoZWNrb3V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ2hlY2tvdXRDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNBZG1pbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlci5pc0FkbWluO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Jlc2V0Jywge1xuICAgICAgICB1cmw6ICcvcmVzZXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Jlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGFzc3dvcmQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldC9wYXNzd29yZC86dG9rZW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Bhc3N3b3JkLnJlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgQXV0aEZhY3RvcnksICRzdGF0ZVBhcmFtcywgQ2FydEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgJHNjb3BlLnRva2VuID0gJHN0YXRlUGFyYW1zLnRva2VuO1xuXG4gICAgJHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKGVtYWlsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdDaGVjayB5b3VyIGVtYWlsJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgcGFzc3dvcmQpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZChwYXNzd29yZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJGxvZywgQ2FydEZhY3RvcnksIHRvdGFsQ29zdCwgYXJyYXlPZkl0ZW1zKXtcbiAgJHNjb3BlLmluZm8gPSB7fTtcbiAgXG4gICRzY29wZS52YWxpZGF0ZVVzZXI9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUuaW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNob3dDQyA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgICAgIFxuICB9XG4gICRzY29wZS50b3RhbENvc3QgPSB0b3RhbENvc3Q7XG4gICRzY29wZS5hcnJheU9mSXRlbXMgPSBhcnJheU9mSXRlbXM7XG4gICRzY29wZS5zdHJpbmdPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0udGl0bGUpLmpvaW4oJywnKVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXltZW50Jywge1xuICAgICAgICB1cmw6ICcvcGF5bWVudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcGF5bWVudC9wYXltZW50Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQYXltZW50Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB0b3RhbENvc3Q6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QoKSB9LFxuICAgICAgICAgIGFycmF5T2ZJdGVtczogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKSB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHRoZVByb2R1Y3QsIGFsbFJldmlld3MsIFByb2R1Y3RGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuICAgIC8vIHByb2R1Y3RcbiAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgJHNjb3BlLnByb2R1Y3QgPSB0aGVQcm9kdWN0O1xuICAgICRzY29wZS5yZXZpZXdzID0gYWxsUmV2aWV3cztcbiAgICAvLyByZXZpZXdcbiAgICAkc2NvcGUubW9kYWxPcGVuID0gZmFsc2U7XG4gICAgJHNjb3BlLnN1Ym1pdFJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLm5ld1Jldmlldy5wcm9kdWN0SWQgPSAkc2NvcGUucHJvZHVjdC5pZDtcbiAgICAgICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUubmV3UmV2aWV3KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXZpZXdzID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cztcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhJywgMTAwMCk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gYWRkIHRvIGNhcnRcbiAgICAkc2NvcGUuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5xdWFudGl0eSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhIFlvdXIgaXRlbSB3YXMgYWRkZWQgdG8geW91ciBjYXJ0IScsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgJHNjb3BlLmFycmF5TWFrZXIgPSBmdW5jdGlvbiAobnVtKXtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PW51bTsgaSArKyl7XG4gICAgICAgICAgICBhcnIucHVzaChpKVxuICAgICAgICB9ICBcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9XG5cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAgICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZmlsZScsIHtcbiAgICAgICAgdXJsOiAnL3Byb2ZpbGUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUHJvZmlsZUN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICB1c2VyUHJvZmlsZTogZnVuY3Rpb24gKFVzZXJGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmZpbmRVc2VyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICBcbiAgICB9KTtcbn0pO1xuIFxuXG4gICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuICBhcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhGYWN0b3J5LCAkc3RhdGUpIHtcbiAgICAkc2NvcGUuc2lnbnVwID0ge307IFxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgQXV0aEZhY3Rvcnkuc2lnbnVwKHNpZ251cEluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSAnZW1haWwgZXhpc3RzIGFscmVhZHknKSB7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCAyMDAwKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ25vdCBhIHZhbGlkIGVtYWlsJyl7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0l0IGlzIG5vdCBhIHZhbGlkIGVtYWlsJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0dvIGFoZWFkIGFuZCBsb2dpbicsIDQwMDApO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuXG5cbiIsImFwcC5jb250cm9sbGVyKCdTdG9yZUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBwcm9kdWN0cykge1xuICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzO1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0b3JlJywge1xuICAgICAgICB1cmw6ICcvc3RvcmUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3N0b3JlL3N0b3JlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RvcmVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPcmRlckhpc3Rvcmllc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRDYXJ0ID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvcGFpZC8nXG4gICAgdmFyIG9yZGVySGlzdG9yaWVzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgb3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkQ2FydClcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gXG5cbiAgICByZXR1cm4gb3JkZXJIaXN0b3JpZXNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnLFxuICAgICAgICAnWWVzLCBJIHRoaW5rIHdlXFwndmUgbWV0IGJlZm9yZS4nLFxuICAgICAgICAnR2ltbWUgMyBtaW5zLi4uIEkganVzdCBncmFiYmVkIHRoaXMgcmVhbGx5IGRvcGUgZnJpdHRhdGEnLFxuICAgICAgICAnSWYgQ29vcGVyIGNvdWxkIG9mZmVyIG9ubHkgb25lIHBpZWNlIG9mIGFkdmljZSwgaXQgd291bGQgYmUgdG8gbmV2U1FVSVJSRUwhJyxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsICBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIHZhciBBdXRoRmFjdG9yeSA9IHt9O1xuXG5cbiAgICBBdXRoRmFjdG9yeS5zaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hdXRoL2dvb2dsZScpO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LnJlc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodG9rZW4sIGxvZ2luKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvcmVzZXQvcGFzc3dvcmQvJyArIHRva2VuLCBsb2dpbik7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9mb3Jnb3QnLCBlbWFpbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGhGYWN0b3J5O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnQ2FydEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHAsICRsb2csICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvY2FydC8nO1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaXRlbS5pbWFnZVVybCA9ICcvYXBpL3Byb2R1Y3RzLycgKyBpdGVtLnByb2R1Y3RJZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge307XG4gICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IFtdO1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc29ydChmdW5jdGlvbiAoYSxiKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5pZCAtIGEuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1cGRhdGVDYXJ0JywgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmRlbGV0ZUl0ZW0gPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBwcm9kdWN0SWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IHRoaXMuY2FjaGVkQ2FydC5maWx0ZXIoaXRlbSA9PiBpdGVtLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkKTtcbiAgICAgICAgcmV0dXJuIChkdXBsaWNhdGUubGVuZ3RoKSA/IGR1cGxpY2F0ZVswXSA6IG51bGw7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgcXVhbnRpdHkpIHtcbiAgICAgIFxuICAgICAgICB2YXIgZHVwbGljYXRlID0gQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzKHByb2R1Y3RJZCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeVxuICAgICAgICAgICAgLmNoYW5nZVF1YW50aXR5KGR1cGxpY2F0ZS5pZCwgZHVwbGljYXRlLnF1YW50aXR5LCAnYWRkJywgcXVhbnRpdHkgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArIHByb2R1Y3RJZCwge3F1YW50aXR5OiBxdWFudGl0eX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydD1mdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCtvcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpe1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUob3JkZXJJZClcbiAgICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5PWZ1bmN0aW9uKG9yZGVySWQsIHF1YW50aXR5LCBhZGRPclN1YnRyLCBhbW91bnQgPSAxKXtcbiAgICAgICAgdmFyIHJ1bkZ1bmM9ZmFsc2U7XG4gICAgICAgIGlmIChhZGRPclN1YnRyPT09J2FkZCcpIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcXVhbnRpdHkrPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFkZE9yU3VidHI9PT0nc3VidHJhY3QnICYmIHF1YW50aXR5PjEpIHtcbiAgICAgICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICAgICAgcXVhbnRpdHktPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5GdW5jPT09dHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgb3JkZXJJZCwge3F1YW50aXR5OnF1YW50aXR5fSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eShvcmRlcklkLHF1YW50aXR5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUgPSBmdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZvckVhY2goZnVuY3Rpb24ob3JkZXIsaSl7XG4gICAgICAgICAgICBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIGluZGV4ID0gaTtcbiAgICAgICAgfSlcblxuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkgPSBmdW5jdGlvbiAob3JkZXJJZCxxdWFudGl0eSkge1xuICAgICAgICB2YXIgaSA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZmluZEluZGV4KGZ1bmN0aW9uKG9yZGVyKXtcbiAgICAgICAgICAgIC8vIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkge1xuICAgICAgICAgICAgLy8gICAgIG9yZGVyLnF1YW50aXR5ID0gcXVhbnRpdHk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICByZXR1cm4gb3JkZXIuaWQgPT09IG9yZGVySWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0W2ldLnF1YW50aXR5ID0gcXVhbnRpdHlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdvcmRlckhpc3RvcmllcycpO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoMCwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5sZW5ndGgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIFNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBhZGRSZW1vdmVBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgc2hha2UnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICBDYXJ0RmFjdG9yeS5maW5kT25lVXNlckluZm89ZnVuY3Rpb24oKXtcbiAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5wdXNoKHJldmlldyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5O1xuXG59KVxuIiwiYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG5cbiAgICBVc2VyRmFjdG9yeS5maW5kVXNlcj1mdW5jdGlvbihpZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkKVxuICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2F5IG15IG5hbWVlZWVlZWUnLCB1c2VyKVxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlciA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vyc1t1cGRhdGVkSW5kXSA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2Vycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50ID0gZnVuY3Rpb24gKGluZm9PYmope1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgICAgIGlmKHVzZXIuaWQgPT09ICdzZXNzaW9uJyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVNlc3Npb25DYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXBkYXRlVXNlcih1c2VyLmlkLGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVVc2VyQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gVXNlckZhY3Rvcnk7XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnc2hvcHBpbmdDYXJ0JywgZnVuY3Rpb24oQ2FydEZhY3RvcnksICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgYWN0aXZlOiAnPScsXG4gICAgICAgICAgICBhZGRBbmRSZXZlYWxDYXJkOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgLy8gc2NvcGU6IHsgc2V0Rm46ICcmJyB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKS50aGVuKGZ1bmN0aW9uIChjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCd1cGRhdGVDYXJ0JywgZnVuY3Rpb24gKGV2ZW50LCBjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IGNhcnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgc2NvcGUucmV2ZWFsQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCBjaGVja291dC0tYWN0aXZlJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5oaWRlQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5hY3RpdmUgPSAnaW5hY3RpdmUnO1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgICAgICAgICBpZihzY29wZS5jYXJ0KVxuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlICogaXRlbS5xdWFudGl0eSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIC8vIHNjb3BlLnNldEZuKHt0aGVEaXJGbjogc2NvcGUudXBkYXRlTWFwfSk7XG5cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29udHJvbGxlcignRkJsaWtlJywgW1xuICAgICAgJyRzY29wZScsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbiAgICAgICAgICAkc2NvcGUubXlNb2RlbCA9IHtcbiAgICAgICAgICAgICAgVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJyxcbiAgICAgICAgICAgICAgTmFtZTogXCJQb2tlbWFydFwiLFxuICAgICAgICAgICAgICBJbWFnZVVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbSdcbiAgICAgICAgICB9O1xuICAgICAgfVxuICBdKTsgICAgIiwiYXBwLmNvbnRyb2xsZXIoJ0ZCbGlrZScsIFtcbiAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4gICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4gICAgICAgICAgICAgIE5hbWU6IFwiUG9rZW1hcnRcIixcbiAgICAgICAgICAgICAgSW1hZ2VVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgXSk7ICAgICIsImFuZ3VsYXIubW9kdWxlKCdhbmd1bGlrZScpXG4gICAgLmRpcmVjdGl2ZSgnZmJMaWtlJywgW1xuICAgICAgICAnJHdpbmRvdycsICckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOidGQmxpa2UnLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGZiTGlrZTogJz0/J1xuICAgICAgICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LkZCKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIEZhY2Vib29rIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL3Nkay5qcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LkZCLmluaXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBJZDogJHJvb3RTY29wZS5mYWNlYm9va0FwcElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ZmJtbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJ3YyLjAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyTGlrZUJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWF0dHJzLmZiTGlrZSAmJiAhc2NvcGUuZmJMaWtlICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgnZmJMaWtlJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8ZGl2IGNsYXNzPVwiZmItbGlrZVwiJyArICghIXNjb3BlLmZiTGlrZSA/ICcgZGF0YS1ocmVmPVwiJyArIHNjb3BlLmZiTGlrZSArICdcIicgOiAnJykgKyAnIGRhdGEtbGF5b3V0PVwiYnV0dG9uX2NvdW50XCIgZGF0YS1hY3Rpb249XCJsaWtlXCIgZGF0YS1zaG93LWZhY2VzPVwidHJ1ZVwiIGRhdGEtc2hhcmU9XCJ0cnVlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5YRkJNTC5wYXJzZShlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCJhcHAuY29udHJvbGxlcignUGludEN0cmwnLCBbXG4gICAgICAnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgICRzY29wZS5teU1vZGVsID0ge1xuICAgICAgICAgICAgICBVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nLFxuICAgICAgICAgICAgICBOYW1lOiBcIlBva2VtYXJ0XCIsXG4gICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuICAgICAgICAgIH07XG4gICAgICB9XG4gIF0pOyAgICAiLCJhcHAuZGlyZWN0aXZlKCdwaW5JdCcsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgZnVuY3Rpb24gKCR3aW5kb3csICRsb2NhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgLy8gICAgIHBpbkl0OiAnPScsXG4gICAgICAgICAgICAgICAgLy8gICAgIHBpbkl0SW1hZ2U6ICc9JyxcbiAgICAgICAgICAgICAgICAvLyAgICAgcGluSXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjonUGludEN0cmwnLFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBQaW50ZXJlc3QgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBkLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdTQ1JJUFQnKVswXSwgcCA9IGQuY3JlYXRlRWxlbWVudCgnU0NSSVBUJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5hc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5zcmMgPSAnLy9hc3NldHMucGludGVyZXN0LmNvbS9qcy9waW5pdC5qcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcFsnZGF0YS1waW4tYnVpbGQnXSA9ICdwYXJzZVBpbnMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQocC5vbmxvYWQsIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocCwgZik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KCR3aW5kb3cuZG9jdW1lbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyUGluSXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLnBpbkl0ICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgncGluSXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCIvL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9JyArIChzY29wZS5waW5JdFVybCB8fCAkbG9jYXRpb24uYWJzVXJsKCkpICsgJyZtZWRpYT0nICsgc2NvcGUucGluSXRJbWFnZSArICcmZGVzY3JpcHRpb249JyArIHNjb3BlLnBpbkl0ICsgJ1wiIGRhdGEtcGluLWRvPVwiYnV0dG9uUGluXCIgZGF0YS1waW4tY29uZmlnPVwiYmVzaWRlXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cucGFyc2VQaW5zKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsIi8vIGFwcC5jb250cm9sbGVyKCdUd2l0dGVyQ3RybCcsIFtcbi8vICAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4vLyAgICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4vLyAgICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4vLyAgICAgICAgICAgICAgIE5hbWU6IFwiUG9rZW1hcnRcIixcbi8vICAgICAgICAgICAgICAgSW1hZ2VVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nXG4vLyAgICAgICAgICAgfTtcbi8vICAgICAgIH1cbi8vICAgXSk7ICAgICIsImFwcC5kaXJlY3RpdmUoJ3R3ZWV0JywgW1xuICAgICAgICAnJHdpbmRvdycsICckbG9jYXRpb24nLFxuICAgICAgICBmdW5jdGlvbiAoJHdpbmRvdywgJGxvY2F0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgLy8gc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAvLyAgICAgdHdlZXQ6ICc9JyxcbiAgICAgICAgICAgICAgICAvLyAgICAgdHdlZXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgICAgICAgLy8gY29udHJvbGxlcjonVHdpdHRlckN0cmwnLFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnR3dHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIFR3aXR0ZXIgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRTY3JpcHQoJy8vcGxhdGZvcm0udHdpdHRlci5jb20vd2lkZ2V0cy5qcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclR3ZWV0QnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS50d2VldCAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ3R3ZWV0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCJodHRwczovL3R3aXR0ZXIuY29tL3NoYXJlXCIgY2xhc3M9XCJ0d2l0dGVyLXNoYXJlLWJ1dHRvblwiIGRhdGEtdGV4dD1cIicgKyBzY29wZS50d2VldCArICdcIiBkYXRhLXVybD1cIicgKyAoc2NvcGUudHdlZXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICdcIj5Ud2VldDwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LnR3dHRyLndpZGdldHMubG9hZChlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdTaG9wJywgc3RhdGU6ICdzdG9yZScgfSxcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5N3B4IC0zMDZweCcpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudW50b2dnbGVMb2dvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5M3B4IC05cHgnKVxuXG4gICAgICAgICAgICB9ICAgXG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRBZG1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhBdXRoSW50ZXJjZXB0b3IpO1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuYWRtaW4gPSBBdXRoU2VydmljZS5pc0FkbWluKHVzZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuICAgICAgICAgICAgc2V0QWRtaW4oKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCdvYXV0aEJ1dHRvbicsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgcHJvdmlkZXJOYW1lOiAnQCdcbiAgICB9LFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ29yZGVyRW50cnknLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBvcmRlckRldGFpbHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAocywgZSwgYSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocy5vcmRlckRldGFpbHMpO1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckhpc3RvcnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblx0XG59KSIsImFwcC5kaXJlY3RpdmUoJ29yZGVySGlzdG9yeScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGhpc3RvcmllczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdPcmRlckhpc3RvcnlDdHJsJ1xuICAgXG4gICAgfVxuXG59KVxuICAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdENhcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblxuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbXG4gICAgICAgIHtuYW1lOiAnQWxsJ30sXG4gICAgICAgIHtuYW1lOiAnRmlyZSd9LFxuICAgICAgICB7bmFtZTogJ1dhdGVyJ30sXG4gICAgICAgIHtuYW1lOiAnR3Jhc3MnfSxcbiAgICAgICAge25hbWU6ICdSb2NrJ30sXG4gICAgICAgIHtuYW1lOiAnRHJhZ29uJ30sXG4gICAgICAgIHtuYW1lOiAnUHN5Y2hpYyd9LFxuICAgICAgICB7bmFtZTogJ0ljZSd9LFxuICAgICAgICB7bmFtZTogJ05vcm1hbCd9LFxuICAgICAgICB7bmFtZTogJ0J1Zyd9LFxuICAgICAgICB7bmFtZTogJ0VsZWN0cmljJ30sXG4gICAgICAgIHtuYW1lOiAnR3JvdW5kJ30sXG4gICAgICAgIHtuYW1lOiAnRmFpcnknfSxcbiAgICAgICAge25hbWU6ICdGaWdodGluZyd9LFxuICAgICAgICB7bmFtZTogJ0dob3N0J30sXG4gICAgICAgIHtuYW1lOiAnUG9pc29uJ31cbiAgICBdXG5cbiAgICAkc2NvcGUuZmlsdGVyID0gZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCBjYXRlZ29yeSA9PT0gJ0FsbCcpIHJldHVybiB0cnVlXG4gICAgICAgICAgICBlbHNlIHJldHVybiBwcm9kdWN0LmNhdGVnb3J5ID09PSBjYXRlZ29yeVxuICAgICAgICB9O1xuICAgIH07XG4gICAgJHNjb3BlLnNlYXJjaEZpbHRlcj1mdW5jdGlvbihzZWFyY2hpbmdOYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFzZWFyY2hpbmdOYW1lKSByZXR1cm4gdHJ1ZTsgICAgICAgICAgIFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGxlbiA9IHNlYXJjaGluZ05hbWUubGVuZ3RoXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2R1Y3QnLCBwcm9kdWN0LnRpdGxlKVxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnRpdGxlLnN1YnN0cmluZygwLGxlbikudG9Mb3dlckNhc2UoKT09c2VhcmNoaW5nTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUucHJpY2VSYW5nZUZpbHRlcj1mdW5jdGlvbihtaW49MCxtYXg9MjAwMCl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwcm9kdWN0KXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnByaWNlPj1taW4gJiYgcHJvZHVjdC5wcmljZTw9bWF4O1xuICAgICAgICB9XG4gICAgfVxuICAgICRzY29wZS5zb3J0aW5nRnVuYz1mdW5jdGlvbihzb3J0VHlwZT1cInVudG91Y2hlZFwiKXtcbiAgICAgICAgaWYgKHNvcnRUeXBlPT09XCJ1bnRvdWNoZWRcIikgcmV0dXJuIG51bGw7XG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09XCJsb3dcIikgcmV0dXJuICdwcmljZSdcbiAgICAgICAgZWxzZSBpZiAoc29ydFR5cGU9PT0naGlnaCcpIHJldHVybiAnLXByaWNlJ1xuICAgICAgICB9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0Q2FyZCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0czogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q2FyZEN0cmwnXG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3Byb2R1Y3RFbnRyeScsIGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdDogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc3VibWl0VXBkYXRlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdChpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdChpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsIi8vIGFwcC5kaXJlY3RpdmUoJ3N0YXJSYXRpbmcnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuLy8gICAgICAgdGVtcGxhdGU6XG4vLyAgICAgICAgICc8c3BhbiBjbGFzcz1cInN0YXJzXCI+JyArXG4vLyAgICAgICAgICAnPGRpdiBjbGFzcz1cInN0YXJzLWZpbGxlZCBsZWZ0XCI+JyArXG4vLyAgICAgICAgICAgICAnPHNwYW4+4piFPC9zcGFuPicgK1xuLy8gICAgICAgICAgJzwvZGl2PicgK1xuLy8gICAgICAgJzwvc3Bhbj4nXG4vLyAgICAgfTtcbi8vIH0pXG4iLCIgLy8gYXBwLmNvbnRyb2xsZXIoJ1NlYXJjaEJhckN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuIC8vIFx0JHNjb3BlLnByb2R1Y3Q9XG4gLy8gfSkiLCJhcHAuZGlyZWN0aXZlKCdzZWFyY2hCYXInLCBmdW5jdGlvbigpe1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OidFJyxcblx0XHR0ZW1wbGF0ZVVybDonanMvY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6J1Byb2R1Y3RDYXJkQ3RybCdcblx0fVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlckVudHJ5JywgZnVuY3Rpb24gKFVzZXJGYWN0b3J5LCBBdXRoRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCh7ZW1haWw6IGVtYWlsfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEb25lJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlcih1c2VySWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRXJhc2UgZnJvbSBwbGFuZXQgRWFydGgnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyT3JkZXInLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlck9yZGVyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyhpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LmRlbGV0ZVVzZXJPcmRlcihpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiXG5hcHAuZGlyZWN0aXZlKCdjbGlja0FueXdoZXJlQnV0SGVyZScsIGZ1bmN0aW9uKCRkb2N1bWVudCl7XG4gIHJldHVybiB7XG4gICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICBjbGlja0FueXdoZXJlQnV0SGVyZTogJyYnXG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWwsIGF0dHIpIHtcblxuICAgICAgICAgICAgICAgJCgnLmxvZ28nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICRkb2N1bWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldC5pZCAhPT0gJ2NhcnQtaWNvbicgJiYgZS50YXJnZXQuaWQgIT09ICdhZGQtdG8tY2FydC1idXR0b24nKSB7XG4gICAgICAgICAgICAgICAgICAgaWYgKGVsICE9PSBlLnRhcmdldCAmJiAhZWxbMF0uY29udGFpbnMoZS50YXJnZXQpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsKHNjb3BlLmNsaWNrQW55d2hlcmVCdXRIZXJlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICB9XG4gICAgICAgIH1cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
