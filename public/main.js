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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInN0b3JlL3N0b3JlLmNvbnRyb2xsZXIuanMiLCJzdG9yZS9zdG9yZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvT3JkZXJIaXN0b3JpZXMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuY29udHJvbGxlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvdHdpdHRlci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvdHdpdHRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9jYXJ0LXJldmVhbC9jYXJ0LXJldmVhbC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yZXZpZXctZW50cnkvc3Rhci1yYXRpbmcuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91dGlsaXR5L2NsaWNrQW55d2hlcmVCdXRIZXJlLmRpcmVjdGl2ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxRQUFBLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBNkJBLGVBQUEsYUFBQSxHQUFBLGlCQUFBO0FBQ0EsQ0F2Q0E7O0FDcEJBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsUUFEQTtBQUVBLG9CQUFBLGlCQUZBO0FBR0EscUJBQUE7QUFIQSxLQUFBO0FBTUEsQ0FUQTs7QUFXQSxJQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTs7QUFFQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEVBQUEsT0FBQSxDQUFBLGFBQUEsQ0FBQTtBQUVBLENBTEE7O0FDVkEsSUFBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQSxlQUFBLEVBQUEsbUJBQUEsRUFBQTs7QUFFQSxXQUFBLFFBQUEsR0FBQSxXQUFBO0FBQ0EsV0FBQSxLQUFBLEdBQUEsUUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLGFBQUE7O0FBRUE7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esd0JBQUEsTUFBQSxHQUFBLE1BQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7O0FBT0E7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxRQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esd0JBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7QUFNQSxzQkFBQSxnQkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsR0FBQSxFQUFBLFdBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxzQkFBQSxFQUFBLE9BQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLE1BQUE7QUFFQSxDQTlCQTs7QUNEQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUNBLEtBREEsQ0FDQSxPQURBLEVBQ0E7QUFDQSxhQUFBLFFBREE7QUFFQSxxQkFBQSxxQkFGQTtBQUdBLG9CQUFBLFdBSEE7QUFJQSxpQkFBQTtBQUNBLHlCQUFBLHFCQUFBLGNBQUEsRUFBQTtBQUNBLHVCQUFBLGVBQUEsUUFBQSxFQUFBO0FBQ0EsYUFIQTtBQUlBLHNCQUFBLGtCQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLFlBQUEsUUFBQSxFQUFBO0FBQ0EsYUFOQTtBQU9BLDZCQUFBLHlCQUFBLG1CQUFBLEVBQUE7QUFDQSx1QkFBQSxvQkFBQSxRQUFBLEVBQUE7QUFDQSxhQVRBO0FBVUEsMkJBQUEsdUJBQUEsbUJBQUEsRUFBQTtBQUNBLHVCQUFBLG9CQUFBLGtCQUFBLEVBQUE7QUFDQTtBQVpBO0FBSkEsS0FEQTtBQW9CQSxDQXJCQTs7QUNBQSxJQUFBLFVBQUEsQ0FBQSxVQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxXQUFBLFdBQUEsR0FBQSxXQUFBOztBQUVBLFdBQUEsTUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esb0JBQUEsY0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxPQUFBLEVBQUE7QUFDQSxtQkFBQSxXQUFBLEdBQUEsT0FBQTtBQUNBLFNBSEEsRUFHQSxLQUhBLENBR0EsSUFIQTtBQUlBLEtBTEE7O0FBT0EsV0FBQSxjQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLGFBQUEsRUFBQTtBQUNBLG9CQUFBLGNBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLGFBQUE7QUFDQSxlQUFBLFdBQUEsR0FBQSxZQUFBLFVBQUE7QUFDQSxLQUhBOztBQUtBLFdBQUEsUUFBQSxHQUFBLFlBQUEsUUFBQTs7QUFFQSxXQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxRQUFBLENBQUE7QUFDQSxvQkFBQSxPQUFBLENBQUE7QUFBQSxtQkFBQSxTQUFBLEtBQUEsS0FBQSxHQUFBLEtBQUEsUUFBQTtBQUFBLFNBQUE7O0FBRUEsZUFBQSxLQUFBO0FBQ0EsS0FMQTtBQU1BLENBdkJBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGFBQUEsT0FEQTtBQUVBLHFCQUFBLG1CQUZBO0FBR0Esb0JBQUEsVUFIQTtBQUlBLGlCQUFBO0FBQ0EseUJBQUEscUJBQUEsV0FBQSxFQUFBOztBQUVBLHVCQUFBLFlBQUEsZ0JBQUEsRUFBQTtBQUVBO0FBTEE7QUFKQSxLQUFBO0FBWUEsQ0FiQTs7QUNBQSxJQUFBLFVBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsR0FBQSxDQUFBLEtBQUE7QUFDQSxlQUFBLEtBQUEsR0FBQSxLQUFBOztBQUVBO0FBQ0EsWUFBQSxXQUFBLEtBQUE7QUFDQSxZQUFBLGlCQUFBLEVBQUE7QUFDQSxpQkFBQSxPQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSwyQkFBQSxJQUFBLENBQUEsUUFBQSxLQUFBLEdBQUEsUUFBQSxRQUFBO0FBQ0EsU0FGQTtBQUdBLGVBQUEsS0FBQSxHQUFBLGVBQUEsTUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLElBQUE7QUFBQSxtQkFBQSxPQUFBLElBQUE7QUFBQSxTQUFBLENBQUE7QUFDQSxLQVpBOztBQWNBLFdBQUEsUUFBQSxHQUFBLFlBQUEsUUFBQTtBQUVBLENBbEJBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLGFBQUEsV0FEQTtBQUVBLHFCQUFBLDJCQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBO0FBS0EsQ0FOQTs7QUNBQSxDQUFBLFlBQUE7O0FBRUE7O0FBRUE7O0FBQ0EsUUFBQSxDQUFBLE9BQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxLQUFBLENBQUEsd0JBQUEsQ0FBQTs7QUFFQSxRQUFBLE1BQUEsUUFBQSxNQUFBLENBQUEsYUFBQSxFQUFBLEVBQUEsQ0FBQTs7QUFFQSxRQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsWUFBQTtBQUNBLFlBQUEsQ0FBQSxPQUFBLEVBQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHNCQUFBLENBQUE7QUFDQSxlQUFBLE9BQUEsRUFBQSxDQUFBLE9BQUEsUUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUNBLEtBSEE7O0FBS0E7QUFDQTtBQUNBO0FBQ0EsUUFBQSxRQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0Esc0JBQUEsb0JBREE7QUFFQSxxQkFBQSxtQkFGQTtBQUdBLHVCQUFBLHFC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RUFHQSxRQUhBO0FBTEEsU0FBQTs7QUFZQSxpQkFBQSxJQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLGdCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsV0FBQSxHQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsV0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxhQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsUUFBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLDhCQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsR0FBQSxHQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLFlBQUEsaUJBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsU0FBQSxNQUFBO0FBQ0EsZ0JBQUEsSUFBQSxhQUFBLE1BQUEsR0FBQSxJQUFBO0FBQ0EsZ0JBQUEsSUFBQSxjQUFBLEtBQUEsTUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLGdCQUFBLFFBQUEsWUFBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7O0FBRUEsbUJBQUEsS0FDQSxZQURBLEdBQ0EsU0FEQSxHQUNBLGtCQURBLEdBQ0EsS0FEQSxHQUNBLEdBREEsR0FFQSxXQUZBLEdBRUEsU0FGQSxHQUVBLFNBRkEsR0FFQSxTQUZBLEdBRUEsS0FGQSxHQUVBLFFBRkEsR0FHQSxNQUhBO0FBSUE7O0FBRUEsWUFBQSxNQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFB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QUFBLFNBQUEsR0FBQSxTQUFBO0FBQ0EsV0FBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsYUFBQSxHQUFBLGFBQUEsR0FBQSxDQUFBO0FBQUEsZUFBQSxLQUFBLEtBQUE7QUFBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQTtBQUNBLENBZEE7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxhQUFBLFVBREE7QUFFQSxxQkFBQSx5QkFGQTtBQUdBLG9CQUFBLGFBSEE7QUFJQSxpQkFBQTtBQUNBLHVCQUFBLG1CQUFBLFdBQUEsRUFBQTtBQUFBLHVCQUFBLFlBQUEsWUFBQSxFQUFBO0FBQUEsYUFEQTtBQUVBLDBCQUFBLHNCQUFBLFdBQUEsRUFBQTtBQUFBLHVCQUFBLFlBQUEsZ0JBQUEsRUFBQTtBQUFBO0FBRkE7QUFKQSxLQUFBO0FBU0EsQ0FWQTs7QUNBQSxJQUFBLFVBQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLFVBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0E7QUFDQSxXQUFBLFNBQUEsR0FBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLEdBQUEsVUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBLFVBQUE7QUFDQTtBQUNBLFdBQUEsU0FBQSxHQUFBLEtBQUE7QUFDQSxXQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxTQUFBLENBQUEsU0FBQSxHQUFBLE9BQUEsT0FBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxZQUFBLENBQUEsT0FBQSxPQUFBLENBQUEsRUFBQSxFQUFBLE9BQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsbUJBQUEsT0FBQSxHQUFBLGVBQUEsYUFBQTtBQUNBLG1CQUFBLFNBQUEsR0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFlBQUEsRUFBQSxJQUFBO0FBQ0EsU0FKQSxFQUlBLEtBSkEsQ0FJQSxZQUFBO0FBQ0Esd0JBQUEsS0FB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QSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLFVBQUEsbUJBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUEsbUJBQUEsS0FBQSxTQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNBLEtBSEE7QUFJQSxRQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsU0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsWUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLFNBWEEsQ0FBQTtBQVlBLEtBYkE7O0FBZUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxnQkFBQSxrQkFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUFBLG1CQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUE7QUFBQSxTQUFBLENBQUE7QUFDQSxlQUFBLFVBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLFlBQUEsWUFBQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsWUFDQSxjQURBLENBQ0EsVUFBQSxFQURBLEVBQ0EsVUFBQSxRQURBLEVBQ0EsS0FEQSxFQUNBLFFBREEsQ0FBQTtBQUVBLFNBSEEsTUFHQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUEsRUFBQSxVQUFBLFFBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUNBLGFBTEEsQ0FBQTtBQU1BO0FBQ0E7QUFDQSxLQWhCQTs7QUFrQkEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0E7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsT0FBQSxFQUNBLE9BREEsQ0FDQSxZQUFBO0FBQ0Esd0JBQUEsdUJBQUEsQ0FBQSxPQUFBO0FBQ0EsU0FIQSxFQUlBLElBSkEsQ0FJQSxZQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FOQSxDQUFBO0FBT0EsS0FUQTtBQVVBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUEsVUFBQSxFQUFBO0FBQUEsWUFBQSxNQUFBLHlEQUFBLENBQUE7O0FBQ0EsWUFBQSxVQUFBLEtBQUE7QUFDQSxZQUFBLGVBQUEsS0FBQSxFQUFBO0FBQ0E7QUFDQSx3QkFBQSxDQUFBLE1BQUE7QUFDQSxzQkFBQSxJQUFBO0FBQ0EsU0FKQSxNQUtBLElBQUEsZUFBQSxVQUFBLElBQUEsV0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBLHdCQUFBLENBQUEsTUFBQTtBQUNBLHNCQUFBLElBQUE7QUFDQTtBQUNBLFlBQUEsWUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0E7QUFEQSxhQUVBLElBRkEsQ0FFQSxZQUFBO0FBQ0EsNEJBQUEsMkJBQUEsQ0FBQSxPQUFBLEVBQUEsUUFBQTtBQUNBLGFBSkEsQ0FBQTtBQUtBO0FBR0EsS0FyQkE7O0FBdUJBLGdCQUFBLHVCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUE7QUFDQSxvQkFBQSxVQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxTQUZBOztBQUlBLG9CQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxLQVBBOztBQVNBLGdCQUFBLDJCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxJQUFBLFlBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxvQkFBQSxVQUFBLENBQUEsQ0FBQSxFQUFBLFFBQUEsR0FBQSxRQUFBO0FBQ0EsS0FSQTs7QUFVQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUEsZ0JBQUE7QUFDQSx3QkFBQSxVQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxZQUFBLFVBQUEsQ0FBQSxNQUFBO0FBQ0EsU0FKQSxFQUtBLEtBTEEsQ0FLQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsZ0JBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLFFBQUEsQ0FBQTtBQUNBLGVBQUEsWUFBQSxnQkFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxJQUFBO0FBQ0EsaUJBQUEsT0FBQSxDQUFBO0FBQUEsdUJBQUEsU0FBQSxLQUFBLEtBQUEsR0FBQSxLQUFBLFFBQUE7QUFBQSxhQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBO0FBQ0EsbUJBQUEsS0FBQTtBQUNBLFNBTkEsRUFPQSxLQVBBLENBT0EsS0FBQSxLQVBBLENBQUE7QUFRQSxLQVZBOztBQWFBLFFBQUEsZUFBQSw4RUFBQTs7QUFFQSxhQUFBLG1CQUFBLEdBQUE7QUFDQSxVQUFBLFlBQUEsRUFBQSxRQUFBLENBQUEscUJBQUEsRUFBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxjQUFBLFlBQUEsRUFBQSxXQUFBLENBQUEscUJBQUE7QUFDQSxTQUZBO0FBR0E7O0FBSUEsYUFBQSxrQkFBQSxHQUFBO0FBQ0EsVUFBQSxZQUFBLEVBQUEsUUFBQSxDQUFBLGdCQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsU0FGQTtBQUdBOztBQUVBLGdCQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBRUEsQ0EzSkE7O0FDQUEsSUFBQSxPQUFBLENBQUEscUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLHFCQUFBLEVBQUE7QUFDQSxRQUFBLG1CQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsb0JBQUE7QUFDQSxRQUFBLHNCQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLHdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGtCQUFBO0FBQ0EsbUJBQUEsa0JBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLHdCQUFBLGtCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGdCQUFBO0FBQ0EsbUJBQUEsZ0JBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLHdCQUFBLFVBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLENBQUE7QUFFQSxLQUhBOztBQUtBLHdCQUFBLFFBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxPQUFBLEdBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLENBQUE7QUFFQSxLQUhBOztBQUtBLHdCQUFBLFlBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGlCQUFBLFNBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHVCQUFBLFVBQUEsRUFBQSxLQUFBLFdBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSw2QkFBQSxVQUFBLElBQUEsU0FBQTtBQUNBLG1CQUFBLFNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBO0FBWUEsd0JBQUEsZUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsT0FEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGlCQUFBLFNBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHVCQUFBLFVBQUEsRUFBQSxLQUFBLFdBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSw2QkFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLFdBQUEsbUJBQUE7QUFFQSxDQTNEQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUEsVUFBQSxnQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLGVBQUEsU0FBQSxZQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxPQUFBLE9BQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEdBQUEsSUFBQTtBQUNBLGVBQUEsTUFBQTtBQUNBLEtBSkE7O0FBTUEsUUFBQSxpQkFBQSxFQUFBO0FBQ0EsbUJBQUEsY0FBQSxHQUFBLEVBQUE7QUFDQSxtQkFBQSxhQUFBLEdBQUEsRUFBQTs7QUFFQSxtQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxHQUFBLENBQUEsZUFBQSxPQUFBLENBQUE7QUFDQSxTQUhBLEVBR0EsSUFIQSxDQUdBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxlQUFBLGNBQUEsRUFEQSxDQUNBO0FBQ0EsMkJBQUEsY0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsZUFBQSxjQUFBO0FBQ0EsU0FUQSxDQUFBO0FBVUEsS0FYQTs7QUFhQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLEVBR0EsSUFIQSxDQUdBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBO0FBQ0EsbUJBQUEsT0FBQTtBQUNBLFNBVkEsQ0FBQTtBQVdBLEtBWkE7O0FBY0EsbUJBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxPQUFBLENBQUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsZUFBQSxjQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDJCQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQU5BLENBQUE7QUFPQSxLQVJBOztBQVVBLG1CQUFBLFNBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLENBQUE7QUFJQSxLQUxBOztBQU9BLG1CQUFBLE9BQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQSxHQUFBLFFBQUE7QUFDQSxlQUFBLE9BQUE7QUFDQSxLQUhBOztBQUtBLG1CQUFBLFlBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLGtCQUFBLFNBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsU0FBQSxhQUFBLFNBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxNQUFBO0FBQ0EsbUJBQUEsTUFBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsbUJBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxrQkFBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGVBQUEsYUFBQTtBQUNBLG1CQUFBLGVBQUEsYUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLFdBQUEsY0FBQTtBQUVBLENBbkZBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBOztBQUVBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLGFBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsS0FBQSxFQUFBLFdBQUEsRUFEQSxDQUNBO0FBQ0Esd0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxXQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFZQSxnQkFBQSxRQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBBOztBQVNBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0Esd0JBQUEsVUFBQSxJQUFBLElBQUE7QUFDQSxtQkFBQSxJQUFBO0FBQ0EsU0FSQSxDQUFBO0FBU0EsS0FWQTs7QUFZQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZ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LEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLElBQUEsYUFBQSxLQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQSxPQUFBLFFBQUEsUUFBQSxLQUFBLFFBQUE7QUFDQSxTQUhBO0FBSUEsS0FMQTtBQU1BLFdBQUEsWUFBQSxHQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsYUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBLEtBQ0E7QUFDQSxvQkFBQSxNQUFBLGNBQUEsTUFBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsUUFBQSxLQUFBO0FBQ0EsdUJBQUEsUUFBQSxLQUFBLENBQUEsU0FBQSxDQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsV0FBQSxNQUFBLGNBQUEsV0FBQSxFQUFBO0FBQ0E7QUFFQSxTQVJBO0FBU0EsS0FWQTtBQVdBLFdBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQUEsWUFBQSxHQUFBLHlEQUFBLENBQUE7QUFBQSxZQUFBLEdBQUEseURBQUEsSUFBQTs7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsUUFBQSxLQUFBLElBQUEsR0FBQSxJQUFBLFFBQUEsS0FBQSxJQUFBLEdBQUE7QUFDQSxTQUZBO0FBR0EsS0FKQTtBQUtBLFdBQUEsV0FBQSxHQUFBLFlBQUE7QUFBQSxZQUFBLFFBQUEseURBQUEsV0FBQTs7QUFDQSxZQUFBLGFBQUEsV0FBQSxFQUFBLE9BQUEsSUFBQSxDQUFBLEtBQ0EsSUFBQSxhQUFBLEtBQUEsRUFBQSxPQUFBLE9BQUEsQ0FBQSxLQUNBLElBQUEsYUFBQSxNQUFBLEVBQUEsT0FBQSxRQUFBO0FBQ0EsS0FKQTtBQUtBLENBakRBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSxxREFGQTtBQUdBLGVBQUE7QUFDQSxzQkFBQTtBQURBLFNBSEE7QUFNQSxvQkFBQTtBQU5BLEtBQUE7QUFRQSxDQVRBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEscUJBQUEsdURBRkE7QUFHQSxlQUFBO0FBQ0EscUJBQUEsR0FEQTtBQUVBLHFCQUFBO0FBRkEsU0FIQTtBQU9BLGNBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLFlBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLCtCQUFBLGFBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxPQUFBO0FBQ0EsYUFGQTtBQUdBLGtCQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLCtCQUFBLGFBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBO0FBZEEsS0FBQTtBQWdCQSxDQWpCQTs7QUNBQSxJQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxlQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSx5REFGQTtBQUdBLGNBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxrQkFBQSxRQUFBLEdBQUEsZ0JBQUEsaUJBQUEsRUFBQTtBQUNBO0FBTEEsS0FBQTtBQVFBLENBVkE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQ0ZBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSxpREFGQTtBQUdBLG9CQUFBO0FBSEEsS0FBQTtBQUtBLENBTkE7O0FDQUEsSUFBQSxTQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEscUJBQUEsaURBRkE7QUFHQSxlQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBO0FBRkEsU0FIQTtBQU9BLGNBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLDRCQUFBLGNBQUEsQ0FBQSxFQUFBLE9BQUEsS0FBQSxFQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxnQ0FBQSxLQUFBLENBQUEsTUFBQSxFQUFBLElBQUE7QUFDQSxpQkFGQSxFQUVBLEtBRkEsQ0FFQSxZQUFBO0FBQ0EsZ0NBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUpBO0FBS0EsYUFOQTtBQU9BLGtCQUFBLFVBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLDRCQUFBLFVBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxnQ0FBQSxLQUFBLENBQUEseUJBQUEsRUFBQSxJQUFBO0FBQ0EsaUJBRkEsRUFFQSxLQUZBLENBRUEsWUFBQTtBQUNBLGdDQUFBLEtBQUEsQ0FBQSw0QkFBQSxFQUFBLElBQUE7QUFDQSxpQkFKQTtBQUtBLGFBTkE7QUFPQTtBQXRCQSxLQUFBO0FBd0JBLENBekJBOztBQ0FBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLG1CQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLGlEQUZBO0FBR0EsZUFBQTtBQUNBLHVCQUFBLEdBREE7QUFFQSxxQkFBQTtBQUZBLFNBSEE7QUFPQSxjQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxrQkFBQSxZQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxvQ0FBQSxZQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsT0FBQTtBQUNBLGFBRkE7QUFHQSxrQkFBQSxlQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxvQ0FBQSxlQUFBLENBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQTtBQWRBLEtBQUE7QUFnQkEsQ0FqQkE7O0FDQ0EsSUFBQSxTQUFBLENBQUEsc0JBQUEsRUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFdBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEsZUFBQTtBQUNBLGtDQUFBO0FBREEsU0FGQTtBQUtBLGNBQUEsY0FBQSxLQUFBLEVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTs7QUFFQSxjQUFBLE9BQUEsRUFBQSxFQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esa0JBQUEsZUFBQTtBQUNBLGFBRkE7O0FBTUEsc0JBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLG9CQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsS0FBQSxXQUFBLElBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxLQUFBLG9CQUFBLEVBQUE7QUFDQSx3QkFBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLENBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUE7QUFDQSw4QkFBQSxNQUFBLENBQUEsWUFBQTs7QUFFQSxrQ0FBQSxLQUFBLENBQUEsTUFBQSxvQkFBQTtBQUNBLHlCQUhBO0FBSUE7QUFDQTtBQUNBLGFBVEE7QUFXQTtBQXhCQSxLQUFBO0FBMEJBLENBM0JBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydhbmd1bGlrZScsICdmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICd1aS5tYXRlcmlhbGl6ZScsICdhbmd1bGFyLWlucHV0LXN0YXJzJywnYW5ndWxhci1zdHJpcGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICR1aVZpZXdTY3JvbGxQcm92aWRlcixzdHJpcGVQcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xuICAgICR1aVZpZXdTY3JvbGxQcm92aWRlci51c2VBbmNob3JTY3JvbGwoKTtcblxuICAgIC8vIHN0cmlwZVByb3ZpZGVyLnNldFB1Ymxpc2hhYmxlS2V5KCdteV9rZXknKTtcblxufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgJHJvb3RTY29wZS5mYWNlYm9va0FwcElkID0gJzk0MTAzODI4MjY4NjI0Mic7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsIlxuYXBwLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIGFsbFVzZXJPcmRlcnMsICRsb2csIGFsbFByb2R1Y3RzLCBhbGxVc2VycywgYWxsT3JkZXJEZXRhaWxzLCBNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0cztcbiAgICAkc2NvcGUudXNlcnMgPSBhbGxVc2VycztcbiAgICAkc2NvcGUudXNlck9yZGVycyA9IGFsbFVzZXJPcmRlcnM7XG5cbiAgICAvL2FkZGluZyBzdGF0dXMgdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyhvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnN0YXR1cyA9IHN0YXR1cztcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG5cbiAgICAvL2FkZGluZyB1c2VyIGluZm8gdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwudXNlciA9IHVzZXI7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuICAgIGFsbE9yZGVyRGV0YWlscyA9IGFsbE9yZGVyRGV0YWlscy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLnVzZXJPcmRlcklkIC0gYi51c2VyT3JkZXJJZDtcbiAgICB9KTtcbiAgICBhbGxPcmRlckRldGFpbHMgPSBfLmdyb3VwQnkoYWxsT3JkZXJEZXRhaWxzLCAndXNlck9yZGVySWQnKVxuICAgICRzY29wZS5vcmRlcnMgPSAkLm1hcChhbGxPcmRlckRldGFpbHMsZnVuY3Rpb24gKG9yZGVyLCBpKSB7XG4gICAgICAgIGlmIChpKSByZXR1cm4gW29yZGVyXTtcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCRzY29wZS5vcmRlcnMpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FkbWluJywge1xuICAgICAgICB1cmw6ICcvYWRtaW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkbWluL2FkbWluLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWRtaW5DdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxsUHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJzOiBmdW5jdGlvbiAoVXNlckZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbE9yZGVyRGV0YWlsczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyT3JkZXJzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59KVxuIiwiIGFwcC5jb250cm9sbGVyKCdDYXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGxvZywgY2FydENvbnRlbnQsIENhcnRGYWN0b3J5KXtcbiBcdCRzY29wZS5jYXJ0Q29udGVudD1jYXJ0Q29udGVudDtcblxuIFx0JHNjb3BlLnJlbW92ZT0gZnVuY3Rpb24ob3JkZXJJZCkge1xuIFx0XHRDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydChvcmRlcklkKVxuIFx0XHQudGhlbihmdW5jdGlvbihuZXdDYXJ0KXtcbiBcdFx0XHQkc2NvcGUuY2FydENvbnRlbnQgPSBuZXdDYXJ0O1xuIFx0XHR9KS5jYXRjaCgkbG9nKVxuIFx0fVxuXG4gXHQkc2NvcGUuY2hhbmdlUXVhbnRpdHk9IGZ1bmN0aW9uIChjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5KGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpO1xuICAgICAgICAkc2NvcGUuY2FydENvbnRlbnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgIH07XG5cbiAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbiAgJHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvdGFsID0gMDtcbiAgICBjYXJ0Q29udGVudC5mb3JFYWNoKGNhcnQgPT4gdG90YWwgKz0gKGNhcnQucHJpY2UgKiBjYXJ0LnF1YW50aXR5KSlcblxuICAgIHJldHVybiB0b3RhbDsgIFxuICB9XG4gfSlcblxuICIsIiBhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiBcdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjYXJ0Jywge1xuIFx0XHR1cmw6Jy9jYXJ0JyxcbiBcdFx0dGVtcGxhdGVVcmw6J2pzL2NhcnQvY2FydC5odG1sJyxcbiBcdFx0Y29udHJvbGxlcjonQ2FydEN0cmwnLFxuIFx0XHRyZXNvbHZlOntcbiBcdFx0XHRjYXJ0Q29udGVudDpmdW5jdGlvbihDYXJ0RmFjdG9yeSl7XG5cbiBcdFx0XHRcdHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCk7XG5cbiBcdFx0XHR9XG4gXHRcdH1cbiBcdH0pXG4gfSlcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ0NoZWNrb3V0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIENhcnRGYWN0b3J5KSB7XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coaXRlbXMpXG4gICAgICAgICRzY29wZS5pdGVtcyA9IGl0ZW1zO1xuXG4gIFx0XHRcdC8vY2FsY3VsYXRpbmcgdG90YWwgcHJpY2UgYW5kIHB1dCB0aGF0IGludG8gJHNjb3BlLnRvdGFsXG4gICAgICAgIHZhciBpdGVtc0FyciA9IGl0ZW1zO1xuICAgICAgICB2YXIgdG90YWxQcmljZUVhY2ggPSBbXTtcbiAgICAgICAgaXRlbXNBcnIuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KXtcbiAgICAgICAgXHR0b3RhbFByaWNlRWFjaC5wdXNoKGVsZW1lbnQucHJpY2UgKiBlbGVtZW50LnF1YW50aXR5KTtcbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnRvdGFsID0gdG90YWxQcmljZUVhY2gucmVkdWNlKCAocHJldiwgY3VycikgPT4gcHJldiArIGN1cnIgKTtcbiAgICB9KVxuXG4gICAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjaGVja291dCcsIHtcbiAgICAgICAgdXJsOiAnL2NoZWNrb3V0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jaGVja291dC9jaGVja291dC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NoZWNrb3V0Q3RybCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzQWRtaW4gPSBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgcmV0dXJuIHVzZXIuaXNBZG1pbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckhpc3Rvcmllc0N0cmwnLCBmdW5jdGlvbiAoJGxvZywgJHNjb3BlLCBPcmRlckhpc3Rvcmllc0ZhY3RvcnkpIHtcblxuICAgIE9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJPcmRlcnNBcnIpIHtcblxuICAgICAgICB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGFyciwgaSl7XG4gICAgICAgICAgICBhcnIuZGF0ZSA9IG5ldyBEYXRlKHVzZXJPcmRlcnNBcnIuZGF0ZVtpXSkudG9TdHJpbmcoKTtcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgICRzY29wZS51c2VyT3JkZXJzID0gdXNlck9yZGVyc0Fyci5wYWlkSXRlbXM7XG4gICAgfSlcbiAgICAuY2F0Y2goJGxvZyk7XG4gICAgXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnb3JkZXJIaXN0b3JpZXMnLCB7XG4gICAgICAgIHVybDogJy9oaXN0b3JpZXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdPcmRlckhpc3Rvcmllc0N0cmwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2FuaW1hdGlvbicsIGZ1bmN0aW9uICgkc3RhdGUpIHtcbiAgICB2YXIgYW5pbWF0aW9uRW5kRXZlbnRzID0gJ3dlYmtpdEFuaW1hdGlvbkVuZCBvYW5pbWF0aW9uZW5kIG1zQW5pbWF0aW9uRW5kIGFuaW1hdGlvbmVuZCc7XG4gICAgdmFyIGNyZWF0ZUNoYXJhY3RlcnMgPSBmdW5jdGlvbiAoKXtcbiAgICAgICAgdmFyIGNoYXJhY3RlcnMgPSB7XG4gICAgICAgICAgICBhc2g6IFtcbiAgICAgICAgICAgICAgICAnYXNoJyxcbiAgICAgICAgICAgICAgICAnYXNoLWdyZWVuLWJhZycsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3RoZXJzOiBbXG4gICAgICAgICAgICAgICAgJ2phbWVzJyxcbiAgICAgICAgICAgICAgICAnY2Fzc2lkeScsXG4gICAgICAgICAgICAgICAgJ2plc3NpZSdcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRZICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoKCBNYXRoLnJhbmRvbSgpICogMyApICsgMjkpLnRvRml4ZWQoMik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRaICh5KSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMjAgLSB5KSAqIDEwMCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByYW5kb21DaGFyYWN0ZXJzICh3aG8pIHtcbiAgICAgICAgICAgIHJldHVybiBjaGFyYWN0ZXJzW3dob11bIE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiBjaGFyYWN0ZXJzW3dob10ubGVuZ3RoICkgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG1ha2VDaGFyYWN0ZXIgKHdobykge1xuXG4gICAgICAgICAgICB2YXIgeERlbGF5ID0gKCB3aG8gPT09ICdhc2gnICkgPyA0IDogNC44O1xuICAgICAgICAgICAgdmFyIGRlbGF5ID0gJy13ZWJraXQtYW5pbWF0aW9uLWRlbGF5OiAnICsgKCBNYXRoLnJhbmRvbSgpICogMi43ICsgeERlbGF5ICkudG9GaXhlZCgzKSArICdzOyc7XG4gICAgICAgICAgICB2YXIgY2hhcmFjdGVyID0gcmFuZG9tQ2hhcmFjdGVycyggd2hvICk7XG4gICAgICAgICAgICB2YXIgYm90dG9tID0gZ2V0WSgpO1xuICAgICAgICAgICAgdmFyIHkgPSAnYm90dG9tOiAnKyBib3R0b20gKyclOyc7XG4gICAgICAgICAgICB2YXIgeiA9ICd6LWluZGV4OiAnKyBnZXRaKCBib3R0b20gKSArICc7JztcbiAgICAgICAgICAgIHZhciBzdHlsZSA9IFwic3R5bGU9J1wiK2RlbGF5K1wiIFwiK3krXCIgXCIreitcIidcIjtcblxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgK1xuICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9J1wiICsgY2hhcmFjdGVyICsgXCIgb3BlbmluZy1zY2VuZScgXCIrIHN0eWxlICsgXCI+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIjxpIGNsYXNzPVwiICsgY2hhcmFjdGVyICsgXCItcmlnaHQgXCIgKyBcInN0eWxlPSdcIisgZGVsYXkgKyBcIic+PC9pPlwiICtcbiAgICAgICAgICAgICAgICBcIjwvaT5cIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhc2ggPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMTYgKSArIDE2O1xuICAgICAgICB2YXIgb3RoZXJzID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDggKSArIDg7XG5cbiAgICAgICAgdmFyIGhvcmRlID0gJyc7XG5cbiAgICAgICAgZm9yICggdmFyIGkgPSAwOyBpIDwgYXNoOyBpKysgKSB7XG4gICAgICAgICAgICBob3JkZSArPSBtYWtlQ2hhcmFjdGVyKCAnYXNoJyApO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICggdmFyIGogPSAwOyBqIDwgb3RoZXJzOyBqKysgKSB7XG4gICAgICAgICAgICBob3JkZSArPSBtYWtlQ2hhcmFjdGVyKCAnb3RoZXJzJyApO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2h1bWFucycpLmlubmVySFRNTCA9IGhvcmRlO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJydW5uaW5nLWFuaW1hdGlvblwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwicGlrYWNodSBvcGVuaW5nLXNjZW5lXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwicGlrYWNodS1yaWdodFwiPjwvaT4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInF1b3RlIGV4Y2xhbWF0aW9uXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJodW1hbnNcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicsXG4gICAgICAgIGNvbXBpbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcHJlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNtYWluJykuYWRkQ2xhc3MoJ2hlcmUnKVxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVDaGFyYWN0ZXJzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwb3N0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnLm9wZW5pbmctc2NlbmUnKS5hZGRDbGFzcygnbW92ZScpXG4gICAgICAgICAgICAgICAgICAgICQoJy5tb3ZlJykub24oYW5pbWF0aW9uRW5kRXZlbnRzLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNjb3BlOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdyZXNldCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9yZXNldC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KVxuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Bhc3N3b3JkJywge1xuICAgICAgICB1cmw6ICcvcmVzZXQvcGFzc3dvcmQvOnRva2VuJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9wYXNzd29yZC5yZXNldC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KVxuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUsIEF1dGhGYWN0b3J5LCAkc3RhdGVQYXJhbXMsIENhcnRGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuICAgICRzY29wZS50b2tlbiA9ICRzdGF0ZVBhcmFtcy50b2tlbjtcblxuICAgICRzY29wZS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZChlbWFpbCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnQ2hlY2sgeW91ciBlbWFpbCcsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgJHNjb3BlLnJlc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodG9rZW4sIHBhc3N3b3JkKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LnJlc2V0UGFzc3dvcmQocGFzc3dvcmQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgIH0pXG4gICAgfTtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChjYXJ0KSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignUGF5bWVudEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsVXNlckZhY3RvcnksICRsb2csIENhcnRGYWN0b3J5LCB0b3RhbENvc3QsIGFycmF5T2ZJdGVtcyl7XG4gICRzY29wZS5pbmZvID0ge307XG4gIFxuICAkc2NvcGUudmFsaWRhdGVVc2VyPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQoJHNjb3BlLmluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5zaG93Q0MgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgkbG9nLmVycm9yKVxuICAgICAgICBcbiAgfVxuICAkc2NvcGUudG90YWxDb3N0ID0gdG90YWxDb3N0O1xuICAkc2NvcGUuYXJyYXlPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zO1xuICAkc2NvcGUuc3RyaW5nT2ZJdGVtcyA9IGFycmF5T2ZJdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnRpdGxlKS5qb2luKCcsJylcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGF5bWVudCcsIHtcbiAgICAgICAgdXJsOiAnL3BheW1lbnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3BheW1lbnQvcGF5bWVudC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUGF5bWVudEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgdG90YWxDb3N0OiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0KCkgfSxcbiAgICAgICAgICBhcnJheU9mSXRlbXM6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB0aGVQcm9kdWN0LCBhbGxSZXZpZXdzLCBQcm9kdWN0RmFjdG9yeSwgQ2FydEZhY3RvcnkpIHtcbiAgICAvLyBwcm9kdWN0XG4gICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICRzY29wZS5wcm9kdWN0ID0gdGhlUHJvZHVjdDtcbiAgICAkc2NvcGUucmV2aWV3cyA9IGFsbFJldmlld3M7XG4gICAgLy8gcmV2aWV3XG4gICAgJHNjb3BlLm1vZGFsT3BlbiA9IGZhbHNlO1xuICAgICRzY29wZS5zdWJtaXRSZXZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5uZXdSZXZpZXcucHJvZHVjdElkID0gJHNjb3BlLnByb2R1Y3QuaWQ7XG4gICAgICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldygkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLm5ld1JldmlldykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUucmV2aWV3cyA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3M7XG4gICAgICAgICAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91IScsIDEwMDApO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGFkZCB0byBjYXJ0XG4gICAgJHNjb3BlLmFkZFRvQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUucXVhbnRpdHkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91ISBZb3VyIGl0ZW0gd2FzIGFkZGVkIHRvIHlvdXIgY2FydCEnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5hcnJheU1ha2VyID0gZnVuY3Rpb24gKG51bSl7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD1udW07IGkgKyspe1xuICAgICAgICAgICAgYXJyLnB1c2goaSlcbiAgICAgICAgfSAgXG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfVxuXG59KVxuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICBhdXRvc2Nyb2xsOiAndHJ1ZScsXG4gICAgICAgIHVybDogJy9wcm9kdWN0cy86cHJvZHVjdElkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHRoZVByb2R1Y3Q6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCgkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxSZXZpZXdzOiBmdW5jdGlvbihQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cygkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gICAgICIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2ZpbGUnLCB7XG4gICAgICAgIHVybDogJy9wcm9maWxlJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdXNlclByb2ZpbGU6IGZ1bmN0aW9uIChVc2VyRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS5maW5kVXNlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgXG4gICAgfSk7XG59KTtcbiBcblxuICAgICIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbiAgYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoRmFjdG9yeSwgJHN0YXRlKSB7XG4gICAgJHNjb3BlLnNpZ251cCA9IHt9OyBcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LnNpZ251cChzaWdudXBJbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gJ2VtYWlsIGV4aXN0cyBhbHJlYWR5Jykge1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVc2VyIGFscmVhZHkgZXhpc3RzJywgMjAwMCk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UgPT09ICdub3QgYSB2YWxpZCBlbWFpbCcpe1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdJdCBpcyBub3QgYSB2YWxpZCBlbWFpbCcsIDIwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdHbyBhaGVhZCBhbmQgbG9naW4nLCA0MDAwKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuICAgICRzY29wZS5nb29nbGVTaWdudXAgPSBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXA7XG59KTtcblxuXG4iLCJhcHAuY29udHJvbGxlcignU3RvcmVDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgcHJvZHVjdHMpIHtcbiAgICAkc2NvcGUucHJvZHVjdHMgPSBwcm9kdWN0cztcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdG9yZScsIHtcbiAgICAgICAgdXJsOiAnL3N0b3JlJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zdG9yZS9zdG9yZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0b3JlQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT3JkZXJIaXN0b3JpZXNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkQ2FydCA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL3BhaWQvJ1xuICAgIHZhciBvcmRlckhpc3Rvcmllc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZENhcnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuIFxuXG4gICAgcmV0dXJuIG9yZGVySGlzdG9yaWVzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdIZWxsbywgd29ybGQhJyxcbiAgICAgICAgJ0F0IGxvbmcgbGFzdCwgSSBsaXZlIScsXG4gICAgICAgICdIZWxsbywgc2ltcGxlIGh1bWFuLicsXG4gICAgICAgICdXaGF0IGEgYmVhdXRpZnVsIGRheSEnLFxuICAgICAgICAnSVxcJ20gbGlrZSBhbnkgb3RoZXIgcHJvamVjdCwgZXhjZXB0IHRoYXQgSSBhbSB5b3Vycy4gOiknLFxuICAgICAgICAnVGhpcyBlbXB0eSBzdHJpbmcgaXMgZm9yIExpbmRzYXkgTGV2aW5lLicsXG4gICAgICAgICfjgZPjgpPjgavjgaHjga/jgIHjg6bjg7zjgrbjg7zmp5jjgIInLFxuICAgICAgICAnV2VsY29tZS4gVG8uIFdFQlNJVEUuJyxcbiAgICAgICAgJzpEJyxcbiAgICAgICAgJ1llcywgSSB0aGluayB3ZVxcJ3ZlIG1ldCBiZWZvcmUuJyxcbiAgICAgICAgJ0dpbW1lIDMgbWlucy4uLiBJIGp1c3QgZ3JhYmJlZCB0aGlzIHJlYWxseSBkb3BlIGZyaXR0YXRhJyxcbiAgICAgICAgJ0lmIENvb3BlciBjb3VsZCBvZmZlciBvbmx5IG9uZSBwaWVjZSBvZiBhZHZpY2UsIGl0IHdvdWxkIGJlIHRvIG5ldlNRVUlSUkVMIScsXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnQXV0aEZhY3RvcnknLCAgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICB2YXIgQXV0aEZhY3RvcnkgPSB7fTtcblxuXG4gICAgQXV0aEZhY3Rvcnkuc2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKS50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXV0aC9nb29nbGUnKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBsb2dpbikge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3Jlc2V0L3Bhc3N3b3JkLycgKyB0b2tlbiwgbG9naW4pO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvZm9yZ290JywgZW1haWwpO1xuICAgIH1cblxuICAgIHJldHVybiBBdXRoRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0NhcnRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwLCAkbG9nLCAkc3RhdGUsICRyb290U2NvcGUpIHtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL2NhcnQvJztcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGl0ZW0uaW1hZ2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nICsgaXRlbS5wcm9kdWN0SWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHZhciBDYXJ0RmFjdG9yeSA9IHt9O1xuICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBbXTtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNvcnQoZnVuY3Rpb24gKGEsYil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuaWQgLSBhLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgndXBkYXRlQ2FydCcsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5kZWxldGVJdGVtID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgcHJvZHVjdElkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSB0aGlzLmNhY2hlZENhcnQuZmlsdGVyKGl0ZW0gPT4gaXRlbS5wcm9kdWN0SWQgPT09IHByb2R1Y3RJZCk7XG4gICAgICAgIHJldHVybiAoZHVwbGljYXRlLmxlbmd0aCkgPyBkdXBsaWNhdGVbMF0gOiBudWxsO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICBcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyhwcm9kdWN0SWQpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnlcbiAgICAgICAgICAgIC5jaGFuZ2VRdWFudGl0eShkdXBsaWNhdGUuaWQsIGR1cGxpY2F0ZS5xdWFudGl0eSwgJ2FkZCcsIHF1YW50aXR5ICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyBwcm9kdWN0SWQsIHtxdWFudGl0eTogcXVhbnRpdHl9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQ9ZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrb3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlKG9yZGVySWQpXG4gICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eT1mdW5jdGlvbihvcmRlcklkLCBxdWFudGl0eSwgYWRkT3JTdWJ0ciwgYW1vdW50ID0gMSl7XG4gICAgICAgIHZhciBydW5GdW5jPWZhbHNlO1xuICAgICAgICBpZiAoYWRkT3JTdWJ0cj09PSdhZGQnKSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHF1YW50aXR5Kz0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRPclN1YnRyPT09J3N1YnRyYWN0JyAmJiBxdWFudGl0eT4xKSB7XG4gICAgICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgICAgIHF1YW50aXR5LT0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVuRnVuYz09PXRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIG9yZGVySWQsIHtxdWFudGl0eTpxdWFudGl0eX0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkob3JkZXJJZCxxdWFudGl0eSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlID0gZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyLGkpe1xuICAgICAgICAgICAgaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSBpbmRleCA9IGk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5ID0gZnVuY3Rpb24gKG9yZGVySWQscXVhbnRpdHkpIHtcbiAgICAgICAgdmFyIGkgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZpbmRJbmRleChmdW5jdGlvbihvcmRlcil7XG4gICAgICAgICAgICAvLyBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIHtcbiAgICAgICAgICAgIC8vICAgICBvcmRlci5xdWFudGl0eSA9IHF1YW50aXR5O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgcmV0dXJuIG9yZGVyLmlkID09PSBvcmRlcklkO1xuICAgICAgICB9KTtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydFtpXS5xdWFudGl0eSA9IHF1YW50aXR5XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnb3JkZXJIaXN0b3JpZXMnKTtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKDAsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQubGVuZ3RoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjYXJ0KXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjYXJ0KVxuICAgICAgICAgICAgICAgIGNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlKml0ZW0ucXVhbnRpdHkpIClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG90YScsIHRvdGFsKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goJGxvZy5lcnJvcilcbiAgICB9XG5cblxuICAgIHZhciBhbmltYXRpb25FbmQgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG1vekFuaW1hdGlvbkVuZCBNU0FuaW1hdGlvbkVuZCBvYW5pbWF0aW9uZW5kIGFuaW1hdGlvbmVuZCc7XG5cbiAgICBmdW5jdGlvbiBhZGRTdWNjZXNzQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gYWRkUmVtb3ZlQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJykub25lKGFuaW1hdGlvbkVuZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NhcnQtaWNvbicpLnJlbW92ZUNsYXNzKCdhbmltYXRlZCBzaGFrZScpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgQ2FydEZhY3RvcnkuZmluZE9uZVVzZXJJbmZvPWZ1bmN0aW9uKCl7XG4gICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgfVxuXG4gICAgcmV0dXJuIENhcnRGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdNYW5hZ2VPcmRlcnNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkT3JkZXJEZXRhaWxzID0gW107XG4gICAgdmFyIGNhY2hlZFVzZXJPcmRlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL21hbmFnZU9yZGVycy8nXG4gICAgdmFyIG1hbmFnZU9yZGVyc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkT3JkZXJEZXRhaWxzKVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZE9yZGVyRGV0YWlscztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsVXNlck9yZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlcicpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRVc2VyT3JkZXJzKVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFVzZXJPcmRlcnM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kU3RhdHVzID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kVXNlciA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlci8nICsgdXNlck9yZGVySWQpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCwgZGF0YSl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZCwgZGF0YSlcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlck9yZGVyKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KFwiVXBkYXRlZFwiLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlck9yZGVycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXJPcmRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlci5pZCA9PT0gdXNlck9yZGVySWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2VyT3JkZXJzW3VwZGF0ZWRJbmRdID0gdXNlck9yZGVyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmRlbGV0ZVVzZXJPcmRlciA9IGZ1bmN0aW9uICh1c2VyT3JkZXJJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQpXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJEZWxldGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlci5pZCA9PT0gdXNlck9yZGVySWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWFuYWdlT3JkZXJzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUHJvZHVjdEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuXG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nO1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBwYXJzZVRpbWVTdHIgPSBmdW5jdGlvbiAocmV2aWV3KSB7XG4gICAgICAgIHZhciBkYXRlID0gcmV2aWV3LmNyZWF0ZWRBdC5zdWJzdHIoMCwgMTApO1xuICAgICAgICByZXZpZXcuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHJldHVybiByZXZpZXc7XG4gICAgfVxuXG4gICAgdmFyIFByb2R1Y3RGYWN0b3J5ID0ge307XG4gICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMgPSBbXTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzID0gW107XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0cy5tYXAoUHJvZHVjdEZhY3RvcnkuY29udmVydCk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHByb2R1Y3RzLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyk7IC8vIHdoeSBhbmd1bGFyIGNvcHkgYWx0ZXJzIGFycmF5IG9yZGVyISEhISEhIVxuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cztcbiAgICAgICAgICAgICAgICB9KVxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS51cGRhdGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oUHJvZHVjdEZhY3RvcnkuY29udmVydClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVXBkYXRlZCcsIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHNbdXBkYXRlZEluZF0gPSBwcm9kdWN0O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdDtcbiAgICAgICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRGVsZXRlZCcsIDEwMDApO1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5maW5kSW5kZXgoZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oUHJvZHVjdEZhY3RvcnkuY29udmVydCk7XG5cbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuY29udmVydCA9IGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgIHByb2R1Y3QuaW1hZ2VVcmwgPSBiYXNlVXJsICsgcHJvZHVjdC5pZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gcHJvZHVjdDtcbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQsIGRhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV2aWV3ID0gcGFyc2VUaW1lU3RyKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MucHVzaChyZXZpZXcpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXZpZXc7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MubWFwKHBhcnNlVGltZVN0cik7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeTtcblxufSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuICAgIHZhciBVc2VyRmFjdG9yeSA9IHt9O1xuXG4gICAgdmFyIGNhY2hlZFVzZXJzID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS91c2Vycy8nO1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgVXNlckZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCkudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2Vycykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkodXNlcnMsIGNhY2hlZFVzZXJzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFVzZXJzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuXG4gICAgVXNlckZhY3RvcnkuZmluZFVzZXI9ZnVuY3Rpb24oaWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NheSBteSBuYW1lZWVlZWVlJywgdXNlcilcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnNbdXBkYXRlZEluZF0gPSB1c2VyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCA9IGZ1bmN0aW9uIChpbmZvT2JqKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICAgICBpZih1c2VyLmlkID09PSAnc2Vzc2lvbicpe1xuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVTZXNzaW9uQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIodXNlci5pZCxpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlVXNlckNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFVzZXJGYWN0b3J5O1xufSlcbiIsImFwcC5jb250cm9sbGVyKCdGQmxpa2UnLCBbXG4gICAgICAnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgICRzY29wZS5teU1vZGVsID0ge1xuICAgICAgICAgICAgICBVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nLFxuICAgICAgICAgICAgICBOYW1lOiBcIlBva2VtYXJ0XCIsXG4gICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuICAgICAgICAgIH07XG4gICAgICB9XG4gIF0pOyAgICAiLCJhbmd1bGFyLm1vZHVsZSgnYW5ndWxpa2UnKVxuICAgIC5kaXJlY3RpdmUoJ2ZiTGlrZScsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjonRkJsaWtlJyxcbiAgICAgICAgICAgICAgICAvLyBzY29wZToge1xuICAgICAgICAgICAgICAgIC8vICAgICBmYkxpa2U6ICc9PydcbiAgICAgICAgICAgICAgICAvLyB9LFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5GQikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBGYWNlYm9vayBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5pbml0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGZibWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICd2Mi4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckxpa2VCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5mYkxpa2UgJiYgIXNjb3BlLmZiTGlrZSAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ2ZiTGlrZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImZiLWxpa2VcIicgKyAoISFzY29wZS5mYkxpa2UgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5mYkxpa2UgKyAnXCInIDogJycpICsgJyBkYXRhLWxheW91dD1cImJ1dHRvbl9jb3VudFwiIGRhdGEtYWN0aW9uPVwibGlrZVwiIGRhdGEtc2hvdy1mYWNlcz1cInRydWVcIiBkYXRhLXNoYXJlPVwidHJ1ZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuWEZCTUwucGFyc2UoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiLy8gYXBwLmNvbnRyb2xsZXIoJ1R3aXR0ZXJDdHJsJywgW1xuLy8gICAgICAgJyRzY29wZScsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbi8vICAgICAgICAgICAkc2NvcGUubXlNb2RlbCA9IHtcbi8vICAgICAgICAgICAgICAgVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJyxcbi8vICAgICAgICAgICAgICAgTmFtZTogXCJQb2tlbWFydFwiLFxuLy8gICAgICAgICAgICAgICBJbWFnZVVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbSdcbi8vICAgICAgICAgICB9O1xuLy8gICAgICAgfVxuLy8gICBdKTsgICAgIiwiYXBwLmRpcmVjdGl2ZSgndHdlZXQnLCBbXG4gICAgICAgICckd2luZG93JywgJyRsb2NhdGlvbicsXG4gICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICAvLyBzY29wZToge1xuICAgICAgICAgICAgICAgIC8vICAgICB0d2VldDogJz0nLFxuICAgICAgICAgICAgICAgIC8vICAgICB0d2VldFVybDogJz0nXG4gICAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgICAgICAvLyBjb250cm9sbGVyOidUd2l0dGVyQ3RybCcsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISR3aW5kb3cudHd0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgVHdpdHRlciBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9wbGF0Zm9ybS50d2l0dGVyLmNvbS93aWRnZXRzLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyVHdlZXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLnR3ZWV0ICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgndHdlZXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gcnVuIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGEgaHJlZj1cImh0dHBzOi8vdHdpdHRlci5jb20vc2hhcmVcIiBjbGFzcz1cInR3aXR0ZXItc2hhcmUtYnV0dG9uXCIgZGF0YS10ZXh0PVwiJyArIHNjb3BlLnR3ZWV0ICsgJ1wiIGRhdGEtdXJsPVwiJyArIChzY29wZS50d2VldFVybCB8fCAkbG9jYXRpb24uYWJzVXJsKCkpICsgJ1wiPlR3ZWV0PC9hPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cudHd0dHIud2lkZ2V0cy5sb2FkKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFwcC5kaXJlY3RpdmUoJ3Nob3BwaW5nQ2FydCcsIGZ1bmN0aW9uKENhcnRGYWN0b3J5LCAkcm9vdFNjb3BlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9jYXJ0LXJldmVhbC9jYXJ0LXJldmVhbC5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGFjdGl2ZTogJz0nLFxuICAgICAgICAgICAgYWRkQW5kUmV2ZWFsQ2FyZDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHNjb3BlOiB7IHNldEZuOiAnJicgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbigndXBkYXRlQ2FydCcsIGZ1bmN0aW9uIChldmVudCwgY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBjYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNjb3BlLnJldmVhbENhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQgY2hlY2tvdXQtLWFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuaGlkZUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuYWN0aXZlID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuY2FydClcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSAqIGl0ZW0ucXVhbnRpdHkpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyBzY29wZS5zZXRGbih7dGhlRGlyRm46IHNjb3BlLnVwZGF0ZU1hcH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnU2hvcCcsIHN0YXRlOiAnc3RvcmUnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTdweCAtMzA2cHgnKVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnVudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTNweCAtOXB4JylcblxuICAgICAgICAgICAgfSAgIFxuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0QWRtaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coQXV0aEludGVyY2VwdG9yKTtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmFkbWluID0gQXV0aFNlcnZpY2UuaXNBZG1pbih1c2VyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcbiAgICAgICAgICAgIHNldEFkbWluKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYXBwLmRpcmVjdGl2ZSgnb2F1dGhCdXR0b24nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHByb3ZpZGVyTmFtZTogJ0AnXG4gICAgfSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnL2pzL2NvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uaHRtbCdcbiAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdvcmRlckVudHJ5JywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgb3JkZXJEZXRhaWxzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHMsIGUsIGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHMub3JkZXJEZXRhaWxzKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3J5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cdFxufSkiLCJhcHAuZGlyZWN0aXZlKCdvcmRlckhpc3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBoaXN0b3JpZXM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3J5Q3RybCdcbiAgIFxuICAgIH1cblxufSlcbiAgIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0RW50cnknLCBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3Q6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdFVwZGF0ZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIvLyBhcHAuZGlyZWN0aXZlKCdzdGFyUmF0aW5nJywgZnVuY3Rpb24gKCkge1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICByZXN0cmljdDogJ0VBJyxcbi8vICAgICAgIHRlbXBsYXRlOlxuLy8gICAgICAgICAnPHNwYW4gY2xhc3M9XCJzdGFyc1wiPicgK1xuLy8gICAgICAgICAgJzxkaXYgY2xhc3M9XCJzdGFycy1maWxsZWQgbGVmdFwiPicgK1xuLy8gICAgICAgICAgICAgJzxzcGFuPuKYhTwvc3Bhbj4nICtcbi8vICAgICAgICAgICc8L2Rpdj4nICtcbi8vICAgICAgICc8L3NwYW4+J1xuLy8gICAgIH07XG4vLyB9KVxuIiwiIC8vIGFwcC5jb250cm9sbGVyKCdTZWFyY2hCYXJDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcbiAvLyBcdCRzY29wZS5wcm9kdWN0PVxuIC8vIH0pIiwiYXBwLmRpcmVjdGl2ZSgnc2VhcmNoQmFyJywgZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5odG1sJyxcblx0XHRjb250cm9sbGVyOidQcm9kdWN0Q2FyZEN0cmwnXG5cdH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJFbnRyeScsIGZ1bmN0aW9uIChVc2VyRmFjdG9yeSwgQXV0aEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgICAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoe2VtYWlsOiBlbWFpbH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRG9uZScsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAodXNlcklkKSB7XG4gICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIodXNlcklkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0VyYXNlIGZyb20gcGxhbmV0IEVhcnRoJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlck9yZGVyJywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXJPcmRlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsIlxuYXBwLmRpcmVjdGl2ZSgnY2xpY2tBbnl3aGVyZUJ1dEhlcmUnLCBmdW5jdGlvbigkZG9jdW1lbnQpe1xuICByZXR1cm4ge1xuICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgY2xpY2tBbnl3aGVyZUJ1dEhlcmU6ICcmJ1xuICAgICAgICAgICB9LFxuICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsLCBhdHRyKSB7XG5cbiAgICAgICAgICAgICAgICQoJy5sb2dvJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAkZG9jdW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQuaWQgIT09ICdjYXJ0LWljb24nICYmIGUudGFyZ2V0LmlkICE9PSAnYWRkLXRvLWNhcnQtYnV0dG9uJykge1xuICAgICAgICAgICAgICAgICAgIGlmIChlbCAhPT0gZS50YXJnZXQgJiYgIWVsWzBdLmNvbnRhaW5zKGUudGFyZ2V0KSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbChzY29wZS5jbGlja0FueXdoZXJlQnV0SGVyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgfVxuICAgICAgICB9XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
