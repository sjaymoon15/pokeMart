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
            // console.log(data.user);
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
            console.log(loginInfo);
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

app.controller('ProfileCtrl', function ($scope, $stateParams, UserFactory, $state) {
    UserFactory.fetchOne().then(function (user) {
        $scope.user = user;
        console.log('helloo', user.id);
    });

    $scope.user = {};

    $scope.saveUserInfo = function () {
        return UserFactory.updateUserBeforePayment($scope.user);
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('profile', {
        url: '/user',
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

//the same as below but not working WTF!

// app.factory('UserFactory', function ($http) {
//     var UserFactory = {};

//     var cachedUsers = [];
//     var baseUrl = '/api/users/';
//     var getData = res => res.data;

//     UserFactory.fetchAll = function () {
//         return $http.get(baseUrl).then(getData)
//                 .then(function (users) {
//                     angular.copy(users, cachedUsers); 
//                     cachedUsers.sort(function (a, b) {
//                         return a.id - b.id;
//                     })
//                     return cachedUsers;
//                 })
//     };


//   UserFactory.fetchOne = function() {
//     return $http.get(baseUrl + 'getLoggedInUserId')
//             .then(getData)
//   };


//     UserFactory.updateUser = function (id, data) {
//         return $http.get(baseUrl + id, data)
//                 .then(getData)
//                 .then(function (user) {
//                     var updatedInd = cachedUsers.findIndex(function (user) {
//                         return user.id === id;
//                     });
//                     cachedUsers[updatedInd] = user;
//                     return user;
//                 })
//     }  

//     UserFactory.deleteUser = function (id) {
//         return $http.delete(baseUrl + id).success(function() {
//             var deletedInd = cachedUsers.findIndex(function (user) {
//                 return user.id === id;
//             });
//             cachedUsers.splice(deletedInd, 1);
//         });
//     }

//     UserFactory.updateUserBeforePayment = function (infoObj){
//         return $http.get(baseUrl + 'getLoggedInUserId')
//             .then(getData)
//             .then(function(user){
//                 if(user.id === 'session'){
//                 return $http.put('api/orders/cart/updateSessionCart', infoObj)
//                 }
//                 else{
//                 return UserFactory.updateUser(user.id,infoObj)
//                     .then(function () {
//                         return $http.put('api/orders/cart/updateUserCart', infoObj)
//                     })
//                 }
//             })
//     }


//     return UserFactory;
// })

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
    UserFactory.fetchOne = function () {
        return $http.get(baseUrl + 'getLoggedInUserId').then(getData);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuY29udHJvbGxlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvZmJsaWtlc2hhcmUuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvcGludHJlc3QuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvdHdpdHRlci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvdHdpdHRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9jYXJ0LXJldmVhbC9jYXJ0LXJldmVhbC5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yZXZpZXctZW50cnkvc3Rhci1yYXRpbmcuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91dGlsaXR5L2NsaWNrQW55d2hlcmVCdXRIZXJlLmRpcmVjdGl2ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxRQUFBLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBNkJBLGVBQUEsYUFBQSxHQUFBLGlCQUFBO0FBQ0EsQ0F2Q0E7O0FDcEJBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsUUFEQTtBQUVBLG9CQUFBLGlCQUZBO0FBR0EscUJBQUE7QUFIQSxLQUFBO0FBTUEsQ0FUQTs7QUFXQSxJQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTs7QUFFQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEVBQUEsT0FBQSxDQUFBLGFBQUEsQ0FBQTtBQUVBLENBTEE7O0FDVkEsSUFBQSxVQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLFFBQUEsRUFBQSxlQUFBLEVBQUEsbUJBQUEsRUFBQTs7QUFFQSxXQUFBLFFBQUEsR0FBQSxXQUFBO0FBQ0EsV0FBQSxLQUFBLEdBQUEsUUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLGFBQUE7O0FBRUE7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBO0FBQ0Esd0JBQUEsTUFBQSxHQUFBLE1BQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7O0FBT0E7QUFDQSxvQkFBQSxPQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSw0QkFBQSxRQUFBLENBQUEsWUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsSUFBQSxFQUFBO0FBQ0Esd0JBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxTQUhBLEVBR0EsS0FIQSxDQUdBLEtBQUEsS0FIQTtBQUlBLEtBTEE7QUFNQSxzQkFBQSxnQkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLFdBQUEsR0FBQSxFQUFBLFdBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxzQkFBQSxFQUFBLE9BQUEsQ0FBQSxlQUFBLEVBQUEsYUFBQSxDQUFBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsRUFBQSxHQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsQ0FBQSxFQUFBLE9BQUEsQ0FBQSxLQUFBLENBQUE7QUFDQSxLQUZBLENBQUE7QUFHQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLE1BQUE7QUFFQSxDQTlCQTs7QUNEQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUNBLEtBREEsQ0FDQSxPQURBLEVBQ0E7QUFDQSxhQUFBLFFBREE7QUFFQSxxQkFBQSxxQkFGQTtBQUdBLG9CQUFBLFdBSEE7QUFJQSxpQkFBQTtBQUNBLHlCQUFBLHFCQUFBLGNBQUEsRUFBQTtBQUNBLHVCQUFBLGVBQUEsUUFBQSxFQUFBO0FBQ0EsYUFIQTtBQUlBLHNCQUFBLGtCQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLFlBQUEsUUFBQSxFQUFBO0FBQ0EsYUFOQTtBQU9BLDZCQUFBLHlCQUFBLG1CQUFBLEVBQUE7QUFDQSx1QkFBQSxvQkFBQSxRQUFBLEVBQUE7QUFDQSxhQVRB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QSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLDBCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFVBQUE7QUFDQSxtQkFBQSxVQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFVQSxXQUFBLHFCQUFBO0FBRUEsQ0FuQkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsUUFBQSxjQUFBLEVBQUE7O0FBR0EsZ0JBQUEsTUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxjQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLHFCQUFBLEtBQUEsRUFBQSxLQUFBLENBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsU0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBQ0EsQ0F4QkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBOztBQUVBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLFVBQUEsbUJBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBLENBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxRQUFBLEdBQUEsbUJBQUEsS0FBQSxTQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTtBQUNBLEtBSEE7QUFJQSxRQUFBLGNBQUEsRUFBQTtBQUNBLGdCQUFBLFVBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLGdCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsU0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLEtBQUEsRUFBQTtBQUNBLHdCQUFBLFVBQUEsR0FBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLENBQUE7QUFDQSx1QkFBQSxLQUFBLENBQUEsWUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLFNBWEEsQ0FBQTtBQVlBLEtBYkE7O0FBZUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxnQkFBQSxrQkFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsWUFBQSxZQUFBLEtBQUEsVUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUFBLG1CQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUE7QUFBQSxTQUFBLENBQUE7QUFDQSxlQUFBLFVBQUEsTUFBQSxHQUFBLFVBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLFlBQUEsWUFBQSxrQkFBQSxDQUFBLFNBQUEsQ0FBQTtBQUNBLFlBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsWUFDQSxjQURBLENBQ0EsVUFBQSxFQURBLEVBQ0EsVUFBQSxRQURBLEVBQ0EsS0FEQSxFQUNBLFFBREEsQ0FBQTtBQUVBLFNBSEEsTUFHQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsVUFBQSxTQUFBLEVBQUEsRUFBQSxVQUFBLFFBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUNBLGFBTEEsQ0FBQTtBQU1BO0FBQ0E7QUFDQSxLQWhCQTs7QUFrQkEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0E7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsT0FBQSxFQUNBLE9BREEsQ0FDQSxZQUFBO0FBQ0Esd0JBQUEsdUJBQUEsQ0FBQSxPQUFBO0FBQ0EsU0FIQSxFQUlBLElBSkEsQ0FJQSxZQUFBO0FBQ0EsbUJBQUEsWUFBQSxVQUFBO0FBQ0EsU0FOQSxDQUFBO0FBT0EsS0FUQTtBQVVBLGdCQUFBLGNBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUEsVUFBQSxFQUFBO0FBQUEsWUFBQSxNQUFBLHlEQUFBLENBQUE7O0FBQ0EsWUFBQSxVQUFBLEtBQUE7QUFDQSxZQUFBLGVBQUEsS0FBQSxFQUFBO0FBQ0E7QUFDQSx3QkFBQSxDQUFBLE1BQUE7QUFDQSxzQkFBQSxJQUFBO0FBQ0EsU0FKQSxNQUtBLElBQUEsZUFBQSxVQUFBLElBQUEsV0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBLHdCQUFBLENBQUEsTUFBQTtBQUNBLHNCQUFBLElBQUE7QUFDQTtBQUNBLFlBQUEsWUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBO0FBQ0E7QUFEQSxhQUVBLElBRkEsQ0FFQSxZQUFBO0FBQ0EsNEJBQUEsMkJBQUEsQ0FBQSxPQUFBLEVBQUEsUUFBQTtBQUNBLGFBSkEsQ0FBQTtBQUtBO0FBR0EsS0FyQkE7O0FBdUJBLGdCQUFBLHVCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxZQUFBLEtBQUE7QUFDQSxvQkFBQSxVQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxTQUZBOztBQUlBLG9CQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUEsS0FBQSxFQUFBLENBQUE7QUFDQSxLQVBBOztBQVNBLGdCQUFBLDJCQUFBLEdBQUEsVUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxJQUFBLFlBQUEsVUFBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFBLE1BQUEsRUFBQSxLQUFBLE9BQUE7QUFDQSxTQUxBLENBQUE7QUFNQSxvQkFBQSxVQUFBLENBQUEsQ0FBQSxFQUFBLFFBQUEsR0FBQSxRQUFBO0FBQ0EsS0FSQTs7QUFVQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQ0EsSUFEQSxDQUNBLFlBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUEsZ0JBQUE7QUFDQSx3QkFBQSxVQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxZQUFBLFVBQUEsQ0FBQSxNQUFBO0FBQ0EsU0FKQSxFQUtBLEtBTEEsQ0FLQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLDRCQUFBLEVBQUEsSUFBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsZ0JBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLFFBQUEsQ0FBQTtBQUNBLGVBQUEsWUFBQSxnQkFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxJQUFBO0FBQ0EsaUJBQUEsT0FBQSxDQUFBO0FBQUEsdUJBQUEsU0FBQSxLQUFBLEtBQUEsR0FBQSxLQUFBLFFBQUE7QUFBQSxhQUFBO0FBQ0Esb0JBQUEsR0FBQSxDQUFBLE1BQUEsRUFBQSxLQUFBO0FBQ0EsbUJBQUEsS0FBQTtBQUNBLFNBTkEsRUFPQSxLQVBBLENBT0EsS0FBQSxLQVBBLENBQUE7QUFRQSxLQVZBOztBQWFBLFFBQUEsZUFBQSw4RUFBQTs7QUFFQSxhQUFBLG1CQUFBLEdBQUE7QUFDQSxVQUFBLFlBQUEsRUFBQSxRQUFBLENBQUEscUJBQUEsRUFBQSxHQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFDQSxjQUFBLFlBQUEsRUFBQSxXQUFBLENBQUEscUJBQUE7QUFDQSxTQUZBO0FBR0E7O0FBSUEsYUFBQSxrQkFBQSxHQUFBO0FBQ0EsVUFBQSxZQUFBLEVBQUEsUUFBQSxDQUFBLGdCQUFBLEVBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxZQUFBO0FBQ0EsY0FBQSxZQUFBLEVBQUEsV0FBQSxDQUFBLGdCQUFBO0FBQ0EsU0FGQTtBQUdBOztBQUVBLGdCQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsV0FBQSxXQUFBO0FBRUEsQ0EzSkE7O0FDQUEsSUFBQSxPQUFBLENBQUEscUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTs7QUFFQSxRQUFBLHFCQUFBLEVBQUE7QUFDQSxRQUFBLG1CQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsb0JBQUE7QUFDQSxRQUFBLHNCQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLHdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGtCQUFBO0FBQ0EsbUJBQUEsa0JBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLHdCQUFBLGtCQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGdCQUFBO0FBQ0EsbUJBQUEsZ0JBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLHdCQUFBLFVBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLENBQUE7QUFFQSxLQUhBOztBQUtBLHdCQUFBLFFBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxPQUFBLEdBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLENBQUE7QUFFQSxLQUhBOztBQUtBLHdCQUFBLFlBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsVUFBQSxTQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGlCQUFBLFNBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHVCQUFBLFVBQUEsRUFBQSxLQUFBLFdBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSw2QkFBQSxVQUFBLElBQUEsU0FBQTtBQUNBLG1CQUFBLFNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBO0FBWUEsd0JBQUEsZUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsT0FEQSxDQUNBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGlCQUFBLFNBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHVCQUFBLFVBQUEsRUFBQSxLQUFBLFdBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSw2QkFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBOztBQVdBLFdBQUEsbUJBQUE7QUFFQSxDQTNEQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBOztBQUdBLFFBQUEsVUFBQSxnQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLGVBQUEsU0FBQSxZQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxPQUFBLE9BQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEdBQUEsSUFBQTtBQUNBLGVBQUEsTUFBQTtBQUNBLEtBSkE7O0FBTUEsUUFBQSxpQkFBQSxFQUFBO0FBQ0EsbUJBQUEsY0FBQSxHQUFBLEVBQUE7QUFDQSxtQkFBQSxhQUFBLEdBQUEsRUFBQTs7QUFFQSxtQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxHQUFBLENBQUEsZUFBQSxPQUFBLENBQUE7QUFDQSxTQUhBLEVBR0EsSUFIQSxDQUdBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxlQUFBLGNBQUEsRUFEQSxDQUNBO0FBQ0EsMkJBQUEsY0FBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsZUFBQSxjQUFBO0FBQ0EsU0FUQSxDQUFBO0FBVUEsS0FYQTs7QUFhQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLEVBR0EsSUFIQSxDQUdBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLFVBQUEsSUFBQSxPQUFBO0FBQ0EsbUJBQUEsT0FBQTtBQUNBLFNBVkEsQ0FBQTtBQVdBLEtBWkE7O0FBY0EsbUJBQUEsYUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxPQUFBLENBQUEsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsZUFBQSxjQUFBLENBQUEsU0FBQSxDQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDJCQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsVUFBQSxFQUFBLENBQUE7QUFDQSxTQU5BLENBQUE7QUFPQSxLQVJBOztBQVVBLG1CQUFBLFNBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsZUFBQSxPQUZBLENBQUE7QUFJQSxLQUxBOztBQU9BLG1CQUFBLE9BQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQSxHQUFBLFFBQUE7QUFDQSxlQUFBLE9BQUE7QUFDQSxLQUhBOztBQUtBLG1CQUFBLFlBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLGtCQUFBLFNBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsU0FBQSxhQUFBLFNBQUEsSUFBQSxDQUFBO0FBQ0EsMkJBQUEsYUFBQSxDQUFBLElBQUEsQ0FBQSxNQUFBO0FBQ0EsbUJBQUEsTUFBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsbUJBQUEsZUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxrQkFBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLGVBQUEsYUFBQTtBQUNBLG1CQUFBLGVBQUEsYUFBQSxDQUFBLEdBQUEsQ0FBQSxZQUFBLENBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLFdBQUEsY0FBQTtBQUVBLENBbkZBOztBQ0FBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBS0E7QUFDQTs7QUFFQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxRQUFBLGNBQUEsRUFBQTs7QUFFQSxRQUFBLGNBQUEsRUFBQTtBQUNBLFFBQUEsVUFBQSxhQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLElBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLEtBQUEsRUFBQSxXQUFBLEVBREEsQ0FDQTtBQUNBLHdCQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0EsbUJBQUEsV0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7QUFVQSxnQkFBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxtQkFBQSxFQUNBLElBREEsQ0FDQSxPQURBLENBQUE7QUFFQSxLQUhBOztBQUtBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FB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TkEsS0FBQTtBQVVBLENBWEE7O0FDQUEsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTs7QUFHQSxXQUFBLFVBQUEsR0FBQSxDQUNBLEVBQUEsTUFBQSxLQUFBLEVBREEsRUFFQSxFQUFBLE1BQUEsTUFBQSxFQUZBLEVBR0EsRUFBQSxNQUFBLE9BQUEsRUFIQSxFQUlBLEVBQUEsTUFBQSxPQUFBLEVBSkEsRUFLQSxFQUFBLE1BQUEsTUFBQSxFQUxBLEVBTUEsRUFBQSxNQUFBLFFBQUEsRUFOQSxFQU9BLEVBQUEsTUFBQSxTQUFBLEVBUEEsRUFRQSxFQUFBLE1BQUEsS0FBQSxFQVJBLEVBU0EsRUFBQSxNQUFBLFFBQUEsRUFUQSxFQVVBLEVBQUEsTUFBQSxLQUFBLEVBVkEsRUFXQSxFQUFBLE1BQUEsVUFBQSxFQVhBLEVBWUEsRUFBQSxNQUFBLFFBQUEsRUFaQSxFQWFBLEVBQUEsTUFBQSxPQUFBLEVBYkEsRUFjQSxFQUFBLE1BQUEsVUFBQSxFQWRBLEVBZUEsRUFBQSxNQUFBLE9BQUEsRUFmQSxFQWdCQSxFQUFBLE1BQUEsUUFBQSxFQWhCQSxDQUFBOztBQW1CQSxXQUFBLE1BQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxnQkFBQSxDQUFBLFFBQUEsSUFBQSxhQUFBLEtBQUEsRUFBQSxPQUFBLElBQUEsQ0FBQSxLQUNBLE9BQUEsUUFBQSxRQUFBLEtBQUEsUUFBQTtBQUNBLFNBSEE7QUFJQSxLQUxBO0FBTUEsV0FBQSxZQUFBLEdBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsQ0FBQSxhQUFBLEVBQUEsT0FBQSxJQUFBLENBQUEsS0FDQTtBQUNBLG9CQUFBLE1BQUEsY0FBQSxNQUFBO0FBQ0Esd0JBQUEsR0FBQSxDQUFBLFNBQUEsRUFBQSxRQUFBLEtBQUE7QUFDQSx1QkFBQSxRQUFBLEtBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxXQUFBLE1BQUEs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QSxRQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUNBLDhCQUFBLE1BQUEsQ0FBQSxZQUFBOztBQUVBLGtDQUFBLEtBQUEsQ0FBQSxNQUFBLG9CQUFBO0FBQ0EseUJBSEE7QUFJQTtBQUNBO0FBQ0EsYUFUQTtBQVdBO0FBeEJBLEtBQUE7QUEwQkEsQ0EzQkEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcblxud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2FuZ3VsaWtlJywgJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVpVmlld1Njcm9sbFByb3ZpZGVyLHN0cmlwZVByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG4gICAgJHVpVmlld1Njcm9sbFByb3ZpZGVyLnVzZUFuY2hvclNjcm9sbCgpO1xuXG4gICAgLy8gc3RyaXBlUHJvdmlkZXIuc2V0UHVibGlzaGFibGVLZXkoJ215X2tleScpO1xuXG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICAkcm9vdFNjb3BlLmZhY2Vib29rQXBwSWQgPSAnOTQxMDM4MjgyNjg2MjQyJztcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7IiwiXG5hcHAuY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgYWxsVXNlck9yZGVycywgJGxvZywgYWxsUHJvZHVjdHMsIGFsbFVzZXJzLCBhbGxPcmRlckRldGFpbHMsIE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcblxuICAgICRzY29wZS5wcm9kdWN0cyA9IGFsbFByb2R1Y3RzO1xuICAgICRzY29wZS51c2VycyA9IGFsbFVzZXJzO1xuICAgICRzY29wZS51c2VyT3JkZXJzID0gYWxsVXNlck9yZGVycztcblxuICAgIC8vYWRkaW5nIHN0YXR1cyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kU3RhdHVzKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwuc3RhdHVzID0gc3RhdHVzO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcblxuICAgIC8vYWRkaW5nIHVzZXIgaW5mbyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kVXNlcihvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0XHRvcmRlckRldGFpbC51c2VyID0gdXNlcjtcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG4gICAgYWxsT3JkZXJEZXRhaWxzID0gYWxsT3JkZXJEZXRhaWxzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEudXNlck9yZGVySWQgLSBiLnVzZXJPcmRlcklkO1xuICAgIH0pO1xuICAgIGFsbE9yZGVyRGV0YWlscyA9IF8uZ3JvdXBCeShhbGxPcmRlckRldGFpbHMsICd1c2VyT3JkZXJJZCcpXG4gICAgJHNjb3BlLm9yZGVycyA9ICQubWFwKGFsbE9yZGVyRGV0YWlscyxmdW5jdGlvbiAob3JkZXIsIGkpIHtcbiAgICAgICAgaWYgKGkpIHJldHVybiBbb3JkZXJdO1xuICAgIH0pXG4gICAgY29uc29sZS5sb2coJHNjb3BlLm9yZGVycyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYWRtaW4nLCB7XG4gICAgICAgIHVybDogJy9hZG1pbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWRtaW4vYWRtaW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBZG1pbkN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBhbGxQcm9kdWN0czogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlcnM6IGZ1bmN0aW9uIChVc2VyRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS5mZXRjaEFsbCgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsT3JkZXJEZXRhaWxzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJPcmRlcnM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsVXNlck9yZGVycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn0pXG4iLCIgYXBwLmNvbnRyb2xsZXIoJ0NhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkbG9nLCBjYXJ0Q29udGVudCwgQ2FydEZhY3Rvcnkpe1xuIFx0JHNjb3BlLmNhcnRDb250ZW50PWNhcnRDb250ZW50O1xuXG4gXHQkc2NvcGUucmVtb3ZlPSBmdW5jdGlvbihvcmRlcklkKSB7XG4gXHRcdENhcnRGYWN0b3J5LnJlbW92ZUZyb21DYXJ0KG9yZGVySWQpXG4gXHRcdC50aGVuKGZ1bmN0aW9uKG5ld0NhcnQpe1xuIFx0XHRcdCRzY29wZS5jYXJ0Q29udGVudCA9IG5ld0NhcnQ7XG4gXHRcdH0pLmNhdGNoKCRsb2cpXG4gXHR9XG5cbiBcdCRzY29wZS5jaGFuZ2VRdWFudGl0eT0gZnVuY3Rpb24gKGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2hhbmdlUXVhbnRpdHkoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCk7XG4gICAgICAgICRzY29wZS5jYXJ0Q29udGVudCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgfTtcblxuICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxuICAkc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG90YWwgPSAwO1xuICAgIGNhcnRDb250ZW50LmZvckVhY2goY2FydCA9PiB0b3RhbCArPSAoY2FydC5wcmljZSAqIGNhcnQucXVhbnRpdHkpKVxuXG4gICAgcmV0dXJuIHRvdGFsOyAgXG4gIH1cbiB9KVxuXG4gIiwiIFxuIGFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuIFx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NhcnQnLCB7XG4gXHRcdHVybDonL2NhcnQnLFxuIFx0XHR0ZW1wbGF0ZVVybDonanMvY2FydC9jYXJ0Lmh0bWwnLFxuIFx0XHRjb250cm9sbGVyOidDYXJ0Q3RybCcsXG4gXHRcdHJlc29sdmU6e1xuIFx0XHRcdGNhcnRDb250ZW50OmZ1bmN0aW9uKENhcnRGYWN0b3J5KXtcblxuIFx0XHRcdFx0cmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKTtcbiAgICAgICAgICAgIFxuIFx0XHRcdH1cbiBcdFx0fSAgIFxuIFx0fSkgICAgICAgICAgICBcbiB9KSAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAiLCJhcHAuY29udHJvbGxlcignQ2hlY2tvdXRDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQ2FydEZhY3RvcnkpIHtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICBjb25zb2xlLmxvZyhpdGVtcylcbiAgICAgICAgJHNjb3BlLml0ZW1zID0gaXRlbXM7XG5cbiAgXHRcdFx0Ly9jYWxjdWxhdGluZyB0b3RhbCBwcmljZSBhbmQgcHV0IHRoYXQgaW50byAkc2NvcGUudG90YWxcbiAgICAgICAgdmFyIGl0ZW1zQXJyID0gaXRlbXM7XG4gICAgICAgIHZhciB0b3RhbFByaWNlRWFjaCA9IFtdO1xuICAgICAgICBpdGVtc0Fyci5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICBcdHRvdGFsUHJpY2VFYWNoLnB1c2goZWxlbWVudC5wcmljZSAqIGVsZW1lbnQucXVhbnRpdHkpO1xuICAgICAgICB9KVxuICAgICAgICAkc2NvcGUudG90YWwgPSB0b3RhbFByaWNlRWFjaC5yZWR1Y2UoIChwcmV2LCBjdXJyKSA9PiBwcmV2ICsgY3VyciApO1xuICAgIH0pXG5cbiAgICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NoZWNrb3V0Jywge1xuICAgICAgICB1cmw6ICcvY2hlY2tvdXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NoZWNrb3V0L2NoZWNrb3V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ2hlY2tvdXRDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbJ2FuZ3VsaWtlJywgJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7ICAgXG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhLnVzZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNBZG1pbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlci5pc0FkbWluO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Jlc2V0Jywge1xuICAgICAgICB1cmw6ICcvcmVzZXQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Jlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGFzc3dvcmQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldC9wYXNzd29yZC86dG9rZW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL3Bhc3N3b3JkLnJlc2V0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pXG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSwgQXV0aEZhY3RvcnksICRzdGF0ZVBhcmFtcywgQ2FydEZhY3RvcnkpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG4gICAgJHNjb3BlLnRva2VuID0gJHN0YXRlUGFyYW1zLnRva2VuO1xuXG4gICAgJHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKGVtYWlsKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdDaGVjayB5b3VyIGVtYWlsJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgcGFzc3dvcmQpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZChwYXNzd29yZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxvZ2luSW5mbyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7XG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWVtYmVyc09ubHknLCB7XG4gICAgICAgIHVybDogJy9tZW1iZXJzLWFyZWEnLFxuICAgICAgICB0ZW1wbGF0ZTogJzxpbWcgbmctcmVwZWF0PVwiaXRlbSBpbiBzdGFzaFwiIHdpZHRoPVwiMzAwXCIgbmctc3JjPVwie3sgaXRlbSB9fVwiIC8+JyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgU2VjcmV0U3Rhc2gpIHtcbiAgICAgICAgICAgIFNlY3JldFN0YXNoLmdldFN0YXNoKCkudGhlbihmdW5jdGlvbiAoc3Rhc2gpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3Rhc2ggPSBzdGFzaDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGU6IHRydWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1NlY3JldFN0YXNoJywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0U3Rhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvbWVtYmVycy9zZWNyZXQtc3Rhc2gnKS50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRTdGFzaDogZ2V0U3Rhc2hcbiAgICB9O1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignUGF5bWVudEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsVXNlckZhY3RvcnksICRsb2csIENhcnRGYWN0b3J5LCB0b3RhbENvc3QsIGFycmF5T2ZJdGVtcyl7XG4gICRzY29wZS5pbmZvID0ge307XG4gIFxuICAkc2NvcGUudmFsaWRhdGVVc2VyPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQoJHNjb3BlLmluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5zaG93Q0MgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgkbG9nLmVycm9yKVxuICAgICAgICBcbiAgfVxuICAkc2NvcGUudG90YWxDb3N0ID0gdG90YWxDb3N0O1xuICAkc2NvcGUuYXJyYXlPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zO1xuICAkc2NvcGUuc3RyaW5nT2ZJdGVtcyA9IGFycmF5T2ZJdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnRpdGxlKS5qb2luKCcsJylcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGF5bWVudCcsIHtcbiAgICAgICAgdXJsOiAnL3BheW1lbnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3BheW1lbnQvcGF5bWVudC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUGF5bWVudEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgdG90YWxDb3N0OiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0KCkgfSxcbiAgICAgICAgICBhcnJheU9mSXRlbXM6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB0aGVQcm9kdWN0LCBhbGxSZXZpZXdzLCBQcm9kdWN0RmFjdG9yeSwgQ2FydEZhY3RvcnkpIHtcbiAgICAvLyBwcm9kdWN0XG4gICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICRzY29wZS5wcm9kdWN0ID0gdGhlUHJvZHVjdDtcbiAgICAkc2NvcGUucmV2aWV3cyA9IGFsbFJldmlld3M7XG4gICAgLy8gcmV2aWV3XG4gICAgJHNjb3BlLm1vZGFsT3BlbiA9IGZhbHNlO1xuICAgICRzY29wZS5zdWJtaXRSZXZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5uZXdSZXZpZXcucHJvZHVjdElkID0gJHNjb3BlLnByb2R1Y3QuaWQ7XG4gICAgICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldygkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLm5ld1JldmlldykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUucmV2aWV3cyA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3M7XG4gICAgICAgICAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91IScsIDEwMDApO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGFkZCB0byBjYXJ0XG4gICAgJHNjb3BlLmFkZFRvQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUucXVhbnRpdHkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91ISBZb3VyIGl0ZW0gd2FzIGFkZGVkIHRvIHlvdXIgY2FydCEnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5hcnJheU1ha2VyID0gZnVuY3Rpb24gKG51bSl7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD1udW07IGkgKyspe1xuICAgICAgICAgICAgYXJyLnB1c2goaSlcbiAgICAgICAgfSAgXG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfVxuXG59KSAgIFxuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICBhdXRvc2Nyb2xsOiAndHJ1ZScsXG4gICAgICAgIHVybDogJy9wcm9kdWN0cy86cHJvZHVjdElkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHRoZVByb2R1Y3Q6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCgkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxSZXZpZXdzOiBmdW5jdGlvbihQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cygkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAiLCJhcHAuY29udHJvbGxlcignUHJvZmlsZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgVXNlckZhY3RvcnksICRzdGF0ZSl7XG5cdCAgICBVc2VyRmFjdG9yeS5mZXRjaE9uZSgpXG4gICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgY29uc29sZS5sb2coJ2hlbGxvbycsdXNlci5pZClcbiAgICAgIH0pXG5cbiAgICAgICRzY29wZS51c2VyID0ge307XG4gIFxuICAkc2NvcGUuc2F2ZVVzZXJJbmZvPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUudXNlcikgICAgICAgXG4gIH1cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2ZpbGUnLCB7XG4gICAgICAgICAgICAgdXJsOiAnL3VzZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUHJvZmlsZUN0cmwnLFxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgICAgXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG4gIGFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aEZhY3RvcnksICRzdGF0ZSkge1xuICAgICRzY29wZS5zaWdudXAgPSB7fTsgXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICBBdXRoRmFjdG9yeS5zaWdudXAoc2lnbnVwSW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09ICdlbWFpbCBleGlzdHMgYWxyZWFkeScpIHtcbiAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVXNlciBhbHJlYWR5IGV4aXN0cycsIDIwMDApO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlID09PSAnbm90IGEgdmFsaWQgZW1haWwnKXtcbiAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnSXQgaXMgbm90IGEgdmFsaWQgZW1haWwnLCAyMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnR28gYWhlYWQgYW5kIGxvZ2luJywgNDAwMCk7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbiAgICAkc2NvcGUuZ29vZ2xlU2lnbnVwID0gQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwO1xufSk7XG5cblxuIiwiYXBwLmNvbnRyb2xsZXIoJ1N0b3JlQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHByb2R1Y3RzKSB7XG4gICAgJHNjb3BlLnByb2R1Y3RzID0gcHJvZHVjdHM7XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc3RvcmUnLCB7XG4gICAgICAgIHVybDogJy9zdG9yZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc3RvcmUvc3RvcmUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTdG9yZUN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBwcm9kdWN0czogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ09yZGVySGlzdG9yaWVzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZENhcnQgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9wYWlkLydcbiAgICB2YXIgb3JkZXJIaXN0b3JpZXNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBvcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRDYXJ0KVxuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiBcblxuICAgIHJldHVybiBvcmRlckhpc3Rvcmllc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0F1dGhGYWN0b3J5JywgIGZ1bmN0aW9uKCRodHRwKXtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgdmFyIEF1dGhGYWN0b3J5ID0ge307XG5cblxuICAgIEF1dGhGYWN0b3J5LnNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvc2lnbnVwJywgc2lnbnVwSW5mbykudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2F1dGgvZ29vZ2xlJyk7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkucmVzZXRQYXNzd29yZCA9IGZ1bmN0aW9uICh0b2tlbiwgbG9naW4pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9yZXNldC9wYXNzd29yZC8nICsgdG9rZW4sIGxvZ2luKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2ZvcmdvdCcsIGVtYWlsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQXV0aEZhY3Rvcnk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdDYXJ0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCwgJGxvZywgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL29yZGVycy9jYXJ0Lyc7XG4gICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpdGVtLmltYWdlVXJsID0gJy9hcGkvcHJvZHVjdHMvJyArIGl0ZW0ucHJvZHVjdElkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cbiAgICB2YXIgQ2FydEZhY3RvcnkgPSB7fTtcbiAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gW107XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zb3J0KGZ1bmN0aW9uIChhLGIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBiLmlkIC0gYS5pZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3VwZGF0ZUNhcnQnLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZGVsZXRlSXRlbSA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIHByb2R1Y3RJZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpXG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja0ZvckR1cGxpY2F0ZXMgPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICB2YXIgZHVwbGljYXRlID0gdGhpcy5jYWNoZWRDYXJ0LmZpbHRlcihpdGVtID0+IGl0ZW0ucHJvZHVjdElkID09PSBwcm9kdWN0SWQpO1xuICAgICAgICByZXR1cm4gKGR1cGxpY2F0ZS5sZW5ndGgpID8gZHVwbGljYXRlWzBdIDogbnVsbDtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBxdWFudGl0eSkge1xuICAgICAgXG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSBDYXJ0RmFjdG9yeS5jaGVja0ZvckR1cGxpY2F0ZXMocHJvZHVjdElkKTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5XG4gICAgICAgICAgICAuY2hhbmdlUXVhbnRpdHkoZHVwbGljYXRlLmlkLCBkdXBsaWNhdGUucXVhbnRpdHksICdhZGQnLCBxdWFudGl0eSApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkU3VjY2Vzc0FuaW1hdGlvbigpXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgcHJvZHVjdElkLCB7cXVhbnRpdHk6IHF1YW50aXR5fSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8gLnRoZW4oY29udmVydClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21DYXJ0PWZ1bmN0aW9uKG9yZGVySWQpe1xuICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsK29yZGVySWQpXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tRnJvbnRFbmRDYWNoZShvcmRlcklkKVxuICAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlUXVhbnRpdHk9ZnVuY3Rpb24ob3JkZXJJZCwgcXVhbnRpdHksIGFkZE9yU3VidHIsIGFtb3VudCA9IDEpe1xuICAgICAgICB2YXIgcnVuRnVuYz1mYWxzZTtcbiAgICAgICAgaWYgKGFkZE9yU3VidHI9PT0nYWRkJykge1xuICAgICAgICAgICAgYWRkU3VjY2Vzc0FuaW1hdGlvbigpXG4gICAgICAgICAgICBxdWFudGl0eSs9ICthbW91bnQ7XG4gICAgICAgICAgICBydW5GdW5jPXRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYWRkT3JTdWJ0cj09PSdzdWJ0cmFjdCcgJiYgcXVhbnRpdHk+MSkge1xuICAgICAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgICAgICBxdWFudGl0eS09ICthbW91bnQ7XG4gICAgICAgICAgICBydW5GdW5jPXRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bkZ1bmM9PT10cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBvcmRlcklkLCB7cXVhbnRpdHk6cXVhbnRpdHl9KVxuICAgICAgICAgICAgLy8gLnRoZW4oY29udmVydClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5KG9yZGVySWQscXVhbnRpdHkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG5cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tRnJvbnRFbmRDYWNoZSA9IGZ1bmN0aW9uKG9yZGVySWQpe1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZm9yRWFjaChmdW5jdGlvbihvcmRlcixpKXtcbiAgICAgICAgICAgIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkgaW5kZXggPSBpO1xuICAgICAgICB9KVxuXG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKGluZGV4LDEpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eSA9IGZ1bmN0aW9uIChvcmRlcklkLHF1YW50aXR5KSB7XG4gICAgICAgIHZhciBpID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5maW5kSW5kZXgoZnVuY3Rpb24ob3JkZXIpe1xuICAgICAgICAgICAgLy8gaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSB7XG4gICAgICAgICAgICAvLyAgICAgb3JkZXIucXVhbnRpdHkgPSBxdWFudGl0eTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIHJldHVybiBvcmRlci5pZCA9PT0gb3JkZXJJZDtcbiAgICAgICAgfSk7XG4gICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnRbaV0ucXVhbnRpdHkgPSBxdWFudGl0eVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ29yZGVySGlzdG9yaWVzJyk7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZSgwLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0Lmxlbmd0aCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9ICBcblxuICAgIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihjYXJ0KXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjYXJ0KVxuICAgICAgICAgICAgICAgIGNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlKml0ZW0ucXVhbnRpdHkpIClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG90YScsIHRvdGFsKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goJGxvZy5lcnJvcilcbiAgICB9XG5cblxuICAgIHZhciBhbmltYXRpb25FbmQgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG1vekFuaW1hdGlvbkVuZCBNU0FuaW1hdGlvbkVuZCBvYW5pbWF0aW9uZW5kIGFuaW1hdGlvbmVuZCc7XG5cbiAgICBmdW5jdGlvbiBhZGRTdWNjZXNzQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHJ1YmJlckJhbmQnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gYWRkUmVtb3ZlQW5pbWF0aW9uKCkge1xuICAgICAgICAkKCcjY2FydC1pY29uJykuYWRkQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJykub25lKGFuaW1hdGlvbkVuZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NhcnQtaWNvbicpLnJlbW92ZUNsYXNzKCdhbmltYXRlZCBzaGFrZScpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgQ2FydEZhY3RvcnkuZmluZE9uZVVzZXJJbmZvPWZ1bmN0aW9uKCl7XG4gICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgfVxuXG4gICAgcmV0dXJuIENhcnRGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdNYW5hZ2VPcmRlcnNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkT3JkZXJEZXRhaWxzID0gW107XG4gICAgdmFyIGNhY2hlZFVzZXJPcmRlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL21hbmFnZU9yZGVycy8nXG4gICAgdmFyIG1hbmFnZU9yZGVyc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkT3JkZXJEZXRhaWxzKVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZE9yZGVyRGV0YWlscztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsVXNlck9yZGVycyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlcicpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRVc2VyT3JkZXJzKVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFVzZXJPcmRlcnM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kU3RhdHVzID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kVXNlciA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlci8nICsgdXNlck9yZGVySWQpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCwgZGF0YSl7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZCwgZGF0YSlcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlck9yZGVyKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KFwiVXBkYXRlZFwiLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlck9yZGVycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXJPcmRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlci5pZCA9PT0gdXNlck9yZGVySWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2VyT3JkZXJzW3VwZGF0ZWRJbmRdID0gdXNlck9yZGVyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyO1xuICAgICAgICB9KVxuICAgIH1cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmRlbGV0ZVVzZXJPcmRlciA9IGZ1bmN0aW9uICh1c2VyT3JkZXJJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQpXG4gICAgICAgIC5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJEZWxldGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlci5pZCA9PT0gdXNlck9yZGVySWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWFuYWdlT3JkZXJzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnUHJvZHVjdEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuXG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nO1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBwYXJzZVRpbWVTdHIgPSBmdW5jdGlvbiAocmV2aWV3KSB7XG4gICAgICAgIHZhciBkYXRlID0gcmV2aWV3LmNyZWF0ZWRBdC5zdWJzdHIoMCwgMTApO1xuICAgICAgICByZXZpZXcuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHJldHVybiByZXZpZXc7XG4gICAgfVxuXG4gICAgdmFyIFByb2R1Y3RGYWN0b3J5ID0ge307XG4gICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMgPSBbXTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzID0gW107XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0cy5tYXAoUHJvZHVjdEZhY3RvcnkuY29udmVydCk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHByb2R1Y3RzLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyk7IC8vIHdoeSBhbmd1bGFyIGNvcHkgYWx0ZXJzIGFycmF5IG9yZGVyISEhISEhIVxuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cztcbiAgICAgICAgICAgICAgICB9KVxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS51cGRhdGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oUHJvZHVjdEZhY3RvcnkuY29udmVydClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVXBkYXRlZCcsIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHNbdXBkYXRlZEluZF0gPSBwcm9kdWN0O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdDtcbiAgICAgICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRGVsZXRlZCcsIDEwMDApO1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5maW5kSW5kZXgoZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oUHJvZHVjdEZhY3RvcnkuY29udmVydCk7XG5cbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuY29udmVydCA9IGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgIHByb2R1Y3QuaW1hZ2VVcmwgPSBiYXNlVXJsICsgcHJvZHVjdC5pZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gcHJvZHVjdDtcbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQsIGRhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV2aWV3ID0gcGFyc2VUaW1lU3RyKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MucHVzaChyZXZpZXcpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXZpZXc7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MubWFwKHBhcnNlVGltZVN0cik7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeTtcblxufSlcbiIsIi8vdGhlIHNhbWUgYXMgYmVsb3cgYnV0IG5vdCB3b3JraW5nIFdURiFcblxuLy8gYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4vLyAgICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbi8vICAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbi8vICAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4vLyAgICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbi8vICAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4vLyAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyBcbi8vICAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuLy8gICAgICAgICAgICAgICAgICAgICB9KVxuLy8gICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4vLyAgICAgICAgICAgICAgICAgfSlcbi8vICAgICB9O1xuXG5cbi8vICAgVXNlckZhY3RvcnkuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbi8vICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuLy8gICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbi8vICAgfTtcblxuXG4vLyAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlciA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuLy8gICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbi8vICAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuLy8gICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4vLyAgICAgICAgICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vyc1t1cGRhdGVkSW5kXSA9IHVzZXI7XG4vLyAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyO1xuLy8gICAgICAgICAgICAgICAgIH0pXG4vLyAgICAgfSAgXG5cbi8vICAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKGlkKSB7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbi8vICAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4vLyAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbi8vICAgICAgICAgfSk7XG4vLyAgICAgfVxuXG4vLyAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQgPSBmdW5jdGlvbiAoaW5mb09iail7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4vLyAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuLy8gICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4vLyAgICAgICAgICAgICAgICAgaWYodXNlci5pZCA9PT0gJ3Nlc3Npb24nKXtcbi8vICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlU2Vzc2lvbkNhcnQnLCBpbmZvT2JqKVxuLy8gICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICBlbHNle1xuLy8gICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyKHVzZXIuaWQsaW5mb09iailcbi8vICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVVzZXJDYXJ0JywgaW5mb09iailcbi8vICAgICAgICAgICAgICAgICAgICAgfSlcbi8vICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICB9KVxuLy8gICAgIH1cblxuXG5cblxuLy8gICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbi8vIH0pXG5cbmFwcC5mYWN0b3J5KCdVc2VyRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuICAgIHZhciBVc2VyRmFjdG9yeSA9IHt9O1xuXG4gICAgdmFyIGNhY2hlZFVzZXJzID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS91c2Vycy8nO1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgVXNlckZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCkudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2Vycykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkodXNlcnMsIGNhY2hlZFVzZXJzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFVzZXJzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcbiAgICAgIFVzZXJGYWN0b3J5LmZldGNoT25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gIH07XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQgPSBmdW5jdGlvbiAoaW5mb09iail7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgaWYodXNlci5pZCA9PT0gJ3Nlc3Npb24nKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlU2Vzc2lvbkNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyKHVzZXIuaWQsaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVVzZXJDYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbn0pXG5cbiIsImFwcC5jb250cm9sbGVyKCdGQmxpa2UnLCBbXG4gICAgICAnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAgICRzY29wZS5teU1vZGVsID0ge1xuICAgICAgICAgICAgICBVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nLFxuICAgICAgICAgICAgICBOYW1lOiBcIlBva2VtYXJ0XCIsXG4gICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuICAgICAgICAgIH07XG4gICAgICB9XG4gIF0pOyAgICAiLCJhbmd1bGFyLm1vZHVsZSgnYW5ndWxpa2UnKVxuICAgIC5kaXJlY3RpdmUoJ2ZiTGlrZScsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjonRkJsaWtlJyxcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBmYkxpa2U6ICc9PydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXR0cnMuZmJMaWtlPW15TW9kZWwuVXJsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoISR3aW5kb3cuRkIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgRmFjZWJvb2sgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRTY3JpcHQoJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuaW5pdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcElkOiAkcm9vdFNjb3BlLmZhY2Vib29rQXBwSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhmYm1sOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAndjIuMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSAgIFxuIFxuICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJMaWtlQnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhYXR0cnMuZmJMaWtlICYmICFzY29wZS5mYkxpa2UgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCdmYkxpa2UnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gcnVuIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxkaXYgY2xhc3M9XCJmYi1saWtlXCInICsgKCEhc2NvcGUuZmJMaWtlID8gJyBkYXRhLWhyZWY9XCInICsgc2NvcGUuZmJMaWtlICsgJ1wiJyA6ICcnKSArICcgZGF0YS1sYXlvdXQ9XCJidXR0b25fY291bnRcIiBkYXRhLWFjdGlvbj1cImxpa2VcIiBkYXRhLXNob3ctZmFjZXM9XCJ0cnVlXCIgZGF0YS1zaGFyZT1cInRydWVcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LkZCLlhGQk1MLnBhcnNlKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFwcC5kaXJlY3RpdmUoJ3Bpbkl0JywgW1xuICAgICAgICAnJHdpbmRvdycsICckbG9jYXRpb24nLFxuICAgICAgICBmdW5jdGlvbiAoJHdpbmRvdywgJGxvY2F0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgcGluSXQ6ICc9JyxcbiAgICAgICAgICAgICAgICAgICAgcGluSXRJbWFnZTogJz0nLFxuICAgICAgICAgICAgICAgICAgICBwaW5JdFVybDogJz0nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOidQaW50Q3RybCcsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISR3aW5kb3cucGFyc2VQaW5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIFBpbnRlcmVzdCBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZiA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ1NDUklQVCcpWzBdLCBwID0gZC5jcmVhdGVFbGVtZW50KCdTQ1JJUFQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLnNyYyA9ICcvL2Fzc2V0cy5waW50ZXJlc3QuY29tL2pzL3Bpbml0LmpzJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwWydkYXRhLXBpbi1idWlsZCddID0gJ3BhcnNlUGlucyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghISR3aW5kb3cucGFyc2VQaW5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChwLm9ubG9hZCwgMTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0oJHdpbmRvdy5kb2N1bWVudCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuIFxuICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJQaW5JdEJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUucGluSXQgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCdwaW5JdCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gcnVuIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGEgaHJlZj1cIi8vd3d3LnBpbnRlcmVzdC5jb20vcGluL2NyZWF0ZS9idXR0b24vP3VybD0nICsgKHNjb3BlLnBpbkl0VXJsIHx8ICRsb2NhdGlvbi5hYnNVcmwoKSkgKyAnJm1lZGlhPScgKyBzY29wZS5waW5JdEltYWdlICsgJyZkZXNjcmlwdGlvbj0nICsgc2NvcGUucGluSXQgKyAnXCIgZGF0YS1waW4tZG89XCJidXR0b25QaW5cIiBkYXRhLXBpbi1jb25maWc9XCJiZXNpZGVcIj48L2E+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5wYXJzZVBpbnMoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiLy8gYXBwLmNvbnRyb2xsZXIoJ1R3aXR0ZXJDdHJsJywgW1xuLy8gICAgICAgJyRzY29wZScsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbi8vICAgICAgICAgICAkc2NvcGUubXlNb2RlbCA9IHtcbi8vICAgICAgICAgICAgICAgVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJyxcbi8vICAgICAgICAgICAgICAgTmFtZTogXCJQb2tlbWFydFwiLFxuLy8gICAgICAgICAgICAgICBJbWFnZVVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbSdcbi8vICAgICAgICAgICB9O1xuLy8gICAgICAgfVxuLy8gICBdKTsgICAgIiwiYXBwLmRpcmVjdGl2ZSgndHdlZXQnLCBbXG4gICAgICAgICckd2luZG93JywgJyRsb2NhdGlvbicsXG4gICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICB0d2VldDogJz0nLFxuICAgICAgICAgICAgICAgICAgICB0d2VldFVybDogJz0nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjb250cm9sbGVyOidUd2l0dGVyQ3RybCcsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISR3aW5kb3cudHd0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgVHdpdHRlciBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9wbGF0Zm9ybS50d2l0dGVyLmNvbS93aWRnZXRzLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiBcbiAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyVHdlZXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLnR3ZWV0ICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgndHdlZXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gcnVuIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGEgaHJlZj1cImh0dHBzOi8vdHdpdHRlci5jb20vc2hhcmVcIiBjbGFzcz1cInR3aXR0ZXItc2hhcmUtYnV0dG9uXCIgZGF0YS10ZXh0PVwiJyArIHNjb3BlLnR3ZWV0ICsgJ1wiIGRhdGEtdXJsPVwiJyArIChzY29wZS50d2VldFVybCB8fCAkbG9jYXRpb24uYWJzVXJsKCkpICsgJ1wiPlR3ZWV0PC9hPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cudHd0dHIud2lkZ2V0cy5sb2FkKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyAgICIsImFwcC5kaXJlY3RpdmUoJ3Nob3BwaW5nQ2FydCcsIGZ1bmN0aW9uKENhcnRGYWN0b3J5LCAkcm9vdFNjb3BlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9jYXJ0LXJldmVhbC9jYXJ0LXJldmVhbC5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGFjdGl2ZTogJz0nLFxuICAgICAgICAgICAgYWRkQW5kUmV2ZWFsQ2FyZDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIC8vIHNjb3BlOiB7IHNldEZuOiAnJicgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbigndXBkYXRlQ2FydCcsIGZ1bmN0aW9uIChldmVudCwgY2FydCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQgPSBjYXJ0O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHNjb3BlLnJldmVhbENhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQgY2hlY2tvdXQtLWFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuaGlkZUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuYWN0aXZlID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuY2FydClcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSAqIGl0ZW0ucXVhbnRpdHkpKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbDtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyBzY29wZS5zZXRGbih7dGhlRGlyRm46IHNjb3BlLnVwZGF0ZU1hcH0pO1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgnZnVsbHN0YWNrTG9nbycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmh0bWwnXG4gICAgfTtcbn0pOyIsImFwcC5kaXJlY3RpdmUoJ25hdmJhcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgQVVUSF9FVkVOVFMsICRzdGF0ZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnU2hvcCcsIHN0YXRlOiAnc3RvcmUnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ01lbWJlcnMgT25seScsIHN0YXRlOiAnbWVtYmVyc09ubHknLCBhdXRoOiB0cnVlIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTdweCAtMzA2cHgnKVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnVudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQoJy5wb2tlYmFsbCBpLmdyZWF0JykuY3NzKCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJy0yOTNweCAtOXB4JylcblxuICAgICAgICAgICAgfSAgIFxuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0QWRtaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coQXV0aEludGVyY2VwdG9yKTtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmFkbWluID0gQXV0aFNlcnZpY2UuaXNBZG1pbih1c2VyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcbiAgICAgICAgICAgIHNldEFkbWluKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYXBwLmRpcmVjdGl2ZSgnb2F1dGhCdXR0b24nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHByb3ZpZGVyTmFtZTogJ0AnXG4gICAgfSxcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnL2pzL2NvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uaHRtbCdcbiAgfVxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdvcmRlckVudHJ5JywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgb3JkZXJEZXRhaWxzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHMsIGUsIGEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHMub3JkZXJEZXRhaWxzKTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3J5Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cbn0pIiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJIaXN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgaGlzdG9yaWVzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yeUN0cmwnXG4gICBcbiAgICB9XG5cbn0pXG4gICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q2FyZEN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuXG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllcyA9IFtcbiAgICAgICAge25hbWU6ICdBbGwnfSxcbiAgICAgICAge25hbWU6ICdGaXJlJ30sXG4gICAgICAgIHtuYW1lOiAnV2F0ZXInfSxcbiAgICAgICAge25hbWU6ICdHcmFzcyd9LFxuICAgICAgICB7bmFtZTogJ1JvY2snfSxcbiAgICAgICAge25hbWU6ICdEcmFnb24nfSxcbiAgICAgICAge25hbWU6ICdQc3ljaGljJ30sXG4gICAgICAgIHtuYW1lOiAnSWNlJ30sXG4gICAgICAgIHtuYW1lOiAnTm9ybWFsJ30sXG4gICAgICAgIHtuYW1lOiAnQnVnJ30sXG4gICAgICAgIHtuYW1lOiAnRWxlY3RyaWMnfSxcbiAgICAgICAge25hbWU6ICdHcm91bmQnfSxcbiAgICAgICAge25hbWU6ICdGYWlyeSd9LFxuICAgICAgICB7bmFtZTogJ0ZpZ2h0aW5nJ30sXG4gICAgICAgIHtuYW1lOiAnR2hvc3QnfSxcbiAgICAgICAge25hbWU6ICdQb2lzb24nfVxuICAgIF1cblxuICAgICRzY29wZS5maWx0ZXIgPSBmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5IHx8IGNhdGVnb3J5ID09PSAnQWxsJykgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIGVsc2UgcmV0dXJuIHByb2R1Y3QuY2F0ZWdvcnkgPT09IGNhdGVnb3J5XG4gICAgICAgIH07XG4gICAgfTtcbiAgICAkc2NvcGUuc2VhcmNoRmlsdGVyPWZ1bmN0aW9uKHNlYXJjaGluZ05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICBpZiAoIXNlYXJjaGluZ05hbWUpIHJldHVybiB0cnVlOyAgICAgICAgICAgXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbGVuID0gc2VhcmNoaW5nTmFtZS5sZW5ndGhcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncHJvZHVjdCcsIHByb2R1Y3QudGl0bGUpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QudGl0bGUuc3Vic3RyaW5nKDAsbGVuKS50b0xvd2VyQ2FzZSgpPT1zZWFyY2hpbmdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxuICAgICRzY29wZS5wcmljZVJhbmdlRmlsdGVyPWZ1bmN0aW9uKG1pbj0wLG1heD0yMDAwKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHByb2R1Y3Qpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QucHJpY2U+PW1pbiAmJiBwcm9kdWN0LnByaWNlPD1tYXg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnNvcnRpbmdGdW5jPWZ1bmN0aW9uKHNvcnRUeXBlPVwidW50b3VjaGVkXCIpe1xuICAgICAgICBpZiAoc29ydFR5cGU9PT1cInVudG91Y2hlZFwiKSByZXR1cm4gbnVsbDtcbiAgICAgICAgZWxzZSBpZiAoc29ydFR5cGU9PT1cImxvd1wiKSByZXR1cm4gJ3ByaWNlJ1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PSdoaWdoJykgcmV0dXJuICctcHJpY2UnXG4gICAgICAgIH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3Byb2R1Y3RDYXJkJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDYXJkQ3RybCdcbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdEVudHJ5JywgZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0OiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zdWJtaXRVcGRhdGUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS51cGRhdGVQcm9kdWN0KGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0KGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiLy8gYXBwLmRpcmVjdGl2ZSgnc3RhclJhdGluZycsIGZ1bmN0aW9uICgpIHtcbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgcmVzdHJpY3Q6ICdFQScsXG4vLyAgICAgICB0ZW1wbGF0ZTpcbi8vICAgICAgICAgJzxzcGFuIGNsYXNzPVwic3RhcnNcIj4nICtcbi8vICAgICAgICAgICc8ZGl2IGNsYXNzPVwic3RhcnMtZmlsbGVkIGxlZnRcIj4nICtcbi8vICAgICAgICAgICAgICc8c3Bhbj7imIU8L3NwYW4+JyArXG4vLyAgICAgICAgICAnPC9kaXY+JyArXG4vLyAgICAgICAnPC9zcGFuPidcbi8vICAgICB9O1xuLy8gfSlcbiIsIiAvLyBhcHAuY29udHJvbGxlcignU2VhcmNoQmFyQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG4gLy8gXHQkc2NvcGUucHJvZHVjdD1cbiAvLyB9KSIsImFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKCl7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6J0UnLFxuXHRcdHRlbXBsYXRlVXJsOidqcy9jb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjonUHJvZHVjdENhcmRDdHJsJ1xuXHR9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyRW50cnknLCBmdW5jdGlvbiAoVXNlckZhY3RvcnksIEF1dGhGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLWVudHJ5L3VzZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICAgICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKHtlbWFpbDogZW1haWx9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RvbmUnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKHVzZXJJZCkge1xuICAgICAgICAgICAgICAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyKHVzZXJJZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdFcmFzZSBmcm9tIHBsYW5ldCBFYXJ0aCcsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJPcmRlcicsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyT3JkZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzKGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXJPcmRlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyKGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJcbmFwcC5kaXJlY3RpdmUoJ2NsaWNrQW55d2hlcmVCdXRIZXJlJywgZnVuY3Rpb24oJGRvY3VtZW50KXtcbiAgcmV0dXJuIHtcbiAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgIGNsaWNrQW55d2hlcmVCdXRIZXJlOiAnJidcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbCwgYXR0cikge1xuXG4gICAgICAgICAgICAgICAkKCcubG9nbycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICBcblxuICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmlkICE9PSAnY2FydC1pY29uJyAmJiBlLnRhcmdldC5pZCAhPT0gJ2FkZC10by1jYXJ0LWJ1dHRvbicpIHtcbiAgICAgICAgICAgICAgICAgICBpZiAoZWwgIT09IGUudGFyZ2V0ICYmICFlbFswXS5jb250YWlucyhlLnRhcmdldCkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWwoc2NvcGUuY2xpY2tBbnl3aGVyZUJ1dEhlcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIH1cbiAgICAgICAgfVxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
