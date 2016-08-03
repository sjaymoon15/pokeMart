'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ui.materialize', 'angular-input-stars', 'angular-stripe']);

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
                return UserFactory.fetchAll().catch(function (err) {
                    console.log(err);
                });
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
        CartFactory.addToCart($scope.product.id, $scope.quantity);
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
            } else {
                $state.go('store');
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

    UserFactory.updateUser = function (id, data) {
        return $http.put(baseUrl + id, data).then(getData).then(function (user) {
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
            active: '='
        },
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

            setUser();

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInN0b3JlL3N0b3JlLmNvbnRyb2xsZXIuanMiLCJzdG9yZS9zdG9yZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvT3JkZXJIaXN0b3JpZXMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmV2aWV3LWVudHJ5L3N0YXItcmF0aW5nLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXRpbGl0eS9jbGlja0FueXdoZXJlQnV0SGVyZS5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBOEJBLENBdkNBOztBQ3BCQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxhQUFBLFFBREE7QUFFQSxvQkFBQSxpQkFGQTtBQUdBLHFCQUFBO0FBSEEsS0FBQTtBQU1BLENBVEE7O0FBV0EsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7O0FBRUE7QUFDQSxXQUFBLE1BQUEsR0FBQSxFQUFBLE9BQUEsQ0FBQSxhQUFBLENBQUE7QUFFQSxDQUxBOztBQ1ZBLElBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsSUFBQSxFQUFBLFdBQUEsRUFBQSxRQUFBLEVBQUEsZUFBQSxFQUFBLG1CQUFBLEVBQUE7O0FBRUEsV0FBQSxRQUFBLEdBQUEsV0FBQTtBQUNBLFdBQUEsS0FBQSxHQUFBLFFBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxhQUFBOztBQUVBO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLE1BQUEsRUFBQTtBQUNBLHdCQUFBLE1BQUEsR0FBQSxNQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFJQSxLQUxBOztBQU9BO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsUUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLHdCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFJQSxLQUxBO0FBTUEsc0JBQUEsZ0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFB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QUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLFdBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0E7O0FBRUEsaUJBQUEsYUFBQSxDQUFBLEdBQUEsRUFBQTs7QUFFQSxnQkFBQSxTQUFBLFFBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBO0FBQ0EsZ0JBQUEsUUFBQSw4QkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLEdBQUEsR0FBQSxNQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUE7QUFDQSxnQkFBQSxZQUFBLGlCQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLFNBQUEsTUFBQTtBQUNBLGdCQUFBLElBQUEsYUFBQSxNQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLElBQUEsY0FBQSxLQUFBLE1BQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLFlBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBOztBQUVBLG1CQUFBLEtBQ0EsWUFEQSxHQUNBLFNBREEsR0FDQSxrQkFEQSxHQUNBLEtBREEsR0FDQSxHQURBLEdBRUEsV0FGQSxHQUVBLFNBRkEsR0FFQSxTQUZBLEdBRUEsU0FGQSxHQUVBLEtBRkEsR0FFQSxRQUZBLEdBR0EsTUFIQTtBQUlBOztBQUVBLFlBQUEsTUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLFFBQUEsRUFBQTs7QUFFQSxhQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EscUJBQUEsY0FBQSxLQUFBLENBQUE7QUFDQTs7QUFFQSxhQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EscUJBQUEsY0FBQSxRQUFBLENBQUE7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QUE7QUFDQSx1QkFBQSxtQkFBQSxXQUFBLEVBQUE7QUFBQSx1QkFBQSxZQUFBLFlBQUEsRUFBQTtBQUFBLGFBREE7QUFFQSwwQkFBQSxzQkFBQSxXQUFBLEVBQUE7QUFBQSx1QkFBQSxZQUFBLGdCQUFBLEVBQUE7QUFBQTtBQUZBO0FBSkEsS0FBQTtBQVNBLENBVkE7O0FDQUEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQTtBQUNBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBLFVBQUE7QUFDQSxXQUFBLE9BQUEsR0FBQSxVQUFBO0FBQ0E7QUFDQSxXQUFBLFNBQUEsR0FBQSxLQUFBO0FBQ0EsV0FBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLE9BQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxPQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLE9BQUEsR0FBQSxlQUFBLGFBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQTtBQUNBLFNBSkEsRUFJQSxLQUpBLENBSUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxzQkFBQSxFQUFBLElBQUE7QUFDQSxTQU5BO0FBT0EsS0FUQTtBQVVBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBLFNBQUEsQ0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsT0FBQSxRQUFBO0FBQ0EsS0FGQTtBQUdBLFdBQUEsVUFBQSxHQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsS0FBQSxHQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxD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QSxLQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBQ0EsQ0F4QkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLFVBQUEsbUJBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUEsbUJBQUEsS0FBQSxTQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNBLEtBSEE7QUFJQSxRQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsU0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsWUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLFNBWEEsQ0FBQTtBQVlBLEtBYkE7O0FBZUEsZ0JBQUEsVUFB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U0FMQSxDQUFBO0FBTUEsb0JBQUEsVUFBQSxDQUFBLENBQUEsRUFBQSxRQUFBLEdBQUEsUUFBQTtBQUNBLEtBUkE7O0FBVUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUNBLElBREEsQ0FDQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBLGdCQUFBO0FBQ0Esd0JBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsWUFBQSxVQUFBLENBQUEsTUFBQTtBQUNBLFNBSkEsRUFLQSxLQUxBLENBS0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSw0QkFBQSxFQUFBLElBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLGdCQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUE7QUFDQSxlQUFBLFlBQUEsZ0JBQUEsR0FDQSxJQURBLENBQ0EsVUFBQSxJQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsSUFBQTtBQUNBLGlCQUFBLE9BQUEsQ0FBQTtBQUFBLHVCQUFBLFNBQUEsS0FBQSxLQUFBLEdBQUEsS0FBQSxRQUFBO0FBQUEsYUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxNQUFBLEVBQUEsS0FBQTtBQUNBLG1CQUFBLEtBQUE7QUFDQSxTQU5BLEVBT0EsS0FQQSxDQU9BLEtBQUEsS0FQQSxDQUFBO0FBUUEsS0FWQTs7QUFhQSxRQUFBLGVBQUEsOEVBQUE7O0FBRUEsYUFBQSxtQkFBQSxHQUFBO0FBQ0EsVUFBQSxZQUFBLEVBQUEsUUFBQSxDQUFBLHFCQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsV0FBQSxDQUFBLHFCQUFBO0FBQ0EsU0FGQTtBQUdBOztBQUVBLGFBQUEsa0JBQUEsR0FBQTtBQUNBLFVBQUEsWUFBQSxFQUFBLFFBQUEsQ0FBQSxnQkFBQSxFQUFBLEdBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUNBLGNBQUEsWUFBQSxFQUFBLFdBQUEsQ0FBQSxnQkFBQTtBQUNBLFNBRkE7QUFHQTs7QUFFQSxXQUFBLFdBQUE7QUFFQSxDQXBKQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxxQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEscUJBQUEsRUFBQTtBQUNBLFFBQUEsbUJBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxvQkFBQTtBQUNBLFFBQUEsc0JBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsd0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsa0JBQUE7QUFDQSxtQkFBQSxrQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsa0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZ0JBQUE7QUFDQSxtQkFBQSxnQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsVUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsZUFBQSxTQUFBLFlBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsT0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsZUFBQSxNQUFBO0FBQ0EsS0FKQTs7QUFNQSxRQUFBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxjQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsQ0FBQSxlQUFBLE9BQUEsQ0FBQTtBQUNBLFNBSEEsRUFHQSxJQUhBLENBR0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLGVBQUEsY0FBQSxFQURBLENBQ0E7QUFDQSwyQkFBQSxjQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxlQUFBLGNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBOztBQWFBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsRUFHQSxJQUhBLENBR0EsVUFBQSxPQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsVUFBQSxJQUFBLE9BQUE7QUFDQSxtQkFBQSxPQUFBO0FBQ0EsU0FWQSxDQUFBO0FBV0EsS0FaQTs7QUFjQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTkEsQ0FBQTtBQU9BLEtBUkE7O0FBVUEsbUJBQUEsU0FBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsQ0FBQTtBQUlBLEtBTEE7O0FBT0EsbUJBQUEsT0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsT0FBQTtBQUNBLEtBSEE7O0FBS0EsbUJBQUEsWUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsa0JBQUEsU0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxTQUFBLGFBQUEsU0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLE1BQUE7QUFDQSxtQkFBQSxNQUFBO0FBQ0EsU0FMQSxDQUFBO0FBTUEsS0FQQTs7QUFTQSxtQkFBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGtCQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZUFBQSxhQUFBO0FBQ0EsbUJBQUEsZUFBQSxhQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsV0FBQSxjQUFBO0FBRUEsQ0FuRkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxjQUFBLEVBQUE7O0FBRUEsUUFBQSxjQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsYUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsV0FBQSxFQURBLENBQ0E7QUFDQSx3QkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLFdBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0Esd0JBQUEsVUFBQSxJQUFBLElBQUE7QUFDQSxtQkFBQSxJQUFBO0FBQ0EsU0FSQSxDQUFBO0FBU0EsS0FWQTs7QUFZQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FB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QUFBLEVBQUEsQ0FFQSxDQUZBO0FDQUEsSUFBQSxTQUFBLENBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLHVEQUZBO0FBR0EsZUFBQTtBQUNBLHVCQUFBO0FBREEsU0FIQTtBQU1BLG9CQUFBO0FBTkEsS0FBQTtBQVFBLENBVEE7O0FDQUEsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTs7QUFHQSxXQUFBLFVBQUEsR0FBQSxDQUNBLEVBQUEsTUFBQSxLQUFBLEVBREEsRUFFQSxFQUFBLE1BQUEsTUFBQSxFQUZBLEVBR0EsRUFBQSxNQUFBLE9BQUEsRUFIQSxFQUlBLEVBQUEsTUFBQSxPQUFBLEVBSkEsRUFLQSxFQUFBLE1BQUEsTUFBQSxFQUxBLEVBTUEsRUFBQSxNQUFBLFFBQUEsRUFOQSxFQU9BLEVBQUEsTUFBQSxTQUFBLEVBUEEsRUFRQSxFQUFBLE1BQUEsS0FBQSxFQVJBLEVBU0EsRUFBQSxNQUFBLFFBQUEsRUFUQSxFQVVBLEVBQUEsTUFBQSxLQUFBLEVBVkEsRUFXQSxFQUFBLE1BQUEsVUFBQSxFQVhBLEVBWUEsRUFBQSxNQUFBLFFBQUEsRUFaQSxFQWFBLEVBQUEsTUFBQSxPQUFBLEVBYkEsRUFjQSxFQUFBLE1BQUEsVUFBQSxFQWRBLEVBZUEsRUFBQSxNQUFBLE9BQUEsRUFmQSxFQWdCQSxFQUFBLE1BQUEsUUFBQSxFQWhCQSxDQUFBOztBQW1CQSxXQUFBLE1BQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsSUFBQSxhQUFBLEtBQUEsRUFBQSxPQUFBLElBQUEsQ0FBQSxLQUNBLE9BQUEsUUFBQSxRQUFBLEtBQUEsUUFBQTtBQUNBLFNBSEE7QUFJQSxLQUxBO0FBTUEsV0FBQSxZQUFBLEdBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxhQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQTtBQUNBLG9CQUFBLE1BQUEsY0FBQSxNQUFBO0FBQ0Esd0JBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxRQUFBLEtBQUE7QUFDQSx1QkFBQSxRQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxXQUFBLE1BQUEsY0FBQSxXQUFBLEVBQUE7QUFDQTtBQUVBLFNBUkE7QUFTQSxLQVZBO0FBV0EsV0FBQSxnQkFBQSxHQUFBLFlBQUE7QUFBQSxZQUFBLEdBQUEseURBQUEsQ0FBQTtBQUFBLFlBQUEsR0FBQSx5REFBQSxJQUFBOztBQUNBLGVBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLEtBQUEsSUFBQSxHQUFBLElBQUEsUUFBQSxLQUFBLElBQUEsR0FBQTtBQUNBLFNBRkE7QUFHQSxLQUpBO0FBS0EsV0FBQSxXQUFBLEdBQUEsWUFBQTtBQUFBLFlBQUEsUUFBQSx5REFBQSxXQUFBOztBQUNBLFlBQUEsYUFBQSxXQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQSxJQUFBLGFBQUEsS0FBQSxFQUFBLE9BQUEsT0FBQSxDQUFBLEtBQ0EsSUFBQSxhQUFBLE1BQUEsRUFBQSxPQUFBLFFBQUE7QUFDQSxLQUpBO0FBS0EsQ0FqREE7O0FDQUEsSUFBQSxTQUFBLENBQUEsYUFBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLHFEQUZBO0FBR0EsZUFBQTtBQUNBLHNCQUFBO0FBREEsU0FIQTtBQU1BLG9CQUFBO0FBTkEsS0FBQTtBQVFBLENBVEE7O0FDQUEsSUFBQSxTQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSx1REFGQTtBQUdBLGVBQUE7QUFDQSxxQkFBQSxHQURBO0FBRUEscUJBQUE7QUFGQSxTQUhBO0FBT0EsY0FBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsWUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsK0JBQUEsYUFBQSxDQUFBLEVBQUEsRUFBQSxNQUFBLE9BQUE7QUFDQSxhQUZBO0FBR0Esa0JBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsK0JBQUEsYUFBQSxDQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0E7QUFkQSxLQUFBO0FBZ0JBLENBakJBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLGVBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLHlEQUZBO0FBR0EsY0FBQSxjQUFBLEtBQUEsRUFBQTtBQUNBLGtCQUFBLFFBQUEsR0FBQSxnQkFBQSxpQkFBQSxFQUFBO0FBQ0E7QUFMQSxLQUFBO0FBUUEsQ0FWQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FDRkEsSUFBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFlBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLGlEQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBO0FBS0EsQ0FOQTs7QUNBQSxJQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSxpREFGQTtBQUdBLGVBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEscUJBQUE7QUFGQSxTQUhBO0FBT0EsY0FBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsNEJBQUEsY0FBQSxDQUFBLEVBQUEsT0FBQSxLQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUZBLEVBRUEsS0FGQSxDQUVBLFlBQUE7QUFDQSxnQ0FBQSxLQUFBLENBQUEsNEJBQUEsRUFBQSxJQUFBO0FBQ0EsaUJBSkE7QUFLQSxhQU5BO0FBT0Esa0JBQUEsVUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdDQUFBLEtBQUEsQ0FBQSx5QkFBQSxFQUFBLElBQUE7QUFDQSxpQkFGQSxFQUVBLEtBRkEsQ0FFQSxZQUFBO0FBQ0EsZ0NBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUpBO0FBS0EsYUFOQTtBQU9BO0FBdEJBLEtBQUE7QUF3QkEsQ0F6QkE7O0FDQUEsSUFBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsbUJBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEscUJBQUEsaURBRkE7QUFHQSxlQUFBO0FBQ0EsdUJBQUEsR0FEQTtBQUVBLHFCQUFBO0FBRkEsU0FIQTtBQU9BLGNBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLFlBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLG9DQUFBLFlBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxPQUFBO0FBQ0EsYUFGQTtBQUdBLGtCQUFBLGVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLG9DQUFBLGVBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBO0FBZEEsS0FBQTtBQWdCQSxDQWpCQTs7QUNDQSxJQUFBLFNBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxlQUFBO0FBQ0Esa0NBQUE7QUFEQSxTQUZBO0FBS0EsY0FBQSxjQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGNBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxlQUFBO0FBQ0EsYUFGQTs7QUFNQSxzQkFBQSxFQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxLQUFBLFdBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsb0JBQUEsRUFBQTtBQUNBLHdCQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUNBLDhCQUFBLE1BQUEsQ0FBQSxZQUFBOztBQUVBLGtDQUFBLEtBQUEsQ0FBQSxNQUFBLG9CQUFBO0FBQ0EseUJBSEE7QUFJQTtBQUNBO0FBQ0EsYUFUQTtBQVdBO0FBeEJBLEtBQUE7QUEwQkEsQ0EzQkEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcblxud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVpVmlld1Njcm9sbFByb3ZpZGVyLHN0cmlwZVByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG4gICAgJHVpVmlld1Njcm9sbFByb3ZpZGVyLnVzZUFuY2hvclNjcm9sbCgpO1xuXG4gICAgLy8gc3RyaXBlUHJvdmlkZXIuc2V0UHVibGlzaGFibGVLZXkoJ215X2tleScpO1xuXG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJcbmFwcC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBhbGxVc2VyT3JkZXJzLCAkbG9nLCBhbGxQcm9kdWN0cywgYWxsVXNlcnMsIGFsbE9yZGVyRGV0YWlscywgTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnByb2R1Y3RzID0gYWxsUHJvZHVjdHM7XG4gICAgJHNjb3BlLnVzZXJzID0gYWxsVXNlcnM7XG4gICAgJHNjb3BlLnVzZXJPcmRlcnMgPSBhbGxVc2VyT3JkZXJzO1xuXG4gICAgLy9hZGRpbmcgc3RhdHVzIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgIFx0XHRvcmRlckRldGFpbC5zdGF0dXMgPSBzdGF0dXM7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuXG4gICAgLy9hZGRpbmcgdXNlciBpbmZvIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnVzZXIgPSB1c2VyO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcbiAgICBhbGxPcmRlckRldGFpbHMgPSBhbGxPcmRlckRldGFpbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYS51c2VyT3JkZXJJZCAtIGIudXNlck9yZGVySWQ7XG4gICAgfSk7XG4gICAgYWxsT3JkZXJEZXRhaWxzID0gXy5ncm91cEJ5KGFsbE9yZGVyRGV0YWlscywgJ3VzZXJPcmRlcklkJylcbiAgICAkc2NvcGUub3JkZXJzID0gJC5tYXAoYWxsT3JkZXJEZXRhaWxzLGZ1bmN0aW9uIChvcmRlciwgaSkge1xuICAgICAgICBpZiAoaSkgcmV0dXJuIFtvcmRlcl07XG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygkc2NvcGUub3JkZXJzKVxuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FkbWluJywge1xuICAgICAgICB1cmw6ICcvYWRtaW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkbWluL2FkbWluLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWRtaW5DdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxsUHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJzOiBmdW5jdGlvbiAoVXNlckZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuZmV0Y2hBbGwoKS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxPcmRlckRldGFpbHM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlck9yZGVyczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufSlcbiIsIiBhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRsb2csIGNhcnRDb250ZW50LCBDYXJ0RmFjdG9yeSl7XG4gXHQkc2NvcGUuY2FydENvbnRlbnQ9Y2FydENvbnRlbnQ7XG5cbiBcdCRzY29wZS5yZW1vdmU9IGZ1bmN0aW9uKG9yZGVySWQpIHtcbiBcdFx0Q2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQob3JkZXJJZClcbiBcdFx0LnRoZW4oZnVuY3Rpb24obmV3Q2FydCl7XG4gXHRcdFx0JHNjb3BlLmNhcnRDb250ZW50ID0gbmV3Q2FydDtcbiBcdFx0fSkuY2F0Y2goJGxvZylcbiBcdH1cblxuIFx0JHNjb3BlLmNoYW5nZVF1YW50aXR5PSBmdW5jdGlvbiAoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eShjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KTtcbiAgICAgICAgJHNjb3BlLmNhcnRDb250ZW50ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICB9O1xuXG4gICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG4gICRzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0b3RhbCA9IDA7XG4gICAgY2FydENvbnRlbnQuZm9yRWFjaChjYXJ0ID0+IHRvdGFsICs9IChjYXJ0LnByaWNlICogY2FydC5xdWFudGl0eSkpXG5cbiAgICByZXR1cm4gdG90YWw7XG4gIH1cbiB9KVxuXG4iLCIgYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gXHQkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiBcdFx0dXJsOicvY2FydCcsXG4gXHRcdHRlbXBsYXRlVXJsOidqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gXHRcdGNvbnRyb2xsZXI6J0NhcnRDdHJsJyxcbiBcdFx0cmVzb2x2ZTp7XG4gXHRcdFx0Y2FydENvbnRlbnQ6ZnVuY3Rpb24oQ2FydEZhY3Rvcnkpe1xuXG4gXHRcdFx0XHRyZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpO1xuXG4gXHRcdFx0fVxuIFx0XHR9XG4gXHR9KVxuIH0pXG5cbiIsImFwcC5jb250cm9sbGVyKCdDaGVja291dEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGl0ZW1zKVxuICAgICAgICAkc2NvcGUuaXRlbXMgPSBpdGVtcztcblxuICBcdFx0XHQvL2NhbGN1bGF0aW5nIHRvdGFsIHByaWNlIGFuZCBwdXQgdGhhdCBpbnRvICRzY29wZS50b3RhbFxuICAgICAgICB2YXIgaXRlbXNBcnIgPSBpdGVtcztcbiAgICAgICAgdmFyIHRvdGFsUHJpY2VFYWNoID0gW107XG4gICAgICAgIGl0ZW1zQXJyLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgIFx0dG90YWxQcmljZUVhY2gucHVzaChlbGVtZW50LnByaWNlICogZWxlbWVudC5xdWFudGl0eSk7XG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS50b3RhbCA9IHRvdGFsUHJpY2VFYWNoLnJlZHVjZSggKHByZXYsIGN1cnIpID0+IHByZXYgKyBjdXJyICk7XG4gICAgfSlcblxuICAgICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2hlY2tvdXQnLCB7XG4gICAgICAgIHVybDogJy9jaGVja291dCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY2hlY2tvdXQvY2hlY2tvdXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDaGVja291dEN0cmwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Jlc2V0Jywge1xuICAgICAgICB1cmw6ICcvcmVzZXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Jlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGFzc3dvcmQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldC9wYXNzd29yZC86dG9rZW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Bhc3N3b3JkLnJlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgQXV0aEZhY3RvcnksICRzdGF0ZVBhcmFtcywgQ2FydEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgJHNjb3BlLnRva2VuID0gJHN0YXRlUGFyYW1zLnRva2VuO1xuXG4gICAgJHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKGVtYWlsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdDaGVjayB5b3VyIGVtYWlsJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgcGFzc3dvcmQpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZChwYXNzd29yZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJGxvZywgQ2FydEZhY3RvcnksIHRvdGFsQ29zdCwgYXJyYXlPZkl0ZW1zKXtcbiAgJHNjb3BlLmluZm8gPSB7fTtcbiAgXG4gICRzY29wZS52YWxpZGF0ZVVzZXI9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUuaW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNob3dDQyA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgICAgIFxuICB9XG4gICRzY29wZS50b3RhbENvc3QgPSB0b3RhbENvc3Q7XG4gICRzY29wZS5hcnJheU9mSXRlbXMgPSBhcnJheU9mSXRlbXM7XG4gICRzY29wZS5zdHJpbmdPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0udGl0bGUpLmpvaW4oJywnKVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXltZW50Jywge1xuICAgICAgICB1cmw6ICcvcGF5bWVudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcGF5bWVudC9wYXltZW50Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQYXltZW50Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB0b3RhbENvc3Q6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QoKSB9LFxuICAgICAgICAgIGFycmF5T2ZJdGVtczogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKSB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHRoZVByb2R1Y3QsIGFsbFJldmlld3MsIFByb2R1Y3RGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuICAgIC8vIHByb2R1Y3RcbiAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgJHNjb3BlLnByb2R1Y3QgPSB0aGVQcm9kdWN0O1xuICAgICRzY29wZS5yZXZpZXdzID0gYWxsUmV2aWV3cztcbiAgICAvLyByZXZpZXdcbiAgICAkc2NvcGUubW9kYWxPcGVuID0gZmFsc2U7XG4gICAgJHNjb3BlLnN1Ym1pdFJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLm5ld1Jldmlldy5wcm9kdWN0SWQgPSAkc2NvcGUucHJvZHVjdC5pZDtcbiAgICAgICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUubmV3UmV2aWV3KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXZpZXdzID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cztcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhJywgMTAwMCk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gYWRkIHRvIGNhcnRcbiAgICAkc2NvcGUuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5xdWFudGl0eSlcbiAgICB9O1xuICAgICRzY29wZS5hcnJheU1ha2VyID0gZnVuY3Rpb24gKG51bSl7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD1udW07IGkgKyspe1xuICAgICAgICAgICAgYXJyLnB1c2goaSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH1cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aEZhY3RvcnksICRzdGF0ZSkge1xuICAgICRzY29wZS5zaWdudXAgPSB7fTtcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LnNpZ251cChzaWdudXBJbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gJ2VtYWlsIGV4aXN0cyBhbHJlYWR5Jykge1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVc2VyIGFscmVhZHkgZXhpc3RzJywgMjAwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1N0b3JlQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHByb2R1Y3RzKSB7XG4gICAgJHNjb3BlLnByb2R1Y3RzID0gcHJvZHVjdHM7XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc3RvcmUnLCB7XG4gICAgICAgIHVybDogJy9zdG9yZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc3RvcmUvc3RvcmUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTdG9yZUN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBwcm9kdWN0czogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ09yZGVySGlzdG9yaWVzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZENhcnQgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9wYWlkLydcbiAgICB2YXIgb3JkZXJIaXN0b3JpZXNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBvcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRDYXJ0KVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiBcblxuICAgIHJldHVybiBvcmRlckhpc3Rvcmllc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0F1dGhGYWN0b3J5JywgIGZ1bmN0aW9uKCRodHRwKXtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgdmFyIEF1dGhGYWN0b3J5ID0ge307XG5cblxuICAgIEF1dGhGYWN0b3J5LnNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbykudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2F1dGgvZ29vZ2xlJyk7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgbG9naW4pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9yZXNldC9wYXNzd29yZC8nICsgdG9rZW4sIGxvZ2luKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2ZvcmdvdCcsIGVtYWlsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQXV0aEZhY3Rvcnk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdDYXJ0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCwgJGxvZywgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9jYXJ0Lyc7XG4gICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpdGVtLmltYWdlVXJsID0gJy9hcGkvcHJvZHVjdHMvJyArIGl0ZW0ucHJvZHVjdElkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgICB2YXIgQ2FydEZhY3RvcnkgPSB7fTtcbiAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gW107XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zb3J0KGZ1bmN0aW9uIChhLGIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBiLmlkIC0gYS5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3VwZGF0ZUNhcnQnLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZGVsZXRlSXRlbSA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIHByb2R1Y3RJZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja0ZvckR1cGxpY2F0ZXMgPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICB2YXIgZHVwbGljYXRlID0gdGhpcy5jYWNoZWRDYXJ0LmZpbHRlcihpdGVtID0+IGl0ZW0ucHJvZHVjdElkID09PSBwcm9kdWN0SWQpO1xuICAgICAgICByZXR1cm4gKGR1cGxpY2F0ZS5sZW5ndGgpID8gZHVwbGljYXRlWzBdIDogbnVsbDtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBxdWFudGl0eSkge1xuICAgICAgICB2YXIgZHVwbGljYXRlID0gQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzKHByb2R1Y3RJZCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeVxuICAgICAgICAgICAgLmNoYW5nZVF1YW50aXR5KGR1cGxpY2F0ZS5pZCwgZHVwbGljYXRlLnF1YW50aXR5LCAnYWRkJywgcXVhbnRpdHkgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArIHByb2R1Y3RJZCwge3F1YW50aXR5OiBxdWFudGl0eX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydD1mdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCtvcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpe1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUob3JkZXJJZClcbiAgICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5PWZ1bmN0aW9uKG9yZGVySWQsIHF1YW50aXR5LCBhZGRPclN1YnRyLCBhbW91bnQgPSAxKXtcbiAgICAgICAgdmFyIHJ1bkZ1bmM9ZmFsc2U7XG4gICAgICAgIGlmIChhZGRPclN1YnRyPT09J2FkZCcpIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcXVhbnRpdHkrPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFkZE9yU3VidHI9PT0nc3VidHJhY3QnICYmIHF1YW50aXR5PjEpIHtcbiAgICAgICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICAgICAgcXVhbnRpdHktPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5GdW5jPT09dHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgb3JkZXJJZCwge3F1YW50aXR5OnF1YW50aXR5fSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eShvcmRlcklkLHF1YW50aXR5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUgPSBmdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZvckVhY2goZnVuY3Rpb24ob3JkZXIsaSl7XG4gICAgICAgICAgICBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIGluZGV4ID0gaTtcbiAgICAgICAgfSlcblxuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkgPSBmdW5jdGlvbiAob3JkZXJJZCxxdWFudGl0eSkge1xuICAgICAgICB2YXIgaSA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZmluZEluZGV4KGZ1bmN0aW9uKG9yZGVyKXtcbiAgICAgICAgICAgIC8vIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkge1xuICAgICAgICAgICAgLy8gICAgIG9yZGVyLnF1YW50aXR5ID0gcXVhbnRpdHk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICByZXR1cm4gb3JkZXIuaWQgPT09IG9yZGVySWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0W2ldLnF1YW50aXR5ID0gcXVhbnRpdHlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdvcmRlckhpc3RvcmllcycpO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoMCwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5sZW5ndGgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIFNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFJlbW92ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgJCgnI2NhcnQtaWNvbicpLmFkZENsYXNzKCdhbmltYXRlZCBzaGFrZScpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgc2hha2UnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5wdXNoKHJldmlldyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5O1xuXG59KVxuIiwiYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlciA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vyc1t1cGRhdGVkSW5kXSA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2Vycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50ID0gZnVuY3Rpb24gKGluZm9PYmope1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgICAgIGlmKHVzZXIuaWQgPT09ICdzZXNzaW9uJyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVNlc3Npb25DYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXBkYXRlVXNlcih1c2VyLmlkLGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVVc2VyQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gVXNlckZhY3Rvcnk7XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnc2hvcHBpbmdDYXJ0JywgZnVuY3Rpb24oQ2FydEZhY3RvcnksICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgYWN0aXZlOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbigndXBkYXRlQ2FydCcsIGZ1bmN0aW9uIChldmVudCwgY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBjYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNjb3BlLnJldmVhbENhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQgY2hlY2tvdXQtLWFjdGl2ZSc7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuaGlkZUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuYWN0aXZlID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuY2FydClcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSAqIGl0ZW0ucXVhbnRpdHkpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdTaG9wJywgc3RhdGU6ICdzdG9yZScgfSxcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5N3B4IC0zMDZweCcpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudW50b2dnbGVMb2dvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5M3B4IC05cHgnKVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCdvYXV0aEJ1dHRvbicsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgcHJvdmlkZXJOYW1lOiAnQCdcbiAgICB9LFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ29yZGVyRW50cnknLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBvcmRlckRldGFpbHM6ICc9JyxcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHMsIGUsIGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHMub3JkZXJEZXRhaWxzKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3J5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cdFxufSkiLCJhcHAuZGlyZWN0aXZlKCdvcmRlckhpc3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBoaXN0b3JpZXM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3J5Q3RybCdcbiAgICB9XG59KVxuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0RW50cnknLCBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3Q6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdFVwZGF0ZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIvLyBhcHAuZGlyZWN0aXZlKCdzdGFyUmF0aW5nJywgZnVuY3Rpb24gKCkge1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICByZXN0cmljdDogJ0VBJyxcbi8vICAgICAgIHRlbXBsYXRlOlxuLy8gICAgICAgICAnPHNwYW4gY2xhc3M9XCJzdGFyc1wiPicgK1xuLy8gICAgICAgICAgJzxkaXYgY2xhc3M9XCJzdGFycy1maWxsZWQgbGVmdFwiPicgK1xuLy8gICAgICAgICAgICAgJzxzcGFuPuKYhTwvc3Bhbj4nICtcbi8vICAgICAgICAgICc8L2Rpdj4nICtcbi8vICAgICAgICc8L3NwYW4+J1xuLy8gICAgIH07XG4vLyB9KVxuIiwiIC8vIGFwcC5jb250cm9sbGVyKCdTZWFyY2hCYXJDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcbiAvLyBcdCRzY29wZS5wcm9kdWN0PVxuIC8vIH0pIiwiYXBwLmRpcmVjdGl2ZSgnc2VhcmNoQmFyJywgZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5odG1sJyxcblx0XHRjb250cm9sbGVyOidQcm9kdWN0Q2FyZEN0cmwnXG5cdH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJFbnRyeScsIGZ1bmN0aW9uIChVc2VyRmFjdG9yeSwgQXV0aEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgICAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoe2VtYWlsOiBlbWFpbH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRG9uZScsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAodXNlcklkKSB7XG4gICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIodXNlcklkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0VyYXNlIGZyb20gcGxhbmV0IEVhcnRoJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlck9yZGVyJywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXJPcmRlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSkiLCJcbmFwcC5kaXJlY3RpdmUoJ2NsaWNrQW55d2hlcmVCdXRIZXJlJywgZnVuY3Rpb24oJGRvY3VtZW50KXtcbiAgcmV0dXJuIHtcbiAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgIGNsaWNrQW55d2hlcmVCdXRIZXJlOiAnJidcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbCwgYXR0cikge1xuXG4gICAgICAgICAgICAgICAkKCcubG9nbycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICBcblxuICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmlkICE9PSAnY2FydC1pY29uJyAmJiBlLnRhcmdldC5pZCAhPT0gJ2FkZC10by1jYXJ0LWJ1dHRvbicpIHtcbiAgICAgICAgICAgICAgICAgICBpZiAoZWwgIT09IGUudGFyZ2V0ICYmICFlbFswXS5jb250YWlucyhlLnRhcmdldCkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWwoc2NvcGUuY2xpY2tBbnl3aGVyZUJ1dEhlcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIH1cbiAgICAgICAgfVxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
