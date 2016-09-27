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

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFkbWluL2FkbWluLmNvbnRyb2xsZXIuanMiLCJhZG1pbi9hZG1pbi5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5jb250cm9sbGUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9mYmxpa2VzaGFyZS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS9waW50cmVzdC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9hbmd1bGlrZS90d2l0dGVyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29hdXRoLWJ1dHRvbi9vYXV0aC1idXR0b24uZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1jYXJkL3Byb2R1Y3QtY2FyZC5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJjb21tb24vZGlyZWN0aXZlcy9yZXZpZXctZW50cnkvc3Rhci1yYXRpbmcuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmNvbnRyb2xsZXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91dGlsaXR5L2NsaWNrQW55d2hlcmVCdXRIZXJlLmRpcmVjdGl2ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQSxPQUFBLEdBQUEsR0FBQSxRQUFBLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsRUFBQSxnQkFBQSxFQUFBLHFCQUFBLEVBQUEsZ0JBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBLHFCQUFBLEVBQUEsY0FBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLDBCQUFBLGVBQUE7O0FBRUE7QUFFQSxDQWJBOztBQWVBO0FBQ0EsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7QUFFQTtBQUNBLFFBQUEsK0JBQUEsU0FBQSw0QkFBQSxDQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLElBQUEsTUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLEtBRkE7O0FBSUE7QUFDQTtBQUNBLGVBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGNBQUEsY0FBQTs7QUFFQSxvQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxDQUFBLFFBQUEsSUFBQSxFQUFBLFFBQUE7QUFDQSxhQUZBLE1BRUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsU0FUQTtBQVdBLEtBNUJBO0FBNkJBLGVBQUEsYUFBQSxHQUFBLGlCQUFBO0FBQ0EsQ0F2Q0E7O0FDbkJBLElBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUEsSUFBQSxFQUFBLFdBQUEsRUFBQSxRQUFBLEVBQUEsZUFBQSxFQUFBLG1CQUFBLEVBQUE7O0FBRUEsV0FBQSxRQUFBLEdBQUEsV0FBQTtBQUNBLFdBQUEsS0FBQSxHQUFBLFFBQUE7QUFDQSxXQUFBLFVBQUEsR0FBQSxhQUFBOztBQUVBO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsVUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLE1BQUEsRUFBQTtBQUNBLHdCQUFBLE1BQUEsR0FBQSxNQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFBLEtBSEE7QUFJQSxLQUxBOztBQU9BO0FBQ0Esb0JBQUEsT0FBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsNEJBQUEsUUFBQSxDQUFBLFlBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLHdCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQSxFQUdBLEtBSEEsQ0FHQSxLQUFB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LFFBQUEscUJBQUEsOERBQUE7QUFDQSxRQUFBLG1CQUFBLFNBQUEsZ0JBQUEsR0FBQTtBQUNBLFlBQUEsYUFBQTtBQUNBLGlCQUFBLENBQ0EsS0FEQSxFQUVBLGVBRkEsQ0FEQTtBQUtBLG9CQUFBLENBQ0EsT0FEQSxFQUVBLFNBRkEsRUFHQSxRQUhBO0FBTEEsU0FBQTs7QUFZQSxpQkFBQSxJQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLGdCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsV0FBQSxHQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsV0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxhQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsUUFBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLDhCQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsR0FBQSxHQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLFlBQUEsaUJBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsU0FBQSxNQUFBO0FBQ0EsZ0JBQUEsSUFBQSxhQUFBLE1BQUEsR0FBQSxJQUFBO0FBQ0EsZ0JBQUEsSUFBQSxjQUFBLEtBQUEsTUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLGdCQUFBLFFBQUEsWUFBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7O0FBRUEsbUJBQUEsS0FDQSxZQURBLEdBQ0EsU0FEQSxHQUNBLGtCQURBLEdBQ0EsS0FE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LFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsMEJBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsVUFBQTtBQUNBLG1CQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVVBLFdBQUEscUJBQUE7QUFFQSxDQW5CQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTs7QUFFQSxRQUFBLGNBQUEsRUFBQTs7QUFHQSxnQkFBQSxNQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsYUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEscUJBQUEsS0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFDQSxDQXhCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsVUFBQSxtQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxtQkFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsS0FIQTtBQUlBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsZ0JBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSxTQU5BLEVBT0EsSUFQQSxDQU9BLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsU0FYQSxDQUFBO0FBWUEsS0FiQTs7QUFlQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLGdCQUFBLGtCQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLFlBQUEsS0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBO0FB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RUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7O0FBRUEsd0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsa0JBQUE7QUFDQSxtQkFBQSxrQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsa0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZ0JBQUE7QUFDQSxtQkFBQSxnQkFBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsd0JBQUEsVUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLFlBQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsZUFBQSxTQUFBLFlBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsT0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsZUFBQSxNQUFBO0FBQ0EsS0FKQTs7QUFNQSxRQUFBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxjQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsQ0FBQSxlQUFBLE9BQUEs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Q0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFLQTtBQUNBOztBQUVBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBOztBQUVBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsUUFBQSxVQUFBLGFBQUE7QUFDQSxRQUFBLFVBQUEsU0FBQSxPQUFBO0FBQUEsZUFBQSxJQUFBLElBQUE7QUFBQSxLQUFBOztBQUVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsS0FBQSxFQUFBLFdBQUEsRUFEQSxDQUNBO0FBQ0Esd0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxXQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTtBQVVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLG1CQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0EsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFB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LFFBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQ0EsOEJBQUEsTUFBQSxDQUFBLFlBQUE7O0FBRUEsa0NBQUEsS0FBQSxDQUFBLE1BQUEsb0JBQUE7QUFDQSx5QkFIQTtBQUlBO0FBQ0E7QUFDQSxhQVRBO0FBV0E7QUF4QkEsS0FBQTtBQTBCQSxDQTNCQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIsc3RyaXBlUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbiAgICAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKCk7XG5cbiAgICAvLyBzdHJpcGVQcm92aWRlci5zZXRQdWJsaXNoYWJsZUtleSgnbXlfa2V5Jyk7XG5cbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuICAgICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCA9ICc5NDEwMzgyODI2ODYyNDInO1xufSk7XG4iLCJcbmFwcC5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBhbGxVc2VyT3JkZXJzLCAkbG9nLCBhbGxQcm9kdWN0cywgYWxsVXNlcnMsIGFsbE9yZGVyRGV0YWlscywgTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLnByb2R1Y3RzID0gYWxsUHJvZHVjdHM7XG4gICAgJHNjb3BlLnVzZXJzID0gYWxsVXNlcnM7XG4gICAgJHNjb3BlLnVzZXJPcmRlcnMgPSBhbGxVc2VyT3JkZXJzO1xuXG4gICAgLy9hZGRpbmcgc3RhdHVzIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgIFx0XHRvcmRlckRldGFpbC5zdGF0dXMgPSBzdGF0dXM7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuXG4gICAgLy9hZGRpbmcgdXNlciBpbmZvIHRvIGVhY2ggb3JkZXJEZXRhaWxcbiAgICBhbGxPcmRlckRldGFpbHMuZm9yRWFjaChmdW5jdGlvbihvcmRlckRldGFpbCl7XG4gICAgXHRNYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnVzZXIgPSB1c2VyO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcbiAgICBhbGxPcmRlckRldGFpbHMgPSBhbGxPcmRlckRldGFpbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYS51c2VyT3JkZXJJZCAtIGIudXNlck9yZGVySWQ7XG4gICAgfSk7XG4gICAgYWxsT3JkZXJEZXRhaWxzID0gXy5ncm91cEJ5KGFsbE9yZGVyRGV0YWlscywgJ3VzZXJPcmRlcklkJylcbiAgICAkc2NvcGUub3JkZXJzID0gJC5tYXAoYWxsT3JkZXJEZXRhaWxzLGZ1bmN0aW9uIChvcmRlciwgaSkge1xuICAgICAgICBpZiAoaSkgcmV0dXJuIFtvcmRlcl07XG4gICAgfSlcbiAgICBjb25zb2xlLmxvZygkc2NvcGUub3JkZXJzKTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhZG1pbicsIHtcbiAgICAgICAgdXJsOiAnL2FkbWluJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hZG1pbi9hZG1pbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FkbWluQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsbFByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyczogZnVuY3Rpb24gKFVzZXJGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LmZldGNoQWxsKClcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxPcmRlckRldGFpbHM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlck9yZGVyczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsIiBhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRsb2csIGNhcnRDb250ZW50LCBDYXJ0RmFjdG9yeSl7XG4gXHQkc2NvcGUuY2FydENvbnRlbnQ9Y2FydENvbnRlbnQ7XG5cbiBcdCRzY29wZS5yZW1vdmU9IGZ1bmN0aW9uKG9yZGVySWQpIHtcbiBcdFx0Q2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQob3JkZXJJZClcbiBcdFx0LnRoZW4oZnVuY3Rpb24obmV3Q2FydCl7XG4gXHRcdFx0JHNjb3BlLmNhcnRDb250ZW50ID0gbmV3Q2FydDtcbiBcdFx0fSkuY2F0Y2goJGxvZylcbiBcdH1cblxuIFx0JHNjb3BlLmNoYW5nZVF1YW50aXR5PSBmdW5jdGlvbiAoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eShjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KTtcbiAgICAgICAgJHNjb3BlLmNhcnRDb250ZW50ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICB9O1xuXG4gICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG4gICRzY29wZS50b3RhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0b3RhbCA9IDA7XG4gICAgY2FydENvbnRlbnQuZm9yRWFjaChjYXJ0ID0+IHRvdGFsICs9IChjYXJ0LnByaWNlICogY2FydC5xdWFudGl0eSkpXG5cbiAgICByZXR1cm4gdG90YWw7ICBcbiAgfVxuIH0pXG5cbiAiLCIgXG4gYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcil7XG4gXHQkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiBcdFx0dXJsOicvY2FydCcsXG4gXHRcdHRlbXBsYXRlVXJsOidqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gXHRcdGNvbnRyb2xsZXI6J0NhcnRDdHJsJyxcbiBcdFx0cmVzb2x2ZTp7XG4gXHRcdFx0Y2FydENvbnRlbnQ6ZnVuY3Rpb24oQ2FydEZhY3Rvcnkpe1xuXG4gXHRcdFx0XHRyZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpO1xuICAgICAgICAgICAgXG4gXHRcdFx0fVxuIFx0XHR9ICAgXG4gXHR9KSAgICAgICAgICAgIFxuIH0pICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICIsImFwcC5jb250cm9sbGVyKCdDaGVja291dEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGl0ZW1zKVxuICAgICAgICAkc2NvcGUuaXRlbXMgPSBpdGVtcztcblxuICBcdFx0XHQvL2NhbGN1bGF0aW5nIHRvdGFsIHByaWNlIGFuZCBwdXQgdGhhdCBpbnRvICRzY29wZS50b3RhbFxuICAgICAgICB2YXIgaXRlbXNBcnIgPSBpdGVtcztcbiAgICAgICAgdmFyIHRvdGFsUHJpY2VFYWNoID0gW107XG4gICAgICAgIGl0ZW1zQXJyLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgIFx0dG90YWxQcmljZUVhY2gucHVzaChlbGVtZW50LnByaWNlICogZWxlbWVudC5xdWFudGl0eSk7XG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS50b3RhbCA9IHRvdGFsUHJpY2VFYWNoLnJlZHVjZSggKHByZXYsIGN1cnIpID0+IHByZXYgKyBjdXJyICk7XG4gICAgfSlcblxuICAgICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2hlY2tvdXQnLCB7XG4gICAgICAgIHVybDogJy9jaGVja291dCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY2hlY2tvdXQvY2hlY2tvdXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDaGVja291dEN0cmwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTsgICBcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudXNlcik7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc0FkbWluID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VyLmlzQWRtaW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3JpZXNDdHJsJywgZnVuY3Rpb24gKCRsb2csICRzY29wZSwgT3JkZXJIaXN0b3JpZXNGYWN0b3J5KSB7XG5cbiAgICBPcmRlckhpc3Rvcmllc0ZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyT3JkZXJzQXJyKSB7XG5cbiAgICAgICAgdXNlck9yZGVyc0Fyci5wYWlkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihhcnIsIGkpe1xuICAgICAgICAgICAgYXJyLmRhdGUgPSBuZXcgRGF0ZSh1c2VyT3JkZXJzQXJyLmRhdGVbaV0pLnRvU3RyaW5nKCk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgICAgICAkc2NvcGUudXNlck9yZGVycyA9IHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zO1xuICAgIH0pXG4gICAgLmNhdGNoKCRsb2cpO1xuICAgIFxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ29yZGVySGlzdG9yaWVzJywge1xuICAgICAgICB1cmw6ICcvaGlzdG9yaWVzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9oaXN0b3J5L29yZGVySGlzdG9yaWVzLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3JpZXNDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdhbmltYXRpb24nLCBmdW5jdGlvbiAoJHN0YXRlKSB7XG4gICAgdmFyIGFuaW1hdGlvbkVuZEV2ZW50cyA9ICd3ZWJraXRBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBtc0FuaW1hdGlvbkVuZCBhbmltYXRpb25lbmQnO1xuICAgIHZhciBjcmVhdGVDaGFyYWN0ZXJzID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAgICAgICAgYXNoOiBbXG4gICAgICAgICAgICAgICAgJ2FzaCcsXG4gICAgICAgICAgICAgICAgJ2FzaC1ncmVlbi1iYWcnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG90aGVyczogW1xuICAgICAgICAgICAgICAgICdqYW1lcycsXG4gICAgICAgICAgICAgICAgJ2Nhc3NpZHknLFxuICAgICAgICAgICAgICAgICdqZXNzaWUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WSAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCggTWF0aC5yYW5kb20oKSAqIDMgKSArIDI5KS50b0ZpeGVkKDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WiAoeSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDIwIC0geSkgKiAxMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmFuZG9tQ2hhcmFjdGVycyAod2hvKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyc1t3aG9dWyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogY2hhcmFjdGVyc1t3aG9dLmxlbmd0aCApIF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYWtlQ2hhcmFjdGVyICh3aG8pIHtcblxuICAgICAgICAgICAgdmFyIHhEZWxheSA9ICggd2hvID09PSAnYXNoJyApID8gNCA6IDQuODtcbiAgICAgICAgICAgIHZhciBkZWxheSA9ICctd2Via2l0LWFuaW1hdGlvbi1kZWxheTogJyArICggTWF0aC5yYW5kb20oKSAqIDIuNyArIHhEZWxheSApLnRvRml4ZWQoMykgKyAnczsnO1xuICAgICAgICAgICAgdmFyIGNoYXJhY3RlciA9IHJhbmRvbUNoYXJhY3RlcnMoIHdobyApO1xuICAgICAgICAgICAgdmFyIGJvdHRvbSA9IGdldFkoKTtcbiAgICAgICAgICAgIHZhciB5ID0gJ2JvdHRvbTogJysgYm90dG9tICsnJTsnO1xuICAgICAgICAgICAgdmFyIHogPSAnei1pbmRleDogJysgZ2V0WiggYm90dG9tICkgKyAnOyc7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBcInN0eWxlPSdcIitkZWxheStcIiBcIit5K1wiIFwiK3orXCInXCI7XG5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICtcbiAgICAgICAgICAgICAgICBcIjxpIGNsYXNzPSdcIiArIGNoYXJhY3RlciArIFwiIG9wZW5pbmctc2NlbmUnIFwiKyBzdHlsZSArIFwiPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8aSBjbGFzcz1cIiArIGNoYXJhY3RlciArIFwiLXJpZ2h0IFwiICsgXCJzdHlsZT0nXCIrIGRlbGF5ICsgXCInPjwvaT5cIiArXG4gICAgICAgICAgICAgICAgXCI8L2k+XCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXNoID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDE2ICkgKyAxNjtcbiAgICAgICAgdmFyIG90aGVycyA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiA4ICkgKyA4O1xuXG4gICAgICAgIHZhciBob3JkZSA9ICcnO1xuXG4gICAgICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGFzaDsgaSsrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ2FzaCcgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoIHZhciBqID0gMDsgaiA8IG90aGVyczsgaisrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ290aGVycycgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdodW1hbnMnKS5pbm5lckhUTUwgPSBob3JkZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicnVubmluZy1hbmltYXRpb25cIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUgb3BlbmluZy1zY2VuZVwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUtcmlnaHRcIj48L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJxdW90ZSBleGNsYW1hdGlvblwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzwvaT4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiaHVtYW5zXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICBjb21waWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbWFpbicpLmFkZENsYXNzKCdoZXJlJylcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQ2hhcmFjdGVycygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcG9zdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICQoJy5vcGVuaW5nLXNjZW5lJykuYWRkQ2xhc3MoJ21vdmUnKVxuICAgICAgICAgICAgICAgICAgICAkKCcubW92ZScpLm9uKGFuaW1hdGlvbkVuZEV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY29wZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVzZXQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0L3Bhc3N3b3JkLzp0b2tlbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcGFzc3dvcmQucmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBBdXRoRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAkc2NvcGUudG9rZW4gPSAkc3RhdGVQYXJhbXMudG9rZW47XG5cbiAgICAkc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoZW1haWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0NoZWNrIHlvdXIgZW1haWwnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBwYXNzd29yZCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkKHBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobG9naW5JbmZvKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJGxvZywgQ2FydEZhY3RvcnksIHRvdGFsQ29zdCwgYXJyYXlPZkl0ZW1zKXtcbiAgJHNjb3BlLmluZm8gPSB7fTtcbiAgXG4gICRzY29wZS52YWxpZGF0ZVVzZXI9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUuaW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLnNob3dDQyA9IHRydWU7XG4gICAgICAgIH0pLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgICAgIFxuICB9XG4gICRzY29wZS50b3RhbENvc3QgPSB0b3RhbENvc3Q7XG4gICRzY29wZS5hcnJheU9mSXRlbXMgPSBhcnJheU9mSXRlbXM7XG4gICRzY29wZS5zdHJpbmdPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0udGl0bGUpLmpvaW4oJywnKVxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXltZW50Jywge1xuICAgICAgICB1cmw6ICcvcGF5bWVudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcGF5bWVudC9wYXltZW50Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQYXltZW50Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICB0b3RhbENvc3Q6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QoKSB9LFxuICAgICAgICAgIGFycmF5T2ZJdGVtczogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKSB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHRoZVByb2R1Y3QsIGFsbFJldmlld3MsIFByb2R1Y3RGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuICAgIC8vIHByb2R1Y3RcbiAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgJHNjb3BlLnByb2R1Y3QgPSB0aGVQcm9kdWN0O1xuICAgICRzY29wZS5yZXZpZXdzID0gYWxsUmV2aWV3cztcbiAgICAvLyByZXZpZXdcbiAgICAkc2NvcGUubW9kYWxPcGVuID0gZmFsc2U7XG4gICAgJHNjb3BlLnN1Ym1pdFJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLm5ld1Jldmlldy5wcm9kdWN0SWQgPSAkc2NvcGUucHJvZHVjdC5pZDtcbiAgICAgICAgUHJvZHVjdEZhY3RvcnkuY3JlYXRlUmV2aWV3KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUubmV3UmV2aWV3KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZXZpZXdzID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cztcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhJywgMTAwMCk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gYWRkIHRvIGNhcnRcbiAgICAkc2NvcGUuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBDYXJ0RmFjdG9yeS5hZGRUb0NhcnQoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5xdWFudGl0eSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdUaGFuayB5b3UhIFlvdXIgaXRlbSB3YXMgYWRkZWQgdG8geW91ciBjYXJ0IScsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgJHNjb3BlLmFycmF5TWFrZXIgPSBmdW5jdGlvbiAobnVtKXtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PW51bTsgaSArKyl7XG4gICAgICAgICAgICBhcnIucHVzaChpKVxuICAgICAgICB9ICBcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9XG5cbn0pICAgXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIGF1dG9zY3JvbGw6ICd0cnVlJyxcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzpwcm9kdWN0SWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgdGhlUHJvZHVjdDogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hCeUlkKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFJldmlld3M6IGZ1bmN0aW9uKFByb2R1Y3RGYWN0b3J5LCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzKCRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICIsImFwcC5jb250cm9sbGVyKCdQcm9maWxlQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCBVc2VyRmFjdG9yeSwgJHN0YXRlKXtcblx0ICAgIFVzZXJGYWN0b3J5LmZldGNoT25lKClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICBjb25zb2xlLmxvZygnaGVsbG9vJyx1c2VyLmlkKVxuICAgICAgfSlcblxuICAgICAgJHNjb3BlLnVzZXIgPSB7fTtcbiAgXG4gICRzY29wZS5zYXZlVXNlckluZm89IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50KCRzY29wZS51c2VyKSAgICAgICBcbiAgfVxufSlcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZmlsZScsIHtcbiAgICAgICAgICAgICB1cmw6ICcvdXNlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvZmlsZS9wcm9maWxlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidQcm9maWxlQ3RybCcsXG4gICAgfSk7XG59KTtcbiAgICAgICAgICAgICAgICBcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zaWdudXAvc2lnbnVwLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU2lnbnVwQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbiAgYXBwLmNvbnRyb2xsZXIoJ1NpZ251cEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoRmFjdG9yeSwgJHN0YXRlKSB7XG4gICAgJHNjb3BlLnNpZ251cCA9IHt9OyBcbiAgICAkc2NvcGUuc2VuZFNpZ251cCA9IGZ1bmN0aW9uIChzaWdudXBJbmZvKSB7XG4gICAgICAgIEF1dGhGYWN0b3J5LnNpZ251cChzaWdudXBJbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gJ2VtYWlsIGV4aXN0cyBhbHJlYWR5Jykge1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVc2VyIGFscmVhZHkgZXhpc3RzJywgMjAwMCk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UgPT09ICdub3QgYSB2YWxpZCBlbWFpbCcpe1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdJdCBpcyBub3QgYSB2YWxpZCBlbWFpbCcsIDIwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdHbyBhaGVhZCBhbmQgbG9naW4nLCA0MDAwKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuICAgICRzY29wZS5nb29nbGVTaWdudXAgPSBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXA7XG59KTtcblxuXG4iLCJhcHAuY29udHJvbGxlcignU3RvcmVDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgcHJvZHVjdHMpIHtcbiAgICAkc2NvcGUucHJvZHVjdHMgPSBwcm9kdWN0cztcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdG9yZScsIHtcbiAgICAgICAgdXJsOiAnL3N0b3JlJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zdG9yZS9zdG9yZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0b3JlQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT3JkZXJIaXN0b3JpZXNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkQ2FydCA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL3BhaWQvJ1xuICAgIHZhciBvcmRlckhpc3Rvcmllc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZENhcnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuIFxuXG4gICAgcmV0dXJuIG9yZGVySGlzdG9yaWVzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnQXV0aEZhY3RvcnknLCAgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICB2YXIgQXV0aEZhY3RvcnkgPSB7fTtcblxuXG4gICAgQXV0aEZhY3Rvcnkuc2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKS50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXV0aC9nb29nbGUnKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBsb2dpbikge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3Jlc2V0L3Bhc3N3b3JkLycgKyB0b2tlbiwgbG9naW4pO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvZm9yZ290JywgZW1haWwpO1xuICAgIH1cblxuICAgIHJldHVybiBBdXRoRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0NhcnRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwLCAkbG9nLCAkc3RhdGUsICRyb290U2NvcGUpIHtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL2NhcnQvJztcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGl0ZW0uaW1hZ2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nICsgaXRlbS5wcm9kdWN0SWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHZhciBDYXJ0RmFjdG9yeSA9IHt9O1xuICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBbXTtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNvcnQoZnVuY3Rpb24gKGEsYil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuaWQgLSBhLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgndXBkYXRlQ2FydCcsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5kZWxldGVJdGVtID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgcHJvZHVjdElkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSB0aGlzLmNhY2hlZENhcnQuZmlsdGVyKGl0ZW0gPT4gaXRlbS5wcm9kdWN0SWQgPT09IHByb2R1Y3RJZCk7XG4gICAgICAgIHJldHVybiAoZHVwbGljYXRlLmxlbmd0aCkgPyBkdXBsaWNhdGVbMF0gOiBudWxsO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICBcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyhwcm9kdWN0SWQpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnlcbiAgICAgICAgICAgIC5jaGFuZ2VRdWFudGl0eShkdXBsaWNhdGUuaWQsIGR1cGxpY2F0ZS5xdWFudGl0eSwgJ2FkZCcsIHF1YW50aXR5ICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyBwcm9kdWN0SWQsIHtxdWFudGl0eTogcXVhbnRpdHl9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQ9ZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrb3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlKG9yZGVySWQpXG4gICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eT1mdW5jdGlvbihvcmRlcklkLCBxdWFudGl0eSwgYWRkT3JTdWJ0ciwgYW1vdW50ID0gMSl7XG4gICAgICAgIHZhciBydW5GdW5jPWZhbHNlO1xuICAgICAgICBpZiAoYWRkT3JTdWJ0cj09PSdhZGQnKSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHF1YW50aXR5Kz0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRPclN1YnRyPT09J3N1YnRyYWN0JyAmJiBxdWFudGl0eT4xKSB7XG4gICAgICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgICAgIHF1YW50aXR5LT0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVuRnVuYz09PXRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIG9yZGVySWQsIHtxdWFudGl0eTpxdWFudGl0eX0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkob3JkZXJJZCxxdWFudGl0eSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlID0gZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyLGkpe1xuICAgICAgICAgICAgaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSBpbmRleCA9IGk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5ID0gZnVuY3Rpb24gKG9yZGVySWQscXVhbnRpdHkpIHtcbiAgICAgICAgdmFyIGkgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZpbmRJbmRleChmdW5jdGlvbihvcmRlcil7XG4gICAgICAgICAgICAvLyBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIHtcbiAgICAgICAgICAgIC8vICAgICBvcmRlci5xdWFudGl0eSA9IHF1YW50aXR5O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgcmV0dXJuIG9yZGVyLmlkID09PSBvcmRlcklkO1xuICAgICAgICB9KTtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydFtpXS5xdWFudGl0eSA9IHF1YW50aXR5XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnb3JkZXJIaXN0b3JpZXMnKTtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKDAsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQubGVuZ3RoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH0gIFxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBhZGRSZW1vdmVBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgc2hha2UnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICBDYXJ0RmFjdG9yeS5maW5kT25lVXNlckluZm89ZnVuY3Rpb24oKXtcbiAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZCwgZGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5wdXNoKHJldmlldyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGxSZXZpZXdzID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHByb2R1Y3RJZClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5O1xuXG59KVxuIiwiLy90aGUgc2FtZSBhcyBiZWxvdyBidXQgbm90IHdvcmtpbmcgV1RGIVxuXG4vLyBhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcbi8vICAgICB2YXIgVXNlckZhY3RvcnkgPSB7fTtcblxuLy8gICAgIHZhciBjYWNoZWRVc2VycyA9IFtdO1xuLy8gICAgIHZhciBiYXNlVXJsID0gJy9hcGkvdXNlcnMvJztcbi8vICAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuLy8gICAgIFVzZXJGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbi8vICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcnMpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHVzZXJzLCBjYWNoZWRVc2Vycyk7IFxuLy8gICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vycy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4vLyAgICAgICAgICAgICAgICAgICAgIH0pXG4vLyAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2Vycztcbi8vICAgICAgICAgICAgICAgICB9KVxuLy8gICAgIH07XG5cblxuLy8gICBVc2VyRmFjdG9yeS5mZXRjaE9uZSA9IGZ1bmN0aW9uKCkge1xuLy8gICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4vLyAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuLy8gICB9O1xuXG5cbi8vICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4vLyAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArIGlkLCBkYXRhKVxuLy8gICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4vLyAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbi8vICAgICAgICAgICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbi8vICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4vLyAgICAgICAgICAgICAgICAgfSlcbi8vICAgICB9ICBcblxuLy8gICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAoaWQpIHtcbi8vICAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuLy8gICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbi8vICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgY2FjaGVkVXNlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuLy8gICAgICAgICB9KTtcbi8vICAgICB9XG5cbi8vICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCA9IGZ1bmN0aW9uIChpbmZvT2JqKXtcbi8vICAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbi8vICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4vLyAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbi8vICAgICAgICAgICAgICAgICBpZih1c2VyLmlkID09PSAnc2Vzc2lvbicpe1xuLy8gICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVTZXNzaW9uQ2FydCcsIGluZm9PYmopXG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIGVsc2V7XG4vLyAgICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIodXNlci5pZCxpbmZvT2JqKVxuLy8gICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlVXNlckNhcnQnLCBpbmZvT2JqKVxuLy8gICAgICAgICAgICAgICAgICAgICB9KVxuLy8gICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIH0pXG4vLyAgICAgfVxuXG5cblxuXG4vLyAgICAgcmV0dXJuIFVzZXJGYWN0b3J5O1xuLy8gfSlcblxuYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG4gICAgdmFyIFVzZXJGYWN0b3J5ID0ge307XG5cbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuICAgICAgVXNlckZhY3RvcnkuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgfTtcblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnNbdXBkYXRlZEluZF0gPSB1c2VyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlcjtcbiAgICAgICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgaWQpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlcnMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCA9IGZ1bmN0aW9uIChpbmZvT2JqKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgICAgICBpZih1c2VyLmlkID09PSAnc2Vzc2lvbicpe1xuICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVTZXNzaW9uQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXIodXNlci5pZCxpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlVXNlckNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIFVzZXJGYWN0b3J5O1xufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgnc2hvcHBpbmdDYXJ0JywgZnVuY3Rpb24oQ2FydEZhY3RvcnksICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgYWN0aXZlOiAnPScsXG4gICAgICAgICAgICBhZGRBbmRSZXZlYWxDYXJkOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgLy8gc2NvcGU6IHsgc2V0Rm46ICcmJyB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKS50aGVuKGZ1bmN0aW9uIChjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCd1cGRhdGVDYXJ0JywgZnVuY3Rpb24gKGV2ZW50LCBjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IGNhcnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgc2NvcGUucmV2ZWFsQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCBjaGVja291dC0tYWN0aXZlJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5oaWRlQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5hY3RpdmUgPSAnaW5hY3RpdmUnO1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgICAgICAgICBpZihzY29wZS5jYXJ0KVxuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlICogaXRlbS5xdWFudGl0eSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIC8vIHNjb3BlLnNldEZuKHt0aGVEaXJGbjogc2NvcGUudXBkYXRlTWFwfSk7XG5cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Nob3AnLCBzdGF0ZTogJ3N0b3JlJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVMb2dvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjk3cHggLTMwNnB4JylcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51bnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjkzcHggLTlweCcpXG5cbiAgICAgICAgICAgIH0gICBcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldEFkbWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEF1dGhJbnRlcmNlcHRvcik7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5hZG1pbiA9IEF1dGhTZXJ2aWNlLmlzQWRtaW4odXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG4gICAgICAgICAgICBzZXRBZG1pbigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0ZCbGlrZScsIFtcbiAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4gICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4gICAgICAgICAgICAgIE5hbWU6IFwiUG9rZW1hcnRcIixcbiAgICAgICAgICAgICAgSW1hZ2VVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgXSk7ICAgICIsImFuZ3VsYXIubW9kdWxlKCdhbmd1bGlrZScpXG4gICAgLmRpcmVjdGl2ZSgnZmJMaWtlJywgW1xuICAgICAgICAnJHdpbmRvdycsICckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOidGQmxpa2UnLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIGZiTGlrZTogJz0/J1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAvLyBhdHRycy5mYkxpa2U9bXlNb2RlbC5Vcmw7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5GQikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBGYWNlYm9vayBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5pbml0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGZibWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICd2Mi4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9ICAgXG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckxpa2VCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5mYkxpa2UgJiYgIXNjb3BlLmZiTGlrZSAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ2ZiTGlrZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImZiLWxpa2VcIicgKyAoISFzY29wZS5mYkxpa2UgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5mYkxpa2UgKyAnXCInIDogJycpICsgJyBkYXRhLWxheW91dD1cImJ1dHRvbl9jb3VudFwiIGRhdGEtYWN0aW9uPVwibGlrZVwiIGRhdGEtc2hvdy1mYWNlcz1cInRydWVcIiBkYXRhLXNoYXJlPVwidHJ1ZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuWEZCTUwucGFyc2UoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiYXBwLmRpcmVjdGl2ZSgncGluSXQnLCBbXG4gICAgICAgICckd2luZG93JywgJyRsb2NhdGlvbicsXG4gICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBwaW5JdDogJz0nLFxuICAgICAgICAgICAgICAgICAgICBwaW5JdEltYWdlOiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHBpbkl0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6J1BpbnRDdHJsJyxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgUGludGVyZXN0IFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnU0NSSVBUJylbMF0sIHAgPSBkLmNyZWF0ZUVsZW1lbnQoJ1NDUklQVCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAudHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuc3JjID0gJy8vYXNzZXRzLnBpbnRlcmVzdC5jb20vanMvcGluaXQuanMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBbJ2RhdGEtcGluLWJ1aWxkJ10gPSAncGFyc2VQaW5zJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHAub25sb2FkLCAxMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHAsIGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSgkd2luZG93LmRvY3VtZW50KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gXG4gICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclBpbkl0QnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS5waW5JdCAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ3Bpbkl0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiLy93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPScgKyAoc2NvcGUucGluSXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICcmbWVkaWE9JyArIHNjb3BlLnBpbkl0SW1hZ2UgKyAnJmRlc2NyaXB0aW9uPScgKyBzY29wZS5waW5JdCArICdcIiBkYXRhLXBpbi1kbz1cImJ1dHRvblBpblwiIGRhdGEtcGluLWNvbmZpZz1cImJlc2lkZVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LnBhcnNlUGlucyhlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCIvLyBhcHAuY29udHJvbGxlcignVHdpdHRlckN0cmwnLCBbXG4vLyAgICAgICAnJHNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSkge1xuLy8gICAgICAgICAgICRzY29wZS5teU1vZGVsID0ge1xuLy8gICAgICAgICAgICAgICBVcmw6ICdodHRwOi8vcG9rZW1hcnQtZnNhLmhlcm9rdWFwcC5jb20nLFxuLy8gICAgICAgICAgICAgICBOYW1lOiBcIlBva2VtYXJ0XCIsXG4vLyAgICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuLy8gICAgICAgICAgIH07XG4vLyAgICAgICB9XG4vLyAgIF0pOyAgICAiLCJhcHAuZGlyZWN0aXZlKCd0d2VldCcsIFtcbiAgICAgICAgJyR3aW5kb3cnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgZnVuY3Rpb24gKCR3aW5kb3csICRsb2NhdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR3ZWV0OiAnPScsXG4gICAgICAgICAgICAgICAgICAgIHR3ZWV0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNvbnRyb2xsZXI6J1R3aXR0ZXJDdHJsJyxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy50d3R0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBUd2l0dGVyIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL3BsYXRmb3JtLnR3aXR0ZXIuY29tL3dpZGdldHMuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuIFxuICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJUd2VldEJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHdlZXQgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCd0d2VldCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiaHR0cHM6Ly90d2l0dGVyLmNvbS9zaGFyZVwiIGNsYXNzPVwidHdpdHRlci1zaGFyZS1idXR0b25cIiBkYXRhLXRleHQ9XCInICsgc2NvcGUudHdlZXQgKyAnXCIgZGF0YS11cmw9XCInICsgKHNjb3BlLnR3ZWV0VXJsIHx8ICRsb2NhdGlvbi5hYnNVcmwoKSkgKyAnXCI+VHdlZXQ8L2E+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy50d3R0ci53aWRnZXRzLmxvYWQoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7ICAgIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCdvYXV0aEJ1dHRvbicsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgcHJvdmlkZXJOYW1lOiAnQCdcbiAgICB9LFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ29yZGVyRW50cnknLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBvcmRlckRldGFpbHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAocywgZSwgYSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocy5vcmRlckRldGFpbHMpO1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckhpc3RvcnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblxufSkiLCJhcHAuZGlyZWN0aXZlKCdvcmRlckhpc3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBoaXN0b3JpZXM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3J5Q3RybCdcbiAgIFxuICAgIH1cblxufSlcbiAgIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0RW50cnknLCBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtZW50cnkvcHJvZHVjdC1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHByb2R1Y3Q6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdFVwZGF0ZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmRlbGV0ZVByb2R1Y3QoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIvLyBhcHAuZGlyZWN0aXZlKCdzdGFyUmF0aW5nJywgZnVuY3Rpb24gKCkge1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICByZXN0cmljdDogJ0VBJyxcbi8vICAgICAgIHRlbXBsYXRlOlxuLy8gICAgICAgICAnPHNwYW4gY2xhc3M9XCJzdGFyc1wiPicgK1xuLy8gICAgICAgICAgJzxkaXYgY2xhc3M9XCJzdGFycy1maWxsZWQgbGVmdFwiPicgK1xuLy8gICAgICAgICAgICAgJzxzcGFuPuKYhTwvc3Bhbj4nICtcbi8vICAgICAgICAgICc8L2Rpdj4nICtcbi8vICAgICAgICc8L3NwYW4+J1xuLy8gICAgIH07XG4vLyB9KVxuIiwiIC8vIGFwcC5jb250cm9sbGVyKCdTZWFyY2hCYXJDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcbiAvLyBcdCRzY29wZS5wcm9kdWN0PVxuIC8vIH0pIiwiYXBwLmRpcmVjdGl2ZSgnc2VhcmNoQmFyJywgZnVuY3Rpb24oKXtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDonRScsXG5cdFx0dGVtcGxhdGVVcmw6J2pzL2NvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5odG1sJyxcblx0XHRjb250cm9sbGVyOidQcm9kdWN0Q2FyZEN0cmwnXG5cdH1cbn0pXG5cbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJFbnRyeScsIGZ1bmN0aW9uIChVc2VyRmFjdG9yeSwgQXV0aEZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgICAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoe2VtYWlsOiBlbWFpbH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRG9uZScsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXIgPSBmdW5jdGlvbiAodXNlcklkKSB7XG4gICAgICAgICAgICAgICAgIFVzZXJGYWN0b3J5LmRlbGV0ZVVzZXIodXNlcklkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0VyYXNlIGZyb20gcGxhbmV0IEVhcnRoJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlck9yZGVyJywgZnVuY3Rpb24gKE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3VzZXItb3JkZXIvdXNlci1vcmRlci5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIHVzZXJPcmRlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS51cGRhdGVTdGF0dXMoaWQsIHNjb3BlLm5nTW9kZWwpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgTWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIoaWQpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsIlxuYXBwLmRpcmVjdGl2ZSgnY2xpY2tBbnl3aGVyZUJ1dEhlcmUnLCBmdW5jdGlvbigkZG9jdW1lbnQpe1xuICByZXR1cm4ge1xuICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgY2xpY2tBbnl3aGVyZUJ1dEhlcmU6ICcmJ1xuICAgICAgICAgICB9LFxuICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsLCBhdHRyKSB7XG5cbiAgICAgICAgICAgICAgICQoJy5sb2dvJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAkZG9jdW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQuaWQgIT09ICdjYXJ0LWljb24nICYmIGUudGFyZ2V0LmlkICE9PSAnYWRkLXRvLWNhcnQtYnV0dG9uJykge1xuICAgICAgICAgICAgICAgICAgIGlmIChlbCAhPT0gZS50YXJnZXQgJiYgIWVsWzBdLmNvbnRhaW5zKGUudGFyZ2V0KSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZXZhbChzY29wZS5jbGlja0FueXdoZXJlQnV0SGVyZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgfVxuICAgICAgICB9XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
