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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwic2lnbnVwL3NpZ251cC5qcyIsInN0b3JlL3N0b3JlLmNvbnRyb2xsZXIuanMiLCJzdG9yZS9zdG9yZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvT3JkZXJIaXN0b3JpZXMuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yZXZpZXctZW50cnkvc3Rhci1yYXRpbmcuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91dGlsaXR5L2NsaWNrQW55d2hlcmVCdXRIZXJlLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBOEJBLENBdkNBOztBQ3BCQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxhQUFBLFFBREE7QUFFQSxvQkFBQSxpQkFGQTtBQUdBLHFCQUFBO0FBSEEsS0FBQTtBQU1BLENBVEE7O0FBV0EsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7O0FBRUE7QUFDQSxXQUFBLE1BQUEsR0FBQSxFQUFBLE9BQUEsQ0FBQSxhQUFBLENBQUE7QUFFQSxDQUxBOztBQ1ZBLElBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsSUFBQSxFQUFBLFdBQUEsRUFBQSxRQUFBLEVBQUEsZUFBQSxFQUFBLG1CQUFBLEVBQUE7O0FBRUEsV0FBQSxRQUFBLEdBQUEsV0FBQTtBQUNBLFdBQUEsS0FBQSxHQUFBLFFBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxhQUFBOztBQUVBO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLE1BQUEsRUFBQTtBQUNBLHdCQUFBLE1BQUEsR0FBQSxNQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFJQSxLQUxBOztBQU9BO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsUUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLHdCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFJQSxLQUxBO0FBTUEsc0JBQUEsZ0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxXQUFBLEdBQUEsRUFBQSxXQUFBO0FBQ0EsS0FGQSxDQUFBO0FBR0Esc0JBQUEsRUFBQSxPQUFBLENBQUEsZUFBQSxFQUFBLGFBQUEsQ0FBQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEVBQUEsR0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsRUFBQSxPQUFBLENBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQSxDQUFBO0FBR0EsWUFBQSxHQUFBLENBQUEsT0FBQSxNQUFBO0FBRUEsQ0E5QkE7O0FDREEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxtQkFDQSxLQURBLENBQ0EsT0FEQSxFQUNBO0FBQ0EsYUFBQSxRQURBO0FBRUEscUJBQUEscUJBRkE7QUFHQSxvQkFBQSxXQUhBO0FBSUEsaUJBQUE7QUFDQSx5QkFBQSxxQkFBQSxjQUFBLEVBQUE7QUFDQSx1QkFBQSxlQUFBLFFBQUEsRUFBQTtBQUNBLGFBSEE7QUFJQSxzQkFBQSxrQkFBQSxXQUFBLEVBQUE7QUFDQSx1QkFBQSxZQUFBLFFBQUEsRUFBQTtBQUNBLGFBTkE7QUFPQSw2QkFBQSx5QkFBQSxtQkFBQSxFQUFBO0FBQ0EsdUJBQUEsb0JBQUEsUUFBQSxFQUFBO0FBQ0EsYUFUQTtBQVVBLDJCQUFBLHVCQUFBLG1CQUFBLEVBQUE7QUFDQSx1QkFBQSxvQkFBQSxrQkFBQSxFQUFBO0FBQ0E7QUFaQTtBQUpBLEtBREE7QUFvQkEsQ0FyQkE7O0FDQUEsSUFBQSxVQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLElBQUEsRUFBQSxXQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsV0FBQSxXQUFBLEdBQUEsV0FBQTs7QUFFQSxXQUFBLE1BQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLG9CQUFBLGNBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsbUJBQUEsV0FBQSxHQUFBLE9BQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLElBSEE7QUFJQSxLQUxBOztBQU9BLFdBQUEsY0FBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxhQUFBLEVBQUE7QUFDQSxvQkFBQSxjQUFBLENBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxhQUFBO0FBQ0EsZUFBQSxXQUFBLEdBQUEsWUFBQSxVQUFBO0FBQ0EsS0FIQTs7QUFLQSxXQUFBLFFBQUEsR0FBQSxZQUFBLFFBQUE7O0FBRUEsV0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsUUFBQSxDQUFBO0FBQ0Esb0JBQUEsT0FBQSxDQUFBO0FBQUEsbUJBQUEsU0FBQSxLQUFBLEtBQUEsR0FBQSxLQUFBLFFBQUE7QUFBQSxTQUFBOztBQUVBLGVBQUEsS0FBQTtBQUNBLEtBTEE7QUFNQSxDQXZCQTs7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLE9BREE7QUFFQSxxQkFBQSxtQkFGQTtBQUdBLG9CQUFBLFVBSEE7QUFJQSxpQkFBQTtBQUNBLHlCQUFBLHFCQUFBLFdBQUEsRUFBQTs7QUFFQSx1QkFBQSxZQUFBLGdCQUFBLEVBQUE7QUFFQTtBQUxBO0FBSkEsS0FBQTtBQVlBLENBYkE7O0FDQUEsSUFBQSxVQUFBLENBQUEsY0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxnQkFBQSxnQkFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGdCQUFBLEdBQUEsQ0FBQSxLQUFBO0FBQ0EsZUFBQSxLQUFBLEdBQUEsS0FBQTs7QUFFQTtBQUNBLFlBQUEsV0FBQSxLQUFBO0FBQ0EsWUFBQSxpQkFBQSxFQUFBO0FBQ0EsaUJBQUEsT0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsMkJBQUEsSUFBQSxDQUFBLFFBQUEsS0FBQSxHQUFBLFFBQUEsUUFBQTtBQUNBLFNBRkE7QUFHQSxlQUFBLEtBQUEsR0FBQSxlQUFBLE1BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxJQUFBO0FBQUEsbUJBQUEsT0FBQSxJQUFBO0FBQUEsU0FBQSxDQUFBO0FBQ0EsS0FaQTs7QUFjQSxXQUFBLFFBQUEsR0FBQSxZQUFBLFFBQUE7QUFFQSxDQWxCQTs7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxhQUFBLFdBREE7QUFFQSxxQkFBQSwyQkFGQTtBQUdBLG9CQUFBO0FBSEEsS0FBQTtBQUtBLENBTkE7O0FDQUEsQ0FBQSxZQUFBOztBQUVBOztBQUVBOztBQUNBLFFBQUEsQ0FBQSxPQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsS0FBQSxDQUFBLHdCQUFBLENBQUE7O0FBRUEsUUFBQSxNQUFBLFFBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxFQUFBLENBQUE7O0FBRUEsUUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLFlBQUE7QUFDQSxZQUFBLENBQUEsT0FBQSxFQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSxzQkFBQSxDQUFBO0FBQ0EsZUFBQSxPQUFBLEVBQUEsQ0FBQSxPQUFBLFFBQUEsQ0FBQSxNQUFBLENBQUE7QUFDQSxLQUhBOztBQUtBO0FBQ0E7QUFDQTtBQUNBLFFBQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLHNCQUFBLG9CQURBO0FBRUEscUJBQUEsbUJBRkE7QUFHQSx1QkFBQSxxQkFIQTtBQUlBLHdCQUFBLHNCQUpBO0FBS0EsMEJBQUEsd0JBTEE7QUFNQSx1QkFBQTtBQU5BLEtBQUE7O0FBU0EsUUFBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsWUFBQSxhQUFBO0FBQ0EsaUJBQUEsWUFBQSxnQkFEQTtBQUVBLGlCQUFBLFlBQUEsYUFGQTtBQUdBLGlCQUFBLFlBQUEsY0FIQTtBQUlBLGlCQUFBLFlBQUE7QUFKQSxTQUFBO0FBTUEsZUFBQTtBQUNBLDJCQUFBLHVCQUFBLFFBQUEsRUFBQTtBQUNBLDJCQUFBLFVBQUEsQ0FBQSxXQUFBLFNBQUEsTUFBQSxDQUFBLEVBQUEsUUFBQTtBQUNBLHVCQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBO0FBSkEsU0FBQTtBQU1BLEtBYkE7O0FBZUEsUUFBQSxNQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxzQkFBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FEQSxFQUVBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsVUFBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsUUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxpQkFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0Esb0JBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLHVCQUFBLFVBQUEsQ0FBQSxZQUFBLFlBQUE7QUFDQSxtQkFBQSxLQUFBLElBQUE7QUFDQTs7QUFFQSxhQUFBLE9BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsT0FBQTtBQUNBLFNBRkE7O0FBSUE7QUFDQTtBQUNBLGFBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsUUFBQSxJQUFBO0FBQ0EsU0FGQTs7QUFJQSxhQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLGdCQUFBLEtBQUEsZUFBQSxNQUFBLGVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsR0FBQSxJQUFBLENBQUEsUUFBQSxJQUFBLENBQUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsS0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFGQSxDQUFBO0FBSUEsU0FyQkE7O0FBdUJBLGFBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsaUJBREEsRUFFQSxLQUZBLENBRUEsWUFBQTtBQUNBLHVCQUFBLEdBQUEsTUFBQSxDQUFBLEVBQUEsU0FBQSw0QkFBQSxFQUFBLENBQUE7QUFDQSxhQUpBLENBQUE7QUFLQSxTQU5BOztBQVFBLGFBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxPQUFBO0FBQ0EsMkJBQUEsVUFBQSxDQUFBLFlBQUEsYUFBQTtBQUNBLGFBSEEsQ0FBQTtBQUlBLFNBTEE7QUFPQSxLQXpEQTs7QUEyREEsUUFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLE9BQUEsSUFBQTs7QUFFQSxtQkFBQSxHQUFBLENBQUEsWUFBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxpQkFBQSxPQUFBO0FBQ0EsU0FGQTs7QUFJQSxtQkFBQSxHQUFBLENBQUEsWUFBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGlCQUFBLE9BQUE7QUFDQSxTQUZBOztBQUlBLGFBQUEsRUFBQSxHQUFBLElBQUE7QUFDQSxhQUFBLElBQUEsR0FBQSxJQUFBOztBQUVBLGFBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsR0FBQSxTQUFBO0FBQ0EsaUJBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxTQUhBOztBQUtBLGFBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxpQkFBQSxFQUFBLEdBQUEsSUFBQTtBQUNBLGlCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQTtBQUtBLEtBekJBO0FBMkJBLENBeElBOztBQ0FBLElBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLHFCQUFBLEVBQUE7O0FBRUEsMEJBQUEsUUFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLGFBQUEsRUFBQTs7QUFFQSxzQkFBQSxTQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsR0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxjQUFBLElBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxTQUZBOztBQUlBLGVBQUEsVUFBQSxHQUFBLGNBQUEsU0FBQTtBQUNBLEtBUkEsRUFTQSxLQVRBLENBU0EsSUFUQTtBQVdBLENBYkE7O0FDQUEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsZ0JBQUEsRUFBQTtBQUNBLGFBQUEsWUFEQTtBQUVBLHFCQUFBLGdDQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBO0FBS0EsQ0FOQTs7QUNBQSxJQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7QUFDQSxRQUFBLHFCQUFBLDhEQUFBO0FBQ0EsUUFBQSxtQkFBQSxTQUFBLGdCQUFBLEdBQUE7QUFDQSxZQUFBLGFBQUE7QUFDQSxpQkFBQSxDQUNBLEtBREEsRUFFQSxlQUZBLENBREE7QUFLQSxvQkFBQSxDQUNBLE9BREEsRUFFQSxTQUZBLEVBR0EsUUFIQTtBQUxBLFNBQUE7O0FBWUEsaUJBQUEsSUFBQSxHQUFBO0FBQ0EsbUJBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxDQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxJQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxLQUFBLENBQUEsQ0FBQSxLQUFBLENBQUEsSUFBQSxHQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxnQkFBQSxDQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLFdBQUEsR0FBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLFdBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0E7O0FBRUEsaUJBQUEsYUFBQSxDQUFBLEdBQUEsRUFBQTs7QUFFQSxnQkFBQSxTQUFBLFFBQUEsS0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBO0FBQ0EsZ0JBQUEsUUFBQSw4QkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLEdBQUEsR0FBQSxNQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLElBQUE7QUFDQSxnQkFBQSxZQUFBLGlCQUFBLEdBQUEsQ0FBQTtBQUNBLGdCQUFBLFNBQUEsTUFBQTtBQUNBLGdCQUFBLElBQUEsYUFBQSxNQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLElBQUEsY0FBQSxLQUFBLE1BQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLFlBQUEsS0FBQSxHQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBOztBQUVBLG1CQUFBLEtBQ0EsWUFEQSxHQUNBLFNBREEsR0FDQSxrQkFEQSxHQUNBLEtBREEsR0FDQSxHQURBLEdBRUEsV0FGQSxHQUVBLFNBRkEsR0FFQSxTQUZBLEdBRUEsU0FGQSxHQUVBLEtBRkEsR0FFQSxRQUZBLEdBR0EsTUFIQTtBQUlBOztBQUVBLFlBQUEsTUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxZQUFBLFFBQUEsRUFBQTs7QUFFQSxhQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EscUJBQUEsY0FBQSxLQUFBLENBQUE7QUFDQTs7QUFFQSxhQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EscUJBQUEsY0FBQSxRQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxjQUFBLENBQUEsUUFBQSxFQUFBLFNBQUEsR0FBQSxLQUFBO0FBQ0EsS0F2REE7O0FBeURBLFdBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEsa0JBQUEsb0NBQ0EsbUNBREEsR0FFQSwrQkFGQSxHQUdBLHVDQUhBLEdBSUEsTUFKQSxHQUtBLHlCQUxBLEdBTUEsUUFSQTtBQVNBLGlCQUFBLG1CQUFBO0FBQ0EsbUJBQUE7QUFDQSxxQkFBQSxlQUFBO0FBQ0Esc0JBQUEsT0FBQSxFQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0E7QUFDQSxpQkFKQTtBQUtBLHNCQUFBLGdCQUFBOztBQUVBLHNCQUFBLGdCQUFBLEVBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxzQkFBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLGtCQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSwrQkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBLHFCQUZBO0FBR0E7QUFYQSxhQUFBO0FBYUEsU0F2QkE7QUF3QkEsZUFBQSxpQkFBQSxDQUVBO0FBMUJBLEtBQUE7QUE0QkEsQ0F2RkE7O0FDQUEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsYUFBQSxHQURBO0FBRUEscUJBQUE7QUFGQSxLQUFBO0FBSUEsQ0FMQTs7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxtQkFBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxRQURBO0FBRUEscUJBQUEscUJBRkE7QUFHQSxvQkFBQTtBQUhBLEtBQUE7O0FBTUEsbUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsUUFEQTtBQUVBLHFCQUFBLHFCQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBOztBQU1BLG1CQUFBLEtBQUEsQ0FBQSxVQUFBLEVBQUE7QUFDQSxhQUFBLHdCQURBO0FBRUEscUJBQUEsOEJBRkE7QUFHQSxvQkFBQTtBQUhBLEtBQUE7QUFNQSxDQXBCQTs7QUFzQkEsSUFBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsV0FBQSxLQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsS0FBQSxHQUFBLElBQUE7QUFDQSxXQUFBLEtBQUEsR0FBQSxhQUFBLEtBQUE7O0FBRUEsV0FBQSxjQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxjQUFBLENBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLGtCQUFBLEVBQUEsSUFBQTtBQUNBLFNBRkE7QUFHQSxLQUpBO0FBS0EsV0FBQSxhQUFBLEdBQUEsVUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsYUFBQSxDQUFBLFFBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQSxPQUFBO0FBQ0EsU0FGQTtBQUdBLEtBSkE7O0FBTUEsV0FBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7O0FBRUEsZUFBQSxLQUFBLEdBQUEsSUFBQTs7QUFFQSxvQkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsbUJBQUEsWUFBQSxnQkFBQSxFQUFBO0FBQ0EsU0FGQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQSxPQUFBO0FBQ0EsU0FKQSxFQUlBLEtBSkEsQ0FJQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxHQUFBLDRCQUFBO0FBQ0EsU0FOQTtBQVFBLEtBWkE7QUFjQSxDQS9CQTs7QUN0QkEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUEsbUJBQUEsS0FBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGFBQUEsZUFEQTtBQUVBLGtCQUFBLG1FQUZBO0FBR0Esb0JBQUEsb0JBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLHdCQUFBLFFBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEdBQUEsS0FBQTtBQUNBLGFBRkE7QUFHQSxTQVBBO0FBUUE7QUFDQTtBQUNBLGNBQUE7QUFDQSwwQkFBQTtBQURBO0FBVkEsS0FBQTtBQWVBLENBakJBOztBQW1CQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxXQUFBLFNBQUEsUUFBQSxHQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsSUFBQTtBQUNBLFNBRkEsQ0FBQTtBQUdBLEtBSkE7O0FBTUEsV0FBQTtBQUNBLGtCQUFBO0FBREEsS0FBQTtBQUlBLENBWkE7QUNuQkEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxXQUFBLElBQUEsR0FBQSxFQUFBOztBQUVBLFdBQUEsWUFBQSxHQUFBLFlBQUE7O0FBRUEsb0JBQUEsdUJBQUEsQ0FBQSxPQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsWUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFLQSxLQVBBO0FBUUEsV0FBQSxTQUFBLEdBQUEsU0FBQTtBQUNBLFdBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSxXQUFBLGFBQUEsR0FBQSxhQUFBLEdBQUEsQ0FBQTtBQUFBLGVBQUEsS0FBQSxLQUFBO0FBQUEsS0FBQSxFQUFBLElBQUEsQ0FBQSxHQUFBLENBQUE7QUFDQSxDQWRBO0FDQUEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBO0FBQ0EsYUFBQSxVQURBO0FBRUEscUJBQUEseUJBRkE7QUFHQSxvQkFBQSxhQUhBO0FBSUEsaUJBQUE7QUFDQSx1QkFBQSxtQkFBQSxXQUFBLEVBQUE7QUFBQSx1QkFBQSxZQUFBLFlBQUEsRUFBQTtBQUFBLGFBREE7QUFFQSwwQkFBQSxzQkFBQSxXQUFBLEVBQUE7QUFBQSx1QkFBQSxZQUFBLGdCQUFBLEVBQUE7QUFBQTtBQUZBO0FBSkEsS0FBQTtBQVNBLENBVkE7O0FDQUEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQTtBQUNBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsT0FBQSxHQUFBLFVBQUE7QUFDQSxXQUFBLE9BQUEsR0FBQSxVQUFBO0FBQ0E7QUFDQSxXQUFBLFNBQUEsR0FBQSxLQUFBO0FBQ0EsV0FBQSxZQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLFNBQUEsR0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsWUFBQSxDQUFBLE9BQUEsT0FBQSxDQUFBLEVBQUEsRUFBQSxPQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLE9BQUEsR0FBQSxlQUFBLGFBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsSUFBQTtBQUNBLFNBSkEsRUFJQSxLQUpBLENBSUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxzQkFBQSxFQUFBLElBQUE7QUFDQSxTQU5BO0FBT0EsS0FUQTtBQVVBO0FBQ0EsV0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLG9CQUFBLFNBQUEsQ0FBQSxPQUFBLE9BQUEsQ0FBQSxFQUFBLEVBQUEsT0FBQSxRQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsOENBQUEsRUFBQSxJQUFBO0FBQ0EsU0FIQTtBQUlBLEtBTEE7QUFNQSxXQUFBLFVBQUEsR0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLFlBQUEsTUFBQSxFQUFBO0FBQ0Es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R0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLHFCQUFBLEtBQUEsRUFBQSxLQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBQ0EsQ0F4QkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLFVBQUEsbUJBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUEsbUJBQUEsS0FBQSxTQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNBLEtBSEE7QUFJQSxRQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsU0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsWUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLFNBWEEsQ0FBQTtBQVlBLEtBYkE7O0FBZUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxnQkFBQSxrQkFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUFBLG1CQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUE7QUFBQSxTQUFBLENBQUE7QUFDQSxlQUFBLFVBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLFlBQUEsWUFBQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsWUFDQSxjQURBLENBQ0EsVUFBQSxFQURBLEVBQ0EsVUFBQSxRQURBLEVBQ0EsS0FEQSxFQUNBLFFBREEsQ0FBQTtBQUVBLFNBSEEsTUFHQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUEsRUFBQSxVQUFBLFFBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUNBLGFBTEEsQ0FBQTtBQU1BO0FB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QUFBLENBQUEscUJBQUE7QUFDQSxTQUZBO0FBR0E7O0FBSUEsYUFBQSxrQkFBQSxHQUFBO0FBQ0EsVUFBQSxZQUFBLEVBQUEsUUFBQSxDQUFBLGdCQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsU0FGQTtBQUdBOztBQUVBLFdBQUEsV0FBQTtBQUVBLENBdkpBOztBQ0FBLElBQUEsT0FBQSxDQUFBLHFCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxxQkFBQSxFQUFBO0FBQ0EsUUFBQSxtQkFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLG9CQUFBO0FBQ0EsUUFBQSxzQkFBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSx3QkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxrQkFBQTtBQUNBLG1CQUFBLGtCQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSx3QkFBQSxrQkFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxnQkFBQTtBQUNBLG1CQUFBLGdCQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSx3QkFBQSxVQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxDQUFBO0FBRUEsS0FIQTs7QUFLQSx3QkFBQSxRQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsT0FBQSxHQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxDQUFBO0FBRUEsS0FIQTs7QUFLQSx3QkFBQSxZQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsU0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxpQkFBQSxTQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx1QkFBQSxVQUFBLEVBQUEsS0FBQSxXQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsNkJBQUEsVUFBQSxJQUFBLFNBQUE7QUFDQSxtQkFBQSxTQUFBO0FBQ0EsU0FUQSxDQUFBO0FBVUEsS0FYQTtBQVlBLHdCQUFBLGVBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUNBLE9BREEsQ0FDQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxpQkFBQSxTQUFBLENBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx1QkFBQSxVQUFBLEVBQUEsS0FBQSxXQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsNkJBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTs7QUFXQSxXQUFBLG1CQUFBO0FBRUEsQ0EzREE7O0FDQUEsSUFBQSxPQUFBLENBQUEsZ0JBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFHQSxRQUFBLFVBQUEsZ0JBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBO0FBQ0EsUUFBQSxlQUFBLFNBQUEsWUFBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFlBQUEsT0FBQSxPQUFBLFNBQUEsQ0FBQSxNQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQTtBQUNBLGVBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxlQUFBLE1BQUE7QUFDQSxLQUpBOztBQU1BLFFBQUEsaUJBQUEsRUFBQTtBQUNBLG1CQUFBLGNBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsYUFBQSxHQUFBLEVBQUE7O0FBRUEsbUJBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsR0FBQSxDQUFBLGVBQUEsT0FBQSxDQUFBO0FBQ0EsU0FIQSxFQUdBLElBSEEsQ0FHQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsZUFBQSxjQUFBLEVBREEsQ0FDQTtBQUNBLDJCQUFBLGNBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLGVBQUEsY0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7O0FBYUEsbUJBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLGVBQUEsT0FGQSxFQUdBLElBSEEsQ0FHQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsZUFBQSxjQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDJCQUFBLGNBQUEsQ0FBQSxVQUFBLElBQUEsT0FBQTtBQUNBLG1CQUFBLE9BQUE7QUFDQSxTQVZBLENBQUE7QUFXQSxLQVpBOztBQWNBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FOQSxDQUFBO0FBT0EsS0FSQTs7QUFVQSxtQkFBQSxTQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLGVBQUEsT0FGQSxDQUFBO0FBSUEsS0FMQTs7QUFPQSxtQkFBQSxPQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxnQkFBQSxRQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxPQUFBO0FBQ0EsS0FIQTs7QUFLQSxtQkFBQSxZQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxrQkFBQSxTQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLFNBQUEsYUFBQSxTQUFBLElBQUEsQ0FBQTtBQUNBLDJCQUFBLGFBQUEsQ0FBQSxJQUFBLENBQUEsTUFBQTtBQUNBLG1CQUFBLE1BQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxLQVBBOztBQVNBLG1CQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsa0JBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxlQUFBLGFBQUE7QUFDQSxtQkFBQSxlQUFBLGFBQUEsQ0FBQSxHQUFBLENBQUEsWUFBQSxDQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxXQUFBLGNBQUE7QUFFQSxDQW5GQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLGNBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxhQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxXQUFBLEVBREEsQ0FDQTtBQUNBLHdCQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsV0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxVQUFBLElBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFD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LDBCQUFBO0FBREEsU0FEQTtBQUlBLGtCQUFBLEdBSkE7QUFLQSxxQkFBQTtBQUxBLEtBQUE7QUFPQSxDQVJBOztBQ0ZBLElBQUEsVUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7O0FBR0EsV0FBQSxVQUFBLEdBQUEsQ0FDQSxFQUFBLE1BQUEsS0FBQSxFQURBLEVBRUEsRUFBQSxNQUFBLE1BQUEsRUFGQSxFQUdBLEVBQUEsTUFBQSxPQUFBLEVBSEEsRUFJQSxFQUFBLE1BQUEsT0FBQSxFQUpBLEVBS0EsRUFBQSxNQUFBLE1BQUEsRUFMQSxFQU1BLEVBQUEsTUFBQSxRQUFBLEVBTkEsRUFPQSxFQUFBLE1BQUEsU0FBQSxFQVBBLEVBUUEsRUFBQSxNQUFBLEtBQUEsRUFSQSxFQVNBLEVBQUEsTUFBQSxRQUFBLEVBVEEsRUFVQSxFQUFBLE1BQUEsS0FBQSxFQVZBLEVBV0EsRUFBQSxNQUFBLFVBQUEsRUFYQSxFQVlBLEVBQUEsTUFBQSxRQUFBLEVBWkEsRUFhQSxFQUFBLE1BQUEsT0FBQSxFQWJBLEVBY0EsRUFBQSxNQUFBLFVBQUEsRUFkQSxFQWVBLEVBQUEsTUFBQSxPQUFBLEVBZkEsRUFnQkEsRUFBQSxNQUFBLFFBQUEsRUFoQkEsQ0FBQTs7QUFtQkEsV0FBQSxNQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxRQUFBLElBQUEsYUFBQSxLQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQSxPQUFBLFFBQUEsUUFBQSxLQUFBLFFBQUE7QUFDQSxTQUhBO0FBSUEsS0FMQTtBQU1BLFdBQUEsWUFBQSxHQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0EsZUFBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLENBQUEsYUFBQSxFQUFBLE9BQUEsSUFBQSxDQUFBLEtBQ0E7QUFDQSxvQkFBQSxNQUFBLGNBQUEsTUFBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsUUFBQSxLQUFBO0FBQ0EsdUJBQUEsUUFBQSxLQUFB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QSxXQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSxpREFGQTtBQUdBLGVBQUE7QUFDQSxrQkFBQSxHQURBO0FBRUEscUJBQUE7QUFGQSxTQUhBO0FBT0EsY0FBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esa0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsNEJBQUEsY0FBQSxDQUFBLEVBQUEsT0FBQSxLQUFBLEVBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdDQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUZBLEVBRUEsS0FGQSxDQUVBLFlBQUE7QUFDQSxnQ0FBQSxLQUFBLENBQUEsNEJBQUEsRUFBQSxJQUFBO0FBQ0EsaUJBSkE7QUFLQSxhQU5BO0FBT0Esa0JBQUEsVUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGdDQUFBLEtBQUEsQ0FBQSx5QkFBQSxFQUFBLElBQUE7QUFDQSxpQkFGQSxFQUVBLEtBRkEsQ0FFQSxZQUFBO0FBQ0EsZ0NBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLGlCQUpBO0FBS0EsYUFOQTtBQU9BO0FBdEJBLEtBQUE7QUF3QkEsQ0F6QkEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcblxud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVpVmlld1Njcm9sbFByb3ZpZGVyLHN0cmlwZVByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG4gICAgJHVpVmlld1Njcm9sbFByb3ZpZGVyLnVzZUFuY2hvclNjcm9sbCgpO1xuXG4gICAgLy8gc3RyaXBlUHJvdmlkZXIuc2V0UHVibGlzaGFibGVLZXkoJ215X2tleScpO1xuXG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJcbmFwcC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBhbGxVc2VyT3JkZXJzLCAkbG9nLCBhbGxQcm9kdWN0cywgYWxsVXNlcnMsIGFsbE9yZGVyRGV0YWlscywgTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnByb2R1Y3RzID0gYWxsUHJvZHVjdHM7XG4gICAgJHNjb3BlLnVzZXJzID0gYWxsVXNlcnM7XG4gICAgJHNjb3BlLnVzZXJPcmRlcnMgPSBhbGxVc2VyT3JkZXJzO1xuXG4gICAgLy9hZGRpbmcgc3RhdHVzIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgIFx0XHRvcmRlckRldGFpbC5zdGF0dXMgPSBzdGF0dXM7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuXG4gICAgLy9hZGRpbmcgdXNlciBpbmZvIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnVzZXIgPSB1c2VyO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcbiAgICBhbGxPcmRlckRldGFpbHMgPSBhbGxPcmRlckRldGFpbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYS51c2VyT3JkZXJJZCAtIGIudXNlck9yZGVySWQ7XG4gICAgfSk7XG4gICAgYWxsT3JkZXJEZXRhaWxzID0gXy5ncm91cEJ5KGFsbE9yZGVyRGV0YWlscywgJ3VzZXJPcmRlcklkJylcbiAgICAkc2NvcGUub3JkZXJzID0gJC5tYXAoYWxsT3JkZXJEZXRhaWxzLGZ1bmN0aW9uIChvcmRlciwgaSkge1xuICAgICAgICBpZiAoaSkgcmV0dXJuIFtvcmRlcl07XG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygkc2NvcGUub3JkZXJzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhZG1pbicsIHtcbiAgICAgICAgdXJsOiAnL2FkbWluJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hZG1pbi9hZG1pbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FkbWluQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsbFByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyczogZnVuY3Rpb24gKFVzZXJGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmZldGNoQWxsKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxPcmRlckRldGFpbHM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlck9yZGVyczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufSlcbiIsIiBhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRsb2csIGNhcnRDb250ZW50LCBDYXJ0RmFjdG9yeSl7XG4gXHQkc2NvcGUuY2FydENvbnRlbnQ9Y2FydENvbnRlbnQ7XG5cbiBcdCRzY29wZS5yZW1vdmU9IGZ1bmN0aW9uKG9yZGVySWQpIHtcbiBcdFx0Q2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQob3JkZXJJZClcbiBcdFx0LnRoZW4oZnVuY3Rpb24obmV3Q2FydCl7XG4gXHRcdFx0JHNjb3BlLmNhcnRDb250ZW50ID0gbmV3Q2FydDtcbiBcdFx0fSkuY2F0Y2goJGxvZylcbiBcdH1cblxuIFx0JHNjb3BlLmNoYW5nZVF1YW50aXR5PSBmdW5jdGlvbiAoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eShjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KTtcbiAgICAgICAgJHNjb3BlLmNhcnRDb250ZW50ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICB9O1xuXG4gICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG4gICRzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0b3RhbCA9IDA7XG4gICAgY2FydENvbnRlbnQuZm9yRWFjaChjYXJ0ID0+IHRvdGFsICs9IChjYXJ0LnByaWNlICogY2FydC5xdWFudGl0eSkpXG5cbiAgICByZXR1cm4gdG90YWw7XG4gIH1cbiB9KVxuXG4iLCIgYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gXHQkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiBcdFx0dXJsOicvY2FydCcsXG4gXHRcdHRlbXBsYXRlVXJsOidqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gXHRcdGNvbnRyb2xsZXI6J0NhcnRDdHJsJyxcbiBcdFx0cmVzb2x2ZTp7XG4gXHRcdFx0Y2FydENvbnRlbnQ6ZnVuY3Rpb24oQ2FydEZhY3Rvcnkpe1xuXG4gXHRcdFx0XHRyZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpO1xuXG4gXHRcdFx0fVxuIFx0XHR9XG4gXHR9KVxuIH0pXG5cbiIsImFwcC5jb250cm9sbGVyKCdDaGVja291dEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGl0ZW1zKVxuICAgICAgICAkc2NvcGUuaXRlbXMgPSBpdGVtcztcblxuICBcdFx0XHQvL2NhbGN1bGF0aW5nIHRvdGFsIHByaWNlIGFuZCBwdXQgdGhhdCBpbnRvICRzY29wZS50b3RhbFxuICAgICAgICB2YXIgaXRlbXNBcnIgPSBpdGVtcztcbiAgICAgICAgdmFyIHRvdGFsUHJpY2VFYWNoID0gW107XG4gICAgICAgIGl0ZW1zQXJyLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgIFx0dG90YWxQcmljZUVhY2gucHVzaChlbGVtZW50LnByaWNlICogZWxlbWVudC5xdWFudGl0eSk7XG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS50b3RhbCA9IHRvdGFsUHJpY2VFYWNoLnJlZHVjZSggKHByZXYsIGN1cnIpID0+IHByZXYgKyBjdXJyICk7XG4gICAgfSlcblxuICAgICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2hlY2tvdXQnLCB7XG4gICAgICAgIHVybDogJy9jaGVja291dCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY2hlY2tvdXQvY2hlY2tvdXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDaGVja291dEN0cmwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc0FkbWluID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VyLmlzQWRtaW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3JpZXNDdHJsJywgZnVuY3Rpb24gKCRsb2csICRzY29wZSwgT3JkZXJIaXN0b3JpZXNGYWN0b3J5KSB7XG5cbiAgICBPcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyT3JkZXJzQXJyKSB7XG5cbiAgICAgICAgdXNlck9yZGVyc0Fyci5wYWlkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihhcnIsIGkpe1xuICAgICAgICAgICAgYXJyLmRhdGUgPSBuZXcgRGF0ZSh1c2VyT3JkZXJzQXJyLmRhdGVbaV0pLnRvU3RyaW5nKCk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICAkc2NvcGUudXNlck9yZGVycyA9IHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zO1xuICAgIH0pXG4gICAgLmNhdGNoKCRsb2cpO1xuICAgIFxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ29yZGVySGlzdG9yaWVzJywge1xuICAgICAgICB1cmw6ICcvaGlzdG9yaWVzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9oaXN0b3J5L29yZGVySGlzdG9yaWVzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3JpZXNDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdhbmltYXRpb24nLCBmdW5jdGlvbiAoJHN0YXRlKSB7XG4gICAgdmFyIGFuaW1hdGlvbkVuZEV2ZW50cyA9ICd3ZWJraXRBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBtc0FuaW1hdGlvbkVuZCBhbmltYXRpb25lbmQnO1xuICAgIHZhciBjcmVhdGVDaGFyYWN0ZXJzID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAgICAgICAgYXNoOiBbXG4gICAgICAgICAgICAgICAgJ2FzaCcsXG4gICAgICAgICAgICAgICAgJ2FzaC1ncmVlbi1iYWcnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG90aGVyczogW1xuICAgICAgICAgICAgICAgICdqYW1lcycsXG4gICAgICAgICAgICAgICAgJ2Nhc3NpZHknLFxuICAgICAgICAgICAgICAgICdqZXNzaWUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WSAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCggTWF0aC5yYW5kb20oKSAqIDMgKSArIDI5KS50b0ZpeGVkKDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WiAoeSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDIwIC0geSkgKiAxMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmFuZG9tQ2hhcmFjdGVycyAod2hvKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyc1t3aG9dWyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogY2hhcmFjdGVyc1t3aG9dLmxlbmd0aCApIF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYWtlQ2hhcmFjdGVyICh3aG8pIHtcblxuICAgICAgICAgICAgdmFyIHhEZWxheSA9ICggd2hvID09PSAnYXNoJyApID8gNCA6IDQuODtcbiAgICAgICAgICAgIHZhciBkZWxheSA9ICctd2Via2l0LWFuaW1hdGlvbi1kZWxheTogJyArICggTWF0aC5yYW5kb20oKSAqIDIuNyArIHhEZWxheSApLnRvRml4ZWQoMykgKyAnczsnO1xuICAgICAgICAgICAgdmFyIGNoYXJhY3RlciA9IHJhbmRvbUNoYXJhY3RlcnMoIHdobyApO1xuICAgICAgICAgICAgdmFyIGJvdHRvbSA9IGdldFkoKTtcbiAgICAgICAgICAgIHZhciB5ID0gJ2JvdHRvbTogJysgYm90dG9tICsnJTsnO1xuICAgICAgICAgICAgdmFyIHogPSAnei1pbmRleDogJysgZ2V0WiggYm90dG9tICkgKyAnOyc7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBcInN0eWxlPSdcIitkZWxheStcIiBcIit5K1wiIFwiK3orXCInXCI7XG5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICtcbiAgICAgICAgICAgICAgICBcIjxpIGNsYXNzPSdcIiArIGNoYXJhY3RlciArIFwiIG9wZW5pbmctc2NlbmUnIFwiKyBzdHlsZSArIFwiPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8aSBjbGFzcz1cIiArIGNoYXJhY3RlciArIFwiLXJpZ2h0IFwiICsgXCJzdHlsZT0nXCIrIGRlbGF5ICsgXCInPjwvaT5cIiArXG4gICAgICAgICAgICAgICAgXCI8L2k+XCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXNoID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDE2ICkgKyAxNjtcbiAgICAgICAgdmFyIG90aGVycyA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiA4ICkgKyA4O1xuXG4gICAgICAgIHZhciBob3JkZSA9ICcnO1xuXG4gICAgICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGFzaDsgaSsrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ2FzaCcgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoIHZhciBqID0gMDsgaiA8IG90aGVyczsgaisrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ290aGVycycgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdodW1hbnMnKS5pbm5lckhUTUwgPSBob3JkZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicnVubmluZy1hbmltYXRpb25cIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUgb3BlbmluZy1zY2VuZVwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUtcmlnaHRcIj48L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJxdW90ZSBleGNsYW1hdGlvblwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzwvaT4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiaHVtYW5zXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICBjb21waWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbWFpbicpLmFkZENsYXNzKCdoZXJlJylcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQ2hhcmFjdGVycygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcG9zdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICQoJy5vcGVuaW5nLXNjZW5lJykuYWRkQ2xhc3MoJ21vdmUnKVxuICAgICAgICAgICAgICAgICAgICAkKCcubW92ZScpLm9uKGFuaW1hdGlvbkVuZEV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY29wZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVzZXQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0L3Bhc3N3b3JkLzp0b2tlbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcGFzc3dvcmQucmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBBdXRoRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAkc2NvcGUudG9rZW4gPSAkc3RhdGVQYXJhbXMudG9rZW47XG5cbiAgICAkc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoZW1haWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0NoZWNrIHlvdXIgZW1haWwnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBwYXNzd29yZCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkKHBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ1BheW1lbnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLFVzZXJGYWN0b3J5LCAkbG9nLCBDYXJ0RmFjdG9yeSwgdG90YWxDb3N0LCBhcnJheU9mSXRlbXMpe1xuICAkc2NvcGUuaW5mbyA9IHt9O1xuICBcbiAgJHNjb3BlLnZhbGlkYXRlVXNlcj0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50KCRzY29wZS5pbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuc2hvd0NDID0gdHJ1ZTtcbiAgICAgICAgfSkuY2F0Y2goJGxvZy5lcnJvcilcbiAgICAgICAgXG4gIH1cbiAgJHNjb3BlLnRvdGFsQ29zdCA9IHRvdGFsQ29zdDtcbiAgJHNjb3BlLmFycmF5T2ZJdGVtcyA9IGFycmF5T2ZJdGVtcztcbiAgJHNjb3BlLnN0cmluZ09mSXRlbXMgPSBhcnJheU9mSXRlbXMubWFwKGl0ZW0gPT4gaXRlbS50aXRsZSkuam9pbignLCcpXG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3BheW1lbnQnLCB7XG4gICAgICAgIHVybDogJy9wYXltZW50JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wYXltZW50L3BheW1lbnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1BheW1lbnRDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIHRvdGFsQ29zdDogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCgpIH0sXG4gICAgICAgICAgYXJyYXlPZkl0ZW1zOiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgdGhlUHJvZHVjdCwgYWxsUmV2aWV3cywgUHJvZHVjdEZhY3RvcnksIENhcnRGYWN0b3J5KSB7XG4gICAgLy8gcHJvZHVjdFxuICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAkc2NvcGUucHJvZHVjdCA9IHRoZVByb2R1Y3Q7XG4gICAgJHNjb3BlLnJldmlld3MgPSBhbGxSZXZpZXdzO1xuICAgIC8vIHJldmlld1xuICAgICRzY29wZS5tb2RhbE9wZW4gPSBmYWxzZTtcbiAgICAkc2NvcGUuc3VibWl0UmV2aWV3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubmV3UmV2aWV3LnByb2R1Y3RJZCA9ICRzY29wZS5wcm9kdWN0LmlkO1xuICAgICAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5uZXdSZXZpZXcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnJldmlld3MgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEnLCAxMDAwKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1NvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBhZGQgdG8gY2FydFxuICAgICRzY29wZS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCgkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLnF1YW50aXR5KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEgWW91ciBpdGVtIHdhcyBhZGRlZCB0byB5b3VyIGNhcnQhJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUuYXJyYXlNYWtlciA9IGZ1bmN0aW9uIChudW0pe1xuICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9bnVtOyBpICsrKXtcbiAgICAgICAgICAgIGFyci5wdXNoKGkpXG4gICAgICAgIH0gIFxuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH1cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbiAgYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoRmFjdG9yeSwgJHN0YXRlKSB7XG4gICAgJHNjb3BlLnNpZ251cCA9IHt9OyBcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LnNpZ251cChzaWdudXBJbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gJ2VtYWlsIGV4aXN0cyBhbHJlYWR5Jykge1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVc2VyIGFscmVhZHkgZXhpc3RzJywgMjAwMCk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UgPT09ICdub3QgYSB2YWxpZCBlbWFpbCcpe1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdJdCBpcyBub3QgYSB2YWxpZCBlbWFpbCcsIDIwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbiAgICAkc2NvcGUuZ29vZ2xlU2lnbnVwID0gQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwO1xufSk7XG4iLCJhcHAuY29udHJvbGxlcignU3RvcmVDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgcHJvZHVjdHMpIHtcbiAgICAkc2NvcGUucHJvZHVjdHMgPSBwcm9kdWN0cztcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdG9yZScsIHtcbiAgICAgICAgdXJsOiAnL3N0b3JlJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zdG9yZS9zdG9yZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0b3JlQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT3JkZXJIaXN0b3JpZXNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkQ2FydCA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL3BhaWQvJ1xuICAgIHZhciBvcmRlckhpc3Rvcmllc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZENhcnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuIFxuXG4gICAgcmV0dXJuIG9yZGVySGlzdG9yaWVzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdIZWxsbywgd29ybGQhJyxcbiAgICAgICAgJ0F0IGxvbmcgbGFzdCwgSSBsaXZlIScsXG4gICAgICAgICdIZWxsbywgc2ltcGxlIGh1bWFuLicsXG4gICAgICAgICdXaGF0IGEgYmVhdXRpZnVsIGRheSEnLFxuICAgICAgICAnSVxcJ20gbGlrZSBhbnkgb3RoZXIgcHJvamVjdCwgZXhjZXB0IHRoYXQgSSBhbSB5b3Vycy4gOiknLFxuICAgICAgICAnVGhpcyBlbXB0eSBzdHJpbmcgaXMgZm9yIExpbmRzYXkgTGV2aW5lLicsXG4gICAgICAgICfjgZPjgpPjgavjgaHjga/jgIHjg6bjg7zjgrbjg7zmp5jjgIInLFxuICAgICAgICAnV2VsY29tZS4gVG8uIFdFQlNJVEUuJyxcbiAgICAgICAgJzpEJyxcbiAgICAgICAgJ1llcywgSSB0aGluayB3ZVxcJ3ZlIG1ldCBiZWZvcmUuJyxcbiAgICAgICAgJ0dpbW1lIDMgbWlucy4uLiBJIGp1c3QgZ3JhYmJlZCB0aGlzIHJlYWxseSBkb3BlIGZyaXR0YXRhJyxcbiAgICAgICAgJ0lmIENvb3BlciBjb3VsZCBvZmZlciBvbmx5IG9uZSBwaWVjZSBvZiBhZHZpY2UsIGl0IHdvdWxkIGJlIHRvIG5ldlNRVUlSUkVMIScsXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnQXV0aEZhY3RvcnknLCAgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICB2YXIgQXV0aEZhY3RvcnkgPSB7fTtcblxuXG4gICAgQXV0aEZhY3Rvcnkuc2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKS50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXV0aC9nb29nbGUnKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBsb2dpbikge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3Jlc2V0L3Bhc3N3b3JkLycgKyB0b2tlbiwgbG9naW4pO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvZm9yZ290JywgZW1haWwpO1xuICAgIH1cblxuICAgIHJldHVybiBBdXRoRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0NhcnRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwLCAkbG9nLCAkc3RhdGUsICRyb290U2NvcGUpIHtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL2NhcnQvJztcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGl0ZW0uaW1hZ2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nICsgaXRlbS5wcm9kdWN0SWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHZhciBDYXJ0RmFjdG9yeSA9IHt9O1xuICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBbXTtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNvcnQoZnVuY3Rpb24gKGEsYil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuaWQgLSBhLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgndXBkYXRlQ2FydCcsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5kZWxldGVJdGVtID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgcHJvZHVjdElkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSB0aGlzLmNhY2hlZENhcnQuZmlsdGVyKGl0ZW0gPT4gaXRlbS5wcm9kdWN0SWQgPT09IHByb2R1Y3RJZCk7XG4gICAgICAgIHJldHVybiAoZHVwbGljYXRlLmxlbmd0aCkgPyBkdXBsaWNhdGVbMF0gOiBudWxsO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICBcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyhwcm9kdWN0SWQpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnlcbiAgICAgICAgICAgIC5jaGFuZ2VRdWFudGl0eShkdXBsaWNhdGUuaWQsIGR1cGxpY2F0ZS5xdWFudGl0eSwgJ2FkZCcsIHF1YW50aXR5ICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyBwcm9kdWN0SWQsIHtxdWFudGl0eTogcXVhbnRpdHl9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQ9ZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrb3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlKG9yZGVySWQpXG4gICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eT1mdW5jdGlvbihvcmRlcklkLCBxdWFudGl0eSwgYWRkT3JTdWJ0ciwgYW1vdW50ID0gMSl7XG4gICAgICAgIHZhciBydW5GdW5jPWZhbHNlO1xuICAgICAgICBpZiAoYWRkT3JTdWJ0cj09PSdhZGQnKSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHF1YW50aXR5Kz0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRPclN1YnRyPT09J3N1YnRyYWN0JyAmJiBxdWFudGl0eT4xKSB7XG4gICAgICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgICAgIHF1YW50aXR5LT0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVuRnVuYz09PXRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIG9yZGVySWQsIHtxdWFudGl0eTpxdWFudGl0eX0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkob3JkZXJJZCxxdWFudGl0eSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlID0gZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyLGkpe1xuICAgICAgICAgICAgaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSBpbmRleCA9IGk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5ID0gZnVuY3Rpb24gKG9yZGVySWQscXVhbnRpdHkpIHtcbiAgICAgICAgdmFyIGkgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZpbmRJbmRleChmdW5jdGlvbihvcmRlcil7XG4gICAgICAgICAgICAvLyBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIHtcbiAgICAgICAgICAgIC8vICAgICBvcmRlci5xdWFudGl0eSA9IHF1YW50aXR5O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgcmV0dXJuIG9yZGVyLmlkID09PSBvcmRlcklkO1xuICAgICAgICB9KTtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydFtpXS5xdWFudGl0eSA9IHF1YW50aXR5XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnb3JkZXJIaXN0b3JpZXMnKTtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKDAsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQubGVuZ3RoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjYXJ0KXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjYXJ0KVxuICAgICAgICAgICAgICAgIGNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlKml0ZW0ucXVhbnRpdHkpIClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG90YScsIHRvdGFsKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goJGxvZy5lcnJvcilcbiAgICB9XG5cblxuICAgIHZhciBhbmltYXRpb25FbmQgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG1vekFuaW1hdGlvbkVuZCBNU0FuaW1hdGlvbkVuZCBvYW5pbWF0aW9uZW5kIGFuaW1hdGlvbmVuZCc7XG5cbiAgICBmdW5jdGlvbiBhZGRTdWNjZXNzQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gYWRkUmVtb3ZlQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJykub25lKGFuaW1hdGlvbkVuZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NhcnQtaWNvbicpLnJlbW92ZUNsYXNzKCdhbmltYXRlZCBzaGFrZScpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBDYXJ0RmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTWFuYWdlT3JkZXJzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZE9yZGVyRGV0YWlscyA9IFtdO1xuICAgIHZhciBjYWNoZWRVc2VyT3JkZXJzID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9tYW5hZ2VPcmRlcnMvJ1xuICAgIHZhciBtYW5hZ2VPcmRlcnNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZE9yZGVyRGV0YWlscylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRPcmRlckRldGFpbHM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyT3JkZXInKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkVXNlck9yZGVycylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VyT3JkZXJzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXIvJyArIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24odXNlck9yZGVySWQsIGRhdGEpe1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQsIGRhdGEpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXJPcmRlcil7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIlVwZGF0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVyc1t1cGRhdGVkSW5kXSA9IHVzZXJPcmRlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlcjtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAodXNlck9yZGVySWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KFwiRGVsZXRlZFwiLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlck9yZGVycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXJPcmRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2VyT3JkZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hbmFnZU9yZGVyc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cblxuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvcHJvZHVjdHMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgcGFyc2VUaW1lU3RyID0gZnVuY3Rpb24gKHJldmlldykge1xuICAgICAgICB2YXIgZGF0ZSA9IHJldmlldy5jcmVhdGVkQXQuc3Vic3RyKDAsIDEwKTtcbiAgICAgICAgcmV2aWV3LmRhdGUgPSBkYXRlO1xuICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgIH1cblxuICAgIHZhciBQcm9kdWN0RmFjdG9yeSA9IHt9O1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzID0gW107XG4gICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyA9IFtdO1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCkudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMubWFwKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShwcm9kdWN0cywgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VwZGF0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5maW5kSW5kZXgoZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzW3VwZGF0ZWRJbmRdID0gcHJvZHVjdDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RlbGV0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQgPSBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICBwcm9kdWN0LmltYWdlVXJsID0gYmFzZVVybCArIHByb2R1Y3QuaWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkLCBkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldmlldyA9IHBhcnNlVGltZVN0cihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLnB1c2gocmV2aWV3KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbFJldmlld3MgPSBmdW5jdGlvbiAocHJvZHVjdElkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MpO1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLm1hcChwYXJzZVRpbWVTdHIpO1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvZHVjdEZhY3Rvcnk7XG5cbn0pXG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcbiAgICB2YXIgVXNlckZhY3RvcnkgPSB7fTtcblxuICAgIHZhciBjYWNoZWRVc2VycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvdXNlcnMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIFVzZXJGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHVzZXJzLCBjYWNoZWRVc2Vycyk7IC8vIHdoeSBhbmd1bGFyIGNvcHkgYWx0ZXJzIGFycmF5IG9yZGVyISEhISEhIVxuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vycy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VycztcbiAgICAgICAgICAgICAgICB9KVxuICAgIH07XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQgPSBmdW5jdGlvbiAoaW5mb09iail7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgaWYodXNlci5pZCA9PT0gJ3Nlc3Npb24nKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlU2Vzc2lvbkNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyKHVzZXIuaWQsaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVVzZXJDYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Nob3AnLCBzdGF0ZTogJ3N0b3JlJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVMb2dvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjk3cHggLTMwNnB4JylcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51bnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjkzcHggLTlweCcpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldEFkbWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEF1dGhJbnRlcmNlcHRvcik7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5hZG1pbiA9IEF1dGhTZXJ2aWNlLmlzQWRtaW4odXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG4gICAgICAgICAgICBzZXRBZG1pbigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzaG9wcGluZ0NhcnQnLCBmdW5jdGlvbihDYXJ0RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBhY3RpdmU6ICc9JyxcbiAgICAgICAgICAgIGFkZEFuZFJldmVhbENhcmQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICAvLyBzY29wZTogeyBzZXRGbjogJyYnIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ3VwZGF0ZUNhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gY2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzY29wZS5yZXZlYWxDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0IGNoZWNrb3V0LS1hY3RpdmUnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmhpZGVDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmFjdGl2ZSA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICAgICAgICAgIGlmKHNjb3BlLmNhcnQpXG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UgKiBpdGVtLnF1YW50aXR5KSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgLy8gc2NvcGUuc2V0Rm4oe3RoZURpckZuOiBzY29wZS51cGRhdGVNYXB9KTtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ29hdXRoQnV0dG9uJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBwcm92aWRlck5hbWU6ICdAJ1xuICAgIH0sXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJy9qcy9jb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmh0bWwnXG4gIH1cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJFbnRyeScsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIG9yZGVyRGV0YWlsczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzLCBlLCBhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzLm9yZGVyRGV0YWlscyk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yeUN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuXHRcbn0pIiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJIaXN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgaGlzdG9yaWVzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yeUN0cmwnXG4gICAgfVxufSlcbiIsIiAvLyBhcHAuY29udHJvbGxlcignU2VhcmNoQmFyQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG4gLy8gXHQkc2NvcGUucHJvZHVjdD1cbiAvLyB9KSIsImFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKCl7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6J0UnLFxuXHRcdHRlbXBsYXRlVXJsOidqcy9jb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjonUHJvZHVjdENhcmRDdHJsJ1xuXHR9XG59KVxuXG4iLCIvLyBhcHAuZGlyZWN0aXZlKCdzdGFyUmF0aW5nJywgZnVuY3Rpb24gKCkge1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICByZXN0cmljdDogJ0VBJyxcbi8vICAgICAgIHRlbXBsYXRlOlxuLy8gICAgICAgICAnPHNwYW4gY2xhc3M9XCJzdGFyc1wiPicgK1xuLy8gICAgICAgICAgJzxkaXYgY2xhc3M9XCJzdGFycy1maWxsZWQgbGVmdFwiPicgK1xuLy8gICAgICAgICAgICAgJzxzcGFuPuKYhTwvc3Bhbj4nICtcbi8vICAgICAgICAgICc8L2Rpdj4nICtcbi8vICAgICAgICc8L3NwYW4+J1xuLy8gICAgIH07XG4vLyB9KVxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlck9yZGVyJywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXJPcmRlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3Byb2R1Y3RFbnRyeScsIGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdDogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc3VibWl0VXBkYXRlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdChpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdChpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiXG5hcHAuZGlyZWN0aXZlKCdjbGlja0FueXdoZXJlQnV0SGVyZScsIGZ1bmN0aW9uKCRkb2N1bWVudCl7XG4gIHJldHVybiB7XG4gICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICBjbGlja0FueXdoZXJlQnV0SGVyZTogJyYnXG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWwsIGF0dHIpIHtcblxuICAgICAgICAgICAgICAgJCgnLmxvZ28nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICRkb2N1bWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldC5pZCAhPT0gJ2NhcnQtaWNvbicgJiYgZS50YXJnZXQuaWQgIT09ICdhZGQtdG8tY2FydC1idXR0b24nKSB7XG4gICAgICAgICAgICAgICAgICAgaWYgKGVsICE9PSBlLnRhcmdldCAmJiAhZWxbMF0uY29udGFpbnMoZS50YXJnZXQpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsKHNjb3BlLmNsaWNrQW55d2hlcmVCdXRIZXJlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICB9XG4gICAgICAgIH1cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgndXNlckVudHJ5JywgZnVuY3Rpb24gKFVzZXJGYWN0b3J5LCBBdXRoRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCh7ZW1haWw6IGVtYWlsfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEb25lJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlcih1c2VySWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRXJhc2UgZnJvbSBwbGFuZXQgRWFydGgnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
