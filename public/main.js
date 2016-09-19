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

angular.module('angulike').directive('fbLike', ['$window', '$rootScope', function ($window, $rootScope) {
    return {
        restrict: 'A',
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

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuY29udHJvbGxlci5qcyIsImNoZWNrb3V0L2NoZWNrb3V0LmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJoaXN0b3J5L29yZGVySGlzdG9yaWVzLmNvbnRyb2xsZXIuanMiLCJoaXN0b3J5L29yZGVySGlzdG9yaWVzLmpzIiwiaG9tZS9hbmltYXRpb24uZGlyZWN0aXZlLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwicGF5bWVudC9wYXltZW50LmNvbnRyb2xsZXIuanMiLCJwYXltZW50L3BheW1lbnQuanMiLCJwcm9kdWN0L3Byb2R1Y3QuY29udHJvbGxlci5qcyIsInByb2R1Y3QvcHJvZHVjdC5qcyIsInByb2ZpbGUvcHJvZmlsZS5qcyIsInNpZ251cC9zaWdudXAuanMiLCJzdG9yZS9zdG9yZS5jb250cm9sbGVyLmpzIiwic3RvcmUvc3RvcmUuanMiLCJhZG1pbi9hZG1pbi5jb250cm9sbGVyLmpzIiwiYWRtaW4vYWRtaW4uanMiLCJjYXJ0L2NhcnQuY29udHJvbGxlci5qcyIsImNhcnQvY2FydC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvT3JkZXJIaXN0b3JpZXMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmV2aWV3LWVudHJ5L3N0YXItcmF0aW5nLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXRpbGl0eS9jbGlja0FueXdoZXJlQnV0SGVyZS5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFVBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsZ0JBQUEsRUFBQSxxQkFBQSxFQUFBLGdCQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQSxxQkFBQSxFQUFBLGNBQUEsRUFBQTtBQUNBO0FBQ0Esc0JBQUEsU0FBQSxDQUFBLElBQUE7QUFDQTtBQUNBLHVCQUFBLFNBQUEsQ0FBQSxHQUFBO0FBQ0E7QUFDQSx1QkFBQSxJQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsZUFBQSxRQUFBLENBQUEsTUFBQTtBQUNBLEtBRkE7QUFHQSwwQkFBQSxlQUFBOztBQUVBO0FBRUEsQ0FiQTs7QUFlQTtBQUNBLElBQUEsR0FBQSxDQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUE7O0FBRUE7QUFDQSxRQUFBLCtCQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxJQUFBLE1BQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxLQUZBOztBQUlBO0FBQ0E7QUFDQSxlQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUE7O0FBRUEsWUFBQSxDQUFBLDZCQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsWUFBQSxZQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxjQUFBLGNBQUE7O0FBRUEsb0JBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFB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QSxhQUFBLEVBQUE7QUFDQSxzQkFBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FEQSxFQUVBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsVUFBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsUUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxpQkFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0Esb0JBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLHVCQUFBLFVBQUEsQ0FBQSxZQUFBLFlBQUE7QUFDQSxtQkFBQSxLQUFBLElBQUE7QUFDQTs7QUFFQSxhQUFBLE9BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsT0FBQTtBQUNBLFNBRkE7O0FBSUE7QUFDQTtBQUNBLGFBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsUUFBQSxJQUFBO0FBQ0EsU0FGQTs7QUFJQSxhQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLGdCQUFBLEtBQUEsZUFBQSxNQUFBLGVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsR0FBQSxJQUFBLENBQUEsUUFBQSxJQUFBLENBQUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsS0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFGQSxDQUFBO0FBSUEsU0FyQkE7O0FBdUJBLGFBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsRUFDQSxJQURB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QTtBQVNBLENBVkE7O0FDQUEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQTtBQUNBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBLFVBQUE7QUFDQSxXQUFBLE9BQUEsR0FBQSxVQUFBO0FBQ0E7QUFDQSxXQUFBLFNBQUEsR0FBQSxLQUFBO0FBQ0EsV0FBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLE9BQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxPQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLE9BQUEsR0FBQSxlQUFBLGFBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQTtBQUNBLFNBSkEsRUFJQSxLQUpBLENBSUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxzQkFBQSxFQUFBLElBQUE7QUFDQSxTQU5BO0FBT0EsS0FUQTtBQVVBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBLFNBQUEsQ0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsT0FBQSxRQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsOENBQUEsRUFBQSxJQUFBO0FBQ0EsU0FIQTtBQUlBLEtBTEE7QUFNQSxXQUFBLFVBQUEsR0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLFlBQUEsTUFBQSxFQUFBO0FBQ0EsYUFBQSxJQUFBLElBQUEsQ0FBQSxFQUFBLEtBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0E7QUFDQSxlQUFBLEdBQUE7QUFDQSxLQU5BO0FBUUEsQ0FoQ0E7O0FDQUEsSUFBQSxNQUFBLENBQUEs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WkEsQ0FBQTs7QUFlQSxXQUFBO0FBQ0EsbUJBQUEsU0FEQTtBQUVBLDJCQUFBLDZCQUFBO0FBQ0EsbUJBQUEsbUJBQUEsU0FBQSxDQUFBO0FBQ0E7QUFKQSxLQUFBO0FBT0EsQ0E1QkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsUUFBQSxjQUFBLEVBQUE7O0FBR0EsZ0JBQUEsTUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLHFCQUFBLEtBQUEsRUFBQSxLQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBQ0EsQ0F4QkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLFVBQUEsbUJBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUEsbUJBQUEsS0FBQSxTQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNBLEtBSEE7QUFJQSxRQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsU0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsWUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLFNBWEEsQ0FBQTtBQVlBLEtBYkE7O0FBZUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxnQkFBQSxrQkFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUFBLG1CQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUE7QUFBQSxTQUFBLENBQUE7QUFDQSxlQUFBLFVBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLFlBQUEsWUFBQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsWUFDQSxjQURBLENBQ0EsVUFBQSxFQURBLEVBQ0EsVUFBQSxRQURBLEVBQ0EsS0FEQSxFQUNBLFFBREEsQ0FBQTtBQUVBLFNBSEEsTUFHQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUEsRUFBQSxVQUFBLFFBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUNBLGFBTEEsQ0FBQTtBQU1BO0FBQ0E7QUFDQSxLQWhCQTs7QUFrQkEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0E7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsT0FBQSxFQUNBLE9BREEsQ0FDQSxZQUFBO0FBQ0Esd0JBQUEsdUJBQUEsQ0FBQSxPQUFBO0FBQ0EsU0FIQSxFQUlBLElBSkEsQ0FJQSxZQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FOQSxDQUFBO0FBT0EsS0FUQTtBQVVBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUEsVUFBQSxFQUFBO0FBQUEsWUFBQSxNQUFBLHlEQUFBLENBQUE7O0FBQ0EsWUFBQSxVQUFBLEtBQUE7QUFDQSxZQUFBLGVBQUEsS0FBQSxFQUFBO0FBQ0E7QUFDQSx3QkFBQSxDQUFBLE1BQUE7QUFDQSxzQkFBQSxJQUFBO0FBQ0EsU0FKQSxNQUtBLElBQUEsZUFBQSxVQUFBLElBQUEsV0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBLHdCQUFBLENBQUEsTUFBQTtBQUNBLHNCQUFBLElBQUE7QUFDQTtBQUNBLFlBQUEsWUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0E7QUFEQSxhQUVBLElBRkEsQ0FFQSxZQUFBO0FBQ0EsNEJBQUEsMkJBQUEsQ0FBQSxPQUFBLEVBQUEsUUFBQTtBQUNBLGFBSkEsQ0FBQTtBQUtBO0FBR0EsS0FyQkE7O0FBdUJBLGdCQUFBLHVCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUE7QUFDQSxvQkFBQSxVQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxTQUZBOztBQUlBLG9CQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxLQVBBOztBQVNBLGdCQUFBLDJCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxJQUFBLFlBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxvQkFBQSxVQUFBLENBQUEsQ0FBQSxFQUFBLFFBQUEsR0FBQSxRQUFBO0FBQ0EsS0FSQTs7QUFVQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUEsZ0JBQUE7QUFDQSx3QkFBQSxVQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxZQUFBLFVBQUEsQ0FBQSxNQUFBO0FBQ0EsU0FKQSxFQUtBLEtBTEEsQ0FLQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsZ0JBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLFFBQUEsQ0FBQTtBQUNBLGVBQUEsWUFBQSxnQkFBQSxHQUNB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QUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsZUFBQSxjQUFBO0FBQ0EsU0FUQSxDQUFBO0FBVUEsS0FYQTs7QUFhQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLEVBR0EsSUFIQSxDQUdBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBO0FBQ0EsbUJBQUEsT0FBQTtBQUNBLFNBVkEsQ0FBQTtBQVdBLEtBWkE7O0FBY0EsbUJBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxPQUFBLENBQUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsZUFBQSxjQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDJCQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQU5BLENBQUE7QUFPQSxLQVJBOztBQVVBLG1CQUFBLFNBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLENBQUE7QUFJQSxLQUxBOztBQU9BLG1CQUFBLE9BQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQSxHQUFBLFFBQUE7QUFDQSxlQUFBLE9BQUE7QUFDQSxLQUhBOztBQUtBLG1CQUFBLFlBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLGtCQUFBLFNBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsU0FBQSxhQUFBLFNBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxNQUFBO0FBQ0EsbUJBQUEsTUFBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsbUJBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxrQkFBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGVBQUEsYUFBQTtBQUNBLG1CQUFBLGVBQUEsYUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLFdBQUEsY0FBQTtBQUVBLENBbkZBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBOztBQUVBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLGFBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsS0FBQSxFQUFBLFdBQUEsRUFEQSxDQUNBO0FBQ0Esd0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxXQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFZQSxnQkFBQSxRQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBBOztBQVNBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0Esd0JBQUEsVUFBQSxJQUFBLElBQUE7QUFDQSxtQkFBQSxJQUFBO0FBQ0EsU0FSQSxDQUFBO0FBU0EsS0FWQTs7QUFZQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBB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OztBQU1BLHNCQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsV0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsS0FBQSxvQkFBQSxFQUFBO0FBQ0Esd0JBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQ0EsOEJBQUEsTUFBQSxDQUFBLFlBQUE7O0FBRUEsa0NBQUEsS0FBQSxDQUFBLE1BQUEsb0JBQUE7QUFDQSx5QkFIQTtBQUlBO0FBQ0E7QUFDQSxhQVRBO0FBV0E7QUF4QkEsS0FBQTtBQTBCQSxDQTNCQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIsc3RyaXBlUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbiAgICAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKCk7XG5cbiAgICAvLyBzdHJpcGVQcm92aWRlci5zZXRQdWJsaXNoYWJsZUtleSgnbXlfa2V5Jyk7XG5cbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuICAgICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCA9ICc5NDEwMzgyODI2ODYyNDInO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignQ2hlY2tvdXRDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQ2FydEZhY3RvcnkpIHtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICBjb25zb2xlLmxvZyhpdGVtcylcbiAgICAgICAgJHNjb3BlLml0ZW1zID0gaXRlbXM7XG5cbiAgXHRcdFx0Ly9jYWxjdWxhdGluZyB0b3RhbCBwcmljZSBhbmQgcHV0IHRoYXQgaW50byAkc2NvcGUudG90YWxcbiAgICAgICAgdmFyIGl0ZW1zQXJyID0gaXRlbXM7XG4gICAgICAgIHZhciB0b3RhbFByaWNlRWFjaCA9IFtdO1xuICAgICAgICBpdGVtc0Fyci5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICBcdHRvdGFsUHJpY2VFYWNoLnB1c2goZWxlbWVudC5wcmljZSAqIGVsZW1lbnQucXVhbnRpdHkpO1xuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUudG90YWwgPSB0b3RhbFByaWNlRWFjaC5yZWR1Y2UoIChwcmV2LCBjdXJyKSA9PiBwcmV2ICsgY3VyciApO1xuICAgIH0pXG5cbiAgICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NoZWNrb3V0Jywge1xuICAgICAgICB1cmw6ICcvY2hlY2tvdXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NoZWNrb3V0L2NoZWNrb3V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ2hlY2tvdXRDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNBZG1pbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlci5pc0FkbWluO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Jlc2V0Jywge1xuICAgICAgICB1cmw6ICcvcmVzZXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Jlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGFzc3dvcmQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldC9wYXNzd29yZC86dG9rZW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Bhc3N3b3JkLnJlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgQXV0aEZhY3RvcnksICRzdGF0ZVBhcmFtcywgQ2FydEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgJHNjb3BlLnRva2VuID0gJHN0YXRlUGFyYW1zLnRva2VuO1xuXG4gICAgJHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKGVtYWlsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdDaGVjayB5b3VyIGVtYWlsJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgcGFzc3dvcmQpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZChwYXNzd29yZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJGxvZywgQ2FydEZhY3RvcnksIHRvdGFsQ29zdCwgYXJyYXlPZkl0ZW1zKXtcbiAgJHNjb3BlLmluZm8gPSB7fTtcbiAgXG4gICRzY29wZS52YWxpZGF0ZVVzZXI9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUuaW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNob3dDQyA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgICAgIFxuICB9XG4gICRzY29wZS50b3RhbENvc3QgPSB0b3RhbENvc3Q7XG4gICRzY29wZS5hcnJheU9mSXRlbXMgPSBhcnJheU9mSXRlbXM7XG4gICRzY29wZS5zdHJpbmdPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0udGl0bGUpLmpvaW4oJywnKVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXltZW50Jywge1xuICAgICAgICB1cmw6ICcvcGF5bWVudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcGF5bWVudC9wYXltZW50Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQYXltZW50Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB0b3RhbENvc3Q6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QoKSB9LFxuICAgICAgICAgIGFycmF5T2ZJdGVtczogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKSB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHRoZVByb2R1Y3QsIGFsbFJldmlld3MsIFByb2R1Y3RGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuICAgIC8vIHByb2R1Y3RcbiAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgJHNjb3BlLnByb2R1Y3QgPSB0aGVQcm9kdWN0O1xuICAgICRzY29wZS5yZXZpZXdzID0gYWxsUmV2aWV3cztcbiAgICAvLyByZXZpZXdcbiAgICAkc2NvcGUubW9kYWxPcGVuID0gZmFsc2U7XG4gICAgJHNjb3BlLnN1Ym1pdFJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLm5ld1Jldmlldy5wcm9kdWN0SWQgPSAkc2NvcGUucHJvZHVjdC5pZDtcbiAgICAgICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUubmV3UmV2aWV3KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXZpZXdzID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cztcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhJywgMTAwMCk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gYWRkIHRvIGNhcnRcbiAgICAkc2NvcGUuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5xdWFudGl0eSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhIFlvdXIgaXRlbSB3YXMgYWRkZWQgdG8geW91ciBjYXJ0IScsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgJHNjb3BlLmFycmF5TWFrZXIgPSBmdW5jdGlvbiAobnVtKXtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PW51bTsgaSArKyl7XG4gICAgICAgICAgICBhcnIucHVzaChpKVxuICAgICAgICB9ICBcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9XG5cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAgICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZmlsZScsIHtcbiAgICAgICAgdXJsOiAnL3Byb2ZpbGUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUHJvZmlsZUN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICB1c2VyUHJvZmlsZTogZnVuY3Rpb24gKFVzZXJGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmZpbmRVc2VyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICBcbiAgICB9KTtcbn0pO1xuIFxuXG4gICAgIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuICBhcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhGYWN0b3J5LCAkc3RhdGUpIHtcbiAgICAkc2NvcGUuc2lnbnVwID0ge307IFxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgQXV0aEZhY3Rvcnkuc2lnbnVwKHNpZ251cEluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSAnZW1haWwgZXhpc3RzIGFscmVhZHknKSB7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCAyMDAwKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ25vdCBhIHZhbGlkIGVtYWlsJyl7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0l0IGlzIG5vdCBhIHZhbGlkIGVtYWlsJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0dvIGFoZWFkIGFuZCBsb2dpbicsIDQwMDApO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuXG5cbiIsImFwcC5jb250cm9sbGVyKCdTdG9yZUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBwcm9kdWN0cykge1xuICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzO1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0b3JlJywge1xuICAgICAgICB1cmw6ICcvc3RvcmUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3N0b3JlL3N0b3JlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RvcmVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsIlxuYXBwLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIGFsbFVzZXJPcmRlcnMsICRsb2csIGFsbFByb2R1Y3RzLCBhbGxVc2VycywgYWxsT3JkZXJEZXRhaWxzLCBNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0cztcbiAgICAkc2NvcGUudXNlcnMgPSBhbGxVc2VycztcbiAgICAkc2NvcGUudXNlck9yZGVycyA9IGFsbFVzZXJPcmRlcnM7XG5cbiAgICAvL2FkZGluZyBzdGF0dXMgdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyhvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnN0YXR1cyA9IHN0YXR1cztcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG5cbiAgICAvL2FkZGluZyB1c2VyIGluZm8gdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwudXNlciA9IHVzZXI7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuICAgIGFsbE9yZGVyRGV0YWlscyA9IGFsbE9yZGVyRGV0YWlscy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLnVzZXJPcmRlcklkIC0gYi51c2VyT3JkZXJJZDtcbiAgICB9KTtcbiAgICBhbGxPcmRlckRldGFpbHMgPSBfLmdyb3VwQnkoYWxsT3JkZXJEZXRhaWxzLCAndXNlck9yZGVySWQnKVxuICAgICRzY29wZS5vcmRlcnMgPSAkLm1hcChhbGxPcmRlckRldGFpbHMsZnVuY3Rpb24gKG9yZGVyLCBpKSB7XG4gICAgICAgIGlmIChpKSByZXR1cm4gW29yZGVyXTtcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCRzY29wZS5vcmRlcnMpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FkbWluJywge1xuICAgICAgICB1cmw6ICcvYWRtaW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkbWluL2FkbWluLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWRtaW5DdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxsUHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJzOiBmdW5jdGlvbiAoVXNlckZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbE9yZGVyRGV0YWlsczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyT3JkZXJzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59KVxuIiwiIGFwcC5jb250cm9sbGVyKCdDYXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGxvZywgY2FydENvbnRlbnQsIENhcnRGYWN0b3J5KXtcbiBcdCRzY29wZS5jYXJ0Q29udGVudD1jYXJ0Q29udGVudDtcblxuIFx0JHNjb3BlLnJlbW92ZT0gZnVuY3Rpb24ob3JkZXJJZCkge1xuIFx0XHRDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydChvcmRlcklkKVxuIFx0XHQudGhlbihmdW5jdGlvbihuZXdDYXJ0KXtcbiBcdFx0XHQkc2NvcGUuY2FydENvbnRlbnQgPSBuZXdDYXJ0O1xuIFx0XHR9KS5jYXRjaCgkbG9nKVxuIFx0fVxuXG4gXHQkc2NvcGUuY2hhbmdlUXVhbnRpdHk9IGZ1bmN0aW9uIChjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5KGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpO1xuICAgICAgICAkc2NvcGUuY2FydENvbnRlbnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgIH07XG5cbiAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbiAgJHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvdGFsID0gMDtcbiAgICBjYXJ0Q29udGVudC5mb3JFYWNoKGNhcnQgPT4gdG90YWwgKz0gKGNhcnQucHJpY2UgKiBjYXJ0LnF1YW50aXR5KSlcblxuICAgIHJldHVybiB0b3RhbDsgIFxuICB9XG4gfSlcblxuICIsIiBhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiBcdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjYXJ0Jywge1xuIFx0XHR1cmw6Jy9jYXJ0JyxcbiBcdFx0dGVtcGxhdGVVcmw6J2pzL2NhcnQvY2FydC5odG1sJyxcbiBcdFx0Y29udHJvbGxlcjonQ2FydEN0cmwnLFxuIFx0XHRyZXNvbHZlOntcbiBcdFx0XHRjYXJ0Q29udGVudDpmdW5jdGlvbihDYXJ0RmFjdG9yeSl7XG5cbiBcdFx0XHRcdHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCk7XG5cbiBcdFx0XHR9XG4gXHRcdH1cbiBcdH0pXG4gfSlcblxuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ09yZGVySGlzdG9yaWVzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZENhcnQgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9wYWlkLydcbiAgICB2YXIgb3JkZXJIaXN0b3JpZXNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBvcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRDYXJ0KVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiBcblxuICAgIHJldHVybiBvcmRlckhpc3Rvcmllc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnSGVsbG8sIHdvcmxkIScsXG4gICAgICAgICdBdCBsb25nIGxhc3QsIEkgbGl2ZSEnLFxuICAgICAgICAnSGVsbG8sIHNpbXBsZSBodW1hbi4nLFxuICAgICAgICAnV2hhdCBhIGJlYXV0aWZ1bCBkYXkhJyxcbiAgICAgICAgJ0lcXCdtIGxpa2UgYW55IG90aGVyIHByb2plY3QsIGV4Y2VwdCB0aGF0IEkgYW0geW91cnMuIDopJyxcbiAgICAgICAgJ1RoaXMgZW1wdHkgc3RyaW5nIGlzIGZvciBMaW5kc2F5IExldmluZS4nLFxuICAgICAgICAn44GT44KT44Gr44Gh44Gv44CB44Om44O844K244O85qeY44CCJyxcbiAgICAgICAgJ1dlbGNvbWUuIFRvLiBXRUJTSVRFLicsXG4gICAgICAgICc6RCcsXG4gICAgICAgICdZZXMsIEkgdGhpbmsgd2VcXCd2ZSBtZXQgYmVmb3JlLicsXG4gICAgICAgICdHaW1tZSAzIG1pbnMuLi4gSSBqdXN0IGdyYWJiZWQgdGhpcyByZWFsbHkgZG9wZSBmcml0dGF0YScsXG4gICAgICAgICdJZiBDb29wZXIgY291bGQgb2ZmZXIgb25seSBvbmUgcGllY2Ugb2YgYWR2aWNlLCBpdCB3b3VsZCBiZSB0byBuZXZTUVVJUlJFTCEnLFxuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0F1dGhGYWN0b3J5JywgIGZ1bmN0aW9uKCRodHRwKXtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgdmFyIEF1dGhGYWN0b3J5ID0ge307XG5cblxuICAgIEF1dGhGYWN0b3J5LnNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbykudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2F1dGgvZ29vZ2xlJyk7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgbG9naW4pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9yZXNldC9wYXNzd29yZC8nICsgdG9rZW4sIGxvZ2luKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2ZvcmdvdCcsIGVtYWlsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQXV0aEZhY3Rvcnk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdDYXJ0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCwgJGxvZywgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9jYXJ0Lyc7XG4gICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpdGVtLmltYWdlVXJsID0gJy9hcGkvcHJvZHVjdHMvJyArIGl0ZW0ucHJvZHVjdElkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgICB2YXIgQ2FydEZhY3RvcnkgPSB7fTtcbiAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gW107XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zb3J0KGZ1bmN0aW9uIChhLGIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBiLmlkIC0gYS5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3VwZGF0ZUNhcnQnLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZGVsZXRlSXRlbSA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIHByb2R1Y3RJZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja0ZvckR1cGxpY2F0ZXMgPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICB2YXIgZHVwbGljYXRlID0gdGhpcy5jYWNoZWRDYXJ0LmZpbHRlcihpdGVtID0+IGl0ZW0ucHJvZHVjdElkID09PSBwcm9kdWN0SWQpO1xuICAgICAgICByZXR1cm4gKGR1cGxpY2F0ZS5sZW5ndGgpID8gZHVwbGljYXRlWzBdIDogbnVsbDtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBxdWFudGl0eSkge1xuICAgICAgXG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSBDYXJ0RmFjdG9yeS5jaGVja0ZvckR1cGxpY2F0ZXMocHJvZHVjdElkKTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5XG4gICAgICAgICAgICAuY2hhbmdlUXVhbnRpdHkoZHVwbGljYXRlLmlkLCBkdXBsaWNhdGUucXVhbnRpdHksICdhZGQnLCBxdWFudGl0eSApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkU3VjY2Vzc0FuaW1hdGlvbigpXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgcHJvZHVjdElkLCB7cXVhbnRpdHk6IHF1YW50aXR5fSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8gLnRoZW4oY29udmVydClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21DYXJ0PWZ1bmN0aW9uKG9yZGVySWQpe1xuICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsK29yZGVySWQpXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tRnJvbnRFbmRDYWNoZShvcmRlcklkKVxuICAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlUXVhbnRpdHk9ZnVuY3Rpb24ob3JkZXJJZCwgcXVhbnRpdHksIGFkZE9yU3VidHIsIGFtb3VudCA9IDEpe1xuICAgICAgICB2YXIgcnVuRnVuYz1mYWxzZTtcbiAgICAgICAgaWYgKGFkZE9yU3VidHI9PT0nYWRkJykge1xuICAgICAgICAgICAgYWRkU3VjY2Vzc0FuaW1hdGlvbigpXG4gICAgICAgICAgICBxdWFudGl0eSs9ICthbW91bnQ7XG4gICAgICAgICAgICBydW5GdW5jPXRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYWRkT3JTdWJ0cj09PSdzdWJ0cmFjdCcgJiYgcXVhbnRpdHk+MSkge1xuICAgICAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgICAgICBxdWFudGl0eS09ICthbW91bnQ7XG4gICAgICAgICAgICBydW5GdW5jPXRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bkZ1bmM9PT10cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBvcmRlcklkLCB7cXVhbnRpdHk6cXVhbnRpdHl9KVxuICAgICAgICAgICAgLy8gLnRoZW4oY29udmVydClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5KG9yZGVySWQscXVhbnRpdHkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG5cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tRnJvbnRFbmRDYWNoZSA9IGZ1bmN0aW9uKG9yZGVySWQpe1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZm9yRWFjaChmdW5jdGlvbihvcmRlcixpKXtcbiAgICAgICAgICAgIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkgaW5kZXggPSBpO1xuICAgICAgICB9KVxuXG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKGluZGV4LDEpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eSA9IGZ1bmN0aW9uIChvcmRlcklkLHF1YW50aXR5KSB7XG4gICAgICAgIHZhciBpID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5maW5kSW5kZXgoZnVuY3Rpb24ob3JkZXIpe1xuICAgICAgICAgICAgLy8gaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSB7XG4gICAgICAgICAgICAvLyAgICAgb3JkZXIucXVhbnRpdHkgPSBxdWFudGl0eTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIHJldHVybiBvcmRlci5pZCA9PT0gb3JkZXJJZDtcbiAgICAgICAgfSk7XG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnRbaV0ucXVhbnRpdHkgPSBxdWFudGl0eVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ29yZGVySGlzdG9yaWVzJyk7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZSgwLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0Lmxlbmd0aCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2FydCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY2FydClcbiAgICAgICAgICAgICAgICBjYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSppdGVtLnF1YW50aXR5KSApXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RvdGEnLCB0b3RhbClcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgfVxuXG5cbiAgICB2YXIgYW5pbWF0aW9uRW5kID0gJ3dlYmtpdEFuaW1hdGlvbkVuZCBtb3pBbmltYXRpb25FbmQgTVNBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBhbmltYXRpb25lbmQnO1xuXG4gICAgZnVuY3Rpb24gYWRkU3VjY2Vzc0FuaW1hdGlvbigpIHtcbiAgICAgICAgJCgnI2NhcnQtaWNvbicpLmFkZENsYXNzKCdhbmltYXRlZCBydWJiZXJCYW5kJykub25lKGFuaW1hdGlvbkVuZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NhcnQtaWNvbicpLnJlbW92ZUNsYXNzKCdhbmltYXRlZCBydWJiZXJCYW5kJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cblxuICAgIGZ1bmN0aW9uIGFkZFJlbW92ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgJCgnI2NhcnQtaWNvbicpLmFkZENsYXNzKCdhbmltYXRlZCBzaGFrZScpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgc2hha2UnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgIENhcnRGYWN0b3J5LmZpbmRPbmVVc2VySW5mbz1mdW5jdGlvbigpe1xuICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgIH1cblxuICAgIHJldHVybiBDYXJ0RmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTWFuYWdlT3JkZXJzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZE9yZGVyRGV0YWlscyA9IFtdO1xuICAgIHZhciBjYWNoZWRVc2VyT3JkZXJzID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9tYW5hZ2VPcmRlcnMvJ1xuICAgIHZhciBtYW5hZ2VPcmRlcnNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZE9yZGVyRGV0YWlscylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRPcmRlckRldGFpbHM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyT3JkZXInKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkVXNlck9yZGVycylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VyT3JkZXJzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXIvJyArIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24odXNlck9yZGVySWQsIGRhdGEpe1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQsIGRhdGEpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXJPcmRlcil7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIlVwZGF0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVyc1t1cGRhdGVkSW5kXSA9IHVzZXJPcmRlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlcjtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAodXNlck9yZGVySWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KFwiRGVsZXRlZFwiLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlck9yZGVycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXJPcmRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2VyT3JkZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hbmFnZU9yZGVyc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cblxuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvcHJvZHVjdHMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgcGFyc2VUaW1lU3RyID0gZnVuY3Rpb24gKHJldmlldykge1xuICAgICAgICB2YXIgZGF0ZSA9IHJldmlldy5jcmVhdGVkQXQuc3Vic3RyKDAsIDEwKTtcbiAgICAgICAgcmV2aWV3LmRhdGUgPSBkYXRlO1xuICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgIH1cblxuICAgIHZhciBQcm9kdWN0RmFjdG9yeSA9IHt9O1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzID0gW107XG4gICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyA9IFtdO1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCkudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMubWFwKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShwcm9kdWN0cywgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VwZGF0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5maW5kSW5kZXgoZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzW3VwZGF0ZWRJbmRdID0gcHJvZHVjdDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RlbGV0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQgPSBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICBwcm9kdWN0LmltYWdlVXJsID0gYmFzZVVybCArIHByb2R1Y3QuaWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkLCBkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldmlldyA9IHBhcnNlVGltZVN0cihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLnB1c2gocmV2aWV3KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbFJldmlld3MgPSBmdW5jdGlvbiAocHJvZHVjdElkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MpO1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLm1hcChwYXJzZVRpbWVTdHIpO1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvZHVjdEZhY3Rvcnk7XG5cbn0pXG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcbiAgICB2YXIgVXNlckZhY3RvcnkgPSB7fTtcblxuICAgIHZhciBjYWNoZWRVc2VycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvdXNlcnMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIFVzZXJGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHVzZXJzLCBjYWNoZWRVc2Vycyk7IC8vIHdoeSBhbmd1bGFyIGNvcHkgYWx0ZXJzIGFycmF5IG9yZGVyISEhISEhIVxuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vycy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VycztcbiAgICAgICAgICAgICAgICB9KVxuICAgIH07XG5cblxuICAgIFVzZXJGYWN0b3J5LmZpbmRVc2VyPWZ1bmN0aW9uKGlkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXkgbXkgbmFtZWVlZWVlZScsIHVzZXIpXG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQgPSBmdW5jdGlvbiAoaW5mb09iail7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgaWYodXNlci5pZCA9PT0gJ3Nlc3Npb24nKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlU2Vzc2lvbkNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyKHVzZXIuaWQsaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVVzZXJDYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbn0pXG4iLCJhbmd1bGFyLm1vZHVsZSgnYW5ndWxpa2UnKVxuICAgIC5kaXJlY3RpdmUoJ2ZiTGlrZScsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgLy8gc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAvLyAgICAgZmJMaWtlOiAnPT8nXG4gICAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5GQikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBGYWNlYm9vayBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5pbml0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGZibWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICd2Mi4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckxpa2VCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5mYkxpa2UgJiYgIXNjb3BlLmZiTGlrZSAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ2ZiTGlrZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImZiLWxpa2VcIicgKyAoISFzY29wZS5mYkxpa2UgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5mYkxpa2UgKyAnXCInIDogJycpICsgJyBkYXRhLWxheW91dD1cImJ1dHRvbl9jb3VudFwiIGRhdGEtYWN0aW9uPVwibGlrZVwiIGRhdGEtc2hvdy1mYWNlcz1cInRydWVcIiBkYXRhLXNoYXJlPVwidHJ1ZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuWEZCTUwucGFyc2UoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiYXBwLmRpcmVjdGl2ZSgnc2hvcHBpbmdDYXJ0JywgZnVuY3Rpb24oQ2FydEZhY3RvcnksICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgYWN0aXZlOiAnPScsXG4gICAgICAgICAgICBhZGRBbmRSZXZlYWxDYXJkOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgLy8gc2NvcGU6IHsgc2V0Rm46ICcmJyB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKS50aGVuKGZ1bmN0aW9uIChjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCd1cGRhdGVDYXJ0JywgZnVuY3Rpb24gKGV2ZW50LCBjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IGNhcnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgc2NvcGUucmV2ZWFsQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCBjaGVja291dC0tYWN0aXZlJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5oaWRlQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5hY3RpdmUgPSAnaW5hY3RpdmUnO1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgICAgICAgICBpZihzY29wZS5jYXJ0KVxuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlICogaXRlbS5xdWFudGl0eSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIC8vIHNjb3BlLnNldEZuKHt0aGVEaXJGbjogc2NvcGUudXBkYXRlTWFwfSk7XG5cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCdvYXV0aEJ1dHRvbicsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgcHJvdmlkZXJOYW1lOiAnQCdcbiAgICB9LFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ29yZGVyRW50cnknLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBvcmRlckRldGFpbHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAocywgZSwgYSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocy5vcmRlckRldGFpbHMpO1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckhpc3RvcnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblx0XG59KSIsImFwcC5kaXJlY3RpdmUoJ29yZGVySGlzdG9yeScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGhpc3RvcmllczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdPcmRlckhpc3RvcnlDdHJsJ1xuICAgXG4gICAgfVxuXG59KVxuICAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdENhcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblxuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbXG4gICAgICAgIHtuYW1lOiAnQWxsJ30sXG4gICAgICAgIHtuYW1lOiAnRmlyZSd9LFxuICAgICAgICB7bmFtZTogJ1dhdGVyJ30sXG4gICAgICAgIHtuYW1lOiAnR3Jhc3MnfSxcbiAgICAgICAge25hbWU6ICdSb2NrJ30sXG4gICAgICAgIHtuYW1lOiAnRHJhZ29uJ30sXG4gICAgICAgIHtuYW1lOiAnUHN5Y2hpYyd9LFxuICAgICAgICB7bmFtZTogJ0ljZSd9LFxuICAgICAgICB7bmFtZTogJ05vcm1hbCd9LFxuICAgICAgICB7bmFtZTogJ0J1Zyd9LFxuICAgICAgICB7bmFtZTogJ0VsZWN0cmljJ30sXG4gICAgICAgIHtuYW1lOiAnR3JvdW5kJ30sXG4gICAgICAgIHtuYW1lOiAnRmFpcnknfSxcbiAgICAgICAge25hbWU6ICdGaWdodGluZyd9LFxuICAgICAgICB7bmFtZTogJ0dob3N0J30sXG4gICAgICAgIHtuYW1lOiAnUG9pc29uJ31cbiAgICBdXG5cbiAgICAkc2NvcGUuZmlsdGVyID0gZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCBjYXRlZ29yeSA9PT0gJ0FsbCcpIHJldHVybiB0cnVlXG4gICAgICAgICAgICBlbHNlIHJldHVybiBwcm9kdWN0LmNhdGVnb3J5ID09PSBjYXRlZ29yeVxuICAgICAgICB9O1xuICAgIH07XG4gICAgJHNjb3BlLnNlYXJjaEZpbHRlcj1mdW5jdGlvbihzZWFyY2hpbmdOYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFzZWFyY2hpbmdOYW1lKSByZXR1cm4gdHJ1ZTsgICAgICAgICAgIFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGxlbiA9IHNlYXJjaGluZ05hbWUubGVuZ3RoXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2R1Y3QnLCBwcm9kdWN0LnRpdGxlKVxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnRpdGxlLnN1YnN0cmluZygwLGxlbikudG9Mb3dlckNhc2UoKT09c2VhcmNoaW5nTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUucHJpY2VSYW5nZUZpbHRlcj1mdW5jdGlvbihtaW49MCxtYXg9MjAwMCl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwcm9kdWN0KXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnByaWNlPj1taW4gJiYgcHJvZHVjdC5wcmljZTw9bWF4O1xuICAgICAgICB9XG4gICAgfVxuICAgICRzY29wZS5zb3J0aW5nRnVuYz1mdW5jdGlvbihzb3J0VHlwZT1cInVudG91Y2hlZFwiKXtcbiAgICAgICAgaWYgKHNvcnRUeXBlPT09XCJ1bnRvdWNoZWRcIikgcmV0dXJuIG51bGw7XG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09XCJsb3dcIikgcmV0dXJuICdwcmljZSdcbiAgICAgICAgZWxzZSBpZiAoc29ydFR5cGU9PT0naGlnaCcpIHJldHVybiAnLXByaWNlJ1xuICAgICAgICB9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0Q2FyZCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0czogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q2FyZEN0cmwnXG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0RW50cnknLCBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3Q6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdFVwZGF0ZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnU2hvcCcsIHN0YXRlOiAnc3RvcmUnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTdweCAtMzA2cHgnKVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnVudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTNweCAtOXB4JylcblxuICAgICAgICAgICAgfSAgIFxuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0QWRtaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coQXV0aEludGVyY2VwdG9yKTtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmFkbWluID0gQXV0aFNlcnZpY2UuaXNBZG1pbih1c2VyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcbiAgICAgICAgICAgIHNldEFkbWluKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsIi8vIGFwcC5kaXJlY3RpdmUoJ3N0YXJSYXRpbmcnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuLy8gICAgICAgdGVtcGxhdGU6XG4vLyAgICAgICAgICc8c3BhbiBjbGFzcz1cInN0YXJzXCI+JyArXG4vLyAgICAgICAgICAnPGRpdiBjbGFzcz1cInN0YXJzLWZpbGxlZCBsZWZ0XCI+JyArXG4vLyAgICAgICAgICAgICAnPHNwYW4+4piFPC9zcGFuPicgK1xuLy8gICAgICAgICAgJzwvZGl2PicgK1xuLy8gICAgICAgJzwvc3Bhbj4nXG4vLyAgICAgfTtcbi8vIH0pXG4iLCIgLy8gYXBwLmNvbnRyb2xsZXIoJ1NlYXJjaEJhckN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuIC8vIFx0JHNjb3BlLnByb2R1Y3Q9XG4gLy8gfSkiLCJhcHAuZGlyZWN0aXZlKCdzZWFyY2hCYXInLCBmdW5jdGlvbigpe1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OidFJyxcblx0XHR0ZW1wbGF0ZVVybDonanMvY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6J1Byb2R1Y3RDYXJkQ3RybCdcblx0fVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlckVudHJ5JywgZnVuY3Rpb24gKFVzZXJGYWN0b3J5LCBBdXRoRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCh7ZW1haWw6IGVtYWlsfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEb25lJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlcih1c2VySWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRXJhc2UgZnJvbSBwbGFuZXQgRWFydGgnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyT3JkZXInLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlck9yZGVyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyhpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LmRlbGV0ZVVzZXJPcmRlcihpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiXG5hcHAuZGlyZWN0aXZlKCdjbGlja0FueXdoZXJlQnV0SGVyZScsIGZ1bmN0aW9uKCRkb2N1bWVudCl7XG4gIHJldHVybiB7XG4gICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICBjbGlja0FueXdoZXJlQnV0SGVyZTogJyYnXG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWwsIGF0dHIpIHtcblxuICAgICAgICAgICAgICAgJCgnLmxvZ28nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICRkb2N1bWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldC5pZCAhPT0gJ2NhcnQtaWNvbicgJiYgZS50YXJnZXQuaWQgIT09ICdhZGQtdG8tY2FydC1idXR0b24nKSB7XG4gICAgICAgICAgICAgICAgICAgaWYgKGVsICE9PSBlLnRhcmdldCAmJiAhZWxbMF0uY29udGFpbnMoZS50YXJnZXQpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsKHNjb3BlLmNsaWNrQW55d2hlcmVCdXRIZXJlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICB9XG4gICAgICAgIH1cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
