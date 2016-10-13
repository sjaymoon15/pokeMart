'use strict';

window.app = angular.module('FullstackGeneratedApp', ['angulike', 'fsaPreBuilt', 'ngPassword', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ui.materialize', 'angular-input-stars', 'angular-stripe']);

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

    var app = angular.module('fsaPreBuilt', ['angulike', 'fsaPreBuilt', 'ngPassword', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'ui.materialize', 'angular-input-stars', 'angular-stripe']);

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

app.controller('OrderHistoriesCtrl', function ($log, $scope, OrderHistoriesFactory, CartFactory) {

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
app.controller('PaymentCtrl', function ($scope, UserFactory, $state, $log, CartFactory, totalCost, arrayOfItems) {
    $scope.info = {};

    $scope.validateUser = function () {

        UserFactory.updateUserBeforePayment($scope.info).then(function () {
            $scope.showCC = true;
        }).catch($log.error);
    };
    $scope.edit = function () {
        $state.go('cart');
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

app.controller('ProfileCtrl', function ($scope, UserFactory, $state) {
    UserFactory.fetchOne().then(function (user) {
        $scope.user = user;
    }).catch(function () {
        Materialize.toast('Something went wrong', 1000);
    });

    $scope.user = {};
    $scope.reviews = {};

    $scope.saveUserInfo = function () {
        UserFactory.updateUserBeforePayment($scope.user).then(function () {
            Materialize.toast('You successfully updated your profile!', 1000);
        }).catch(function () {
            Materialize.toast('Something went wrong', 1000);
        });
    };
    $scope.dontSaveInfo = function () {
        $state.go('store');
    };
    $scope.showReviews = function () {
        UserFactory.fetchOneReview().then(function (reviews) {
            console.log("helloooo", reviews);
            $scope.reviews = reviews;
        });
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
            } else if (response === 'passwords do not match') {
                Materialize.toast('Your passwords do not match. Please try again!', 2000);
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
    UserFactory.cachedReviews = [];
    var cachedUsers = [];
    var test = [];
    var baseUrl = '/api/users/';
    var getData = function getData(res) {
        return res.data;
    };
    var parseTimeStr = function parseTimeStr(review) {
        var date = review.createdAt.substr(0, 10);
        review.date = date;
        return review;
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

    UserFactory.fetchOneReview = function () {
        return $http.get(baseUrl + 'getLoggedInUserId').then(getData).then(function (user) {
            return $http.get('/api/reviews/' + user.id + '/reviews').then(function (response) {
                angular.copy(response.data, UserFactory.cachedReviews);
                return UserFactory.cachedReviews.map(parseTimeStr);
            });
        });
    };
    return UserFactory;
});

app.controller('angulikeCtrl', ['$scope', function ($scope) {
    $scope.myModel = {
        Url: 'http://pokemart-fsa.herokuapp.com',
        Name: "Pokemart",
        ImageUrl: 'http://pokemart-fsa.herokuapp.com'
    };
}]);

(function () {
    angular.module('angulike', []).directive('fbLike', ['$window', '$rootScope', function ($window, $rootScope) {
        return {
            restrict: 'A',
            scope: {
                fbLike: '=?'
            },

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
    }]).directive('googlePlus', ['$window', function ($window) {
        return {
            restrict: 'A',
            scope: {
                googlePlus: '=?'
            },

            link: function link(scope, element, attrs) {
                if (!$window.gapi) {
                    // Load Google SDK if not already loaded
                    $.getScript('//apis.google.com/js/platform.js', function () {
                        renderPlusButton();
                    });
                } else {
                    renderPlusButton();
                }

                var watchAdded = false;
                function renderPlusButton() {
                    if (!!attrs.googlePlus && !scope.googlePlus && !watchAdded) {
                        // wait for data if it hasn't loaded yet
                        watchAdded = true;
                        var unbindWatch = scope.$watch('googlePlus', function (newValue, oldValue) {
                            if (newValue) {
                                renderPlusButton();

                                // only need to run once
                                unbindWatch();
                            }
                        });
                        return;
                    } else {
                        element.html('<div class="g-plusone"' + (!!scope.googlePlus ? ' data-href="' + scope.googlePlus + '"' : '') + ' data-size="medium"></div>');
                        $window.gapi.plusone.go(element.parent()[0]);
                    }
                }
            }
        };
    }]).directive('tweet', ['$window', '$location', function ($window, $location) {
        return {
            restrict: 'A',
            scope: {
                tweet: '=',
                tweetUrl: '='
            },

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
    }]).directive('pinIt', ['$window', '$location', function ($window, $location) {
        return {
            restrict: 'A',
            scope: {
                pinIt: '=',
                pinItImage: '=',
                pinItUrl: '='
            },

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
})();

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
            scope.admin = null;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJsb2dpbi9sb2dpbi5qcyIsImhvbWUvYW5pbWF0aW9uLmRpcmVjdGl2ZS5qcyIsImhvbWUvaG9tZS5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvYW5ndWxpa2UuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2FuZ3VsaWtlL2FuZ3VsaWtlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmV2aWV3LWVudHJ5L3N0YXItcmF0aW5nLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXRpbGl0eS9jbGlja0FueXdoZXJlQnV0SGVyZS5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFVBQUEsRUFBQSxhQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLGdCQUFBLEVBQUEscUJBQUEsRUFBQSxnQkFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEscUJBQUEsRUFBQSxjQUFBLEVBQUE7QUFDQTtBQUNBLHNCQUFBLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQSx1QkFBQSxTQUFBLENBQUEsR0FBQTtBQUNBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxLQUZBO0FBR0EsMEJBQUEsZUFBQTs7QUFFQTtBQUVBLENBYkE7O0FBZUE7QUFDQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsSUFBQSxNQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0EsZUFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw2QkFBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFlBQUEsWUFBQSxlQUFBLEVBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsY0FBQSxjQUFBOztB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QTtBQUtBLDBCQUFBLHdCQUxBO0FBTUEsdUJBQUE7QUFOQSxLQUFBOztBQVNBLFFBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsYUFBQTtBQUNBLGlCQUFBLFlBQUEsZ0JBREE7QUFFQSxpQkFBQSxZQUFBLGFBRkE7QUFHQSxpQkFBQSxZQUFBLGNBSEE7QUFJQSxpQkFBQSxZQUFBO0FBSkEsU0FBQTtBQU1BLGVBQUE7QUFDQSwyQkFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwyQkFBQSxVQUFBLENBQUEsV0FBQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUE7QUFDQSx1QkFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUE7QUFDQTtBQUpBLFNBQUE7QUFNQSxLQWJBOztBQWVBLFFBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0Esc0JBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBREEsRUFFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFVBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUE7QUFDQSxTQUpBLENBQUE7QUFNQSxLQVBBOztBQVNBLFFBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsaUJBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxPQUFBLFNBQUEsSUFBQTtBQUNBLG9CQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsRUFBQSxLQUFBLElBQUE7QUFDQSx1QkFBQSxVQUFBLENBQUEsWUFBQSxZQUFBO0FBQ0E7QUFDQSxtQkFBQSxLQUFBLElBQUE7QUFDQTs7QUFFQSxhQUFBLE9BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsT0FBQTtBQUNBLFNBRkE7O0FBSUE7QUFDQTtBQUNBLGFBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsUUFBQSxJQUFBO0FBQ0EsU0FGQTs7QUFJQSxhQUFBLGVBQUEsR0FBQSxVQUFBLFVBQUEsRUFBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLGdCQUFBLEtBQUEsZUFBQSxNQUFBLGVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsR0FBQSxJQUFBLENBQUEsUUFBQSxJQUFBLENBQUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsS0FBQSxDQUFBLFlBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFGQSxDQUFBO0FBSUEsU0FyQkE7O0FBdUJBLGFBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsbUJBQUEsTUFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsaUJBREEsRUFFQSxLQUZBLENBRUEsWUFBQTtBQUNBLHVCQUFBLEdBQUEsTUFBQSxDQUFBLEVBQUEsU0FBQSw0QkFBQSxFQUFBLENBQUE7QUFDQSxhQUpBLENBQUE7QUFLQSxTQU5BOztBQVFBLGFBQUEsTUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxPQUFBO0FBQ0EsMkJBQUEsVUFBQSxDQUFBLFlBQUEsYUFBQTtBQUNBLGFBSEEsQ0FBQTtBQUlBLFNBTEE7QUFPQSxLQTFEQTs7QUE0REEsUUFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxZQUFBLE9BQUEsSUFBQTs7QUFFQSxtQkFBQSxHQUFBLENBQUEsWUFBQSxnQkFBQSxFQUFBLFlBQUE7QUFDQSxpQkFBQSxPQUFBO0FBQ0EsU0FGQTs7QUFJQSxtQkFBQSxHQUFBLENBQUEsWUFBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLGlCQUFBLE9BQUE7QUFDQSxTQUZBOztBQUlBLGFBQUEsRUFBQSxHQUFBLElBQUE7QUFDQSxhQUFBLElBQUEsR0FBQSxJQUFBOztBQUVBLGFBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsR0FBQSxTQUFBO0FBQ0EsaUJBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxTQUhBOztBQUtBLGFBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxpQkFBQSxFQUFBLEdBQUEsSUFBQTtBQUNBLGlCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsU0FIQTtBQUtBLEtBekJBO0FBMkJBLENBeklBOztBQ0FBLElBQUEsVUFBQSxDQUFBLG9CQUFBLEVBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLHFCQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLDBCQUFBLFFBQUEsR0FDQSxJQURBLENBQ0EsVUFBQSxhQUFBLEVBQUE7O0FBRUEsc0JBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLEdBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxnQkFBQSxJQUFBLEdBQUEsSUFBQSxJQUFBLENBQUEsY0FBQSxJQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsU0FGQTs7QUFJQSxlQUFBLFVBQUEsR0FBQSxjQUFBLFNBQUE7QUFDQSxLQVJBLEVBU0EsS0FUQSxDQVNBLElBVEE7QUFXQSxDQWJBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLGdCQUFBLEVBQUE7QUFDQSxhQUFBLFlBREE7QUFFQSxxQkFBQSxnQ0FGQTtBQUdBLG9CQUFBOztBQUhBLEtBQUE7QUFNQSxDQVBBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLG1CQUFBLEtBQUEsQ0FBQSxPQUFBLEVBQUE7QUFDQSxhQUFBLFFBREE7QUFFQSxxQkFBQSxxQkFGQTtBQUdBLG9CQUFBO0FBSEEsS0FBQTs7QUFNQSxtQkFBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxRQURBO0FBRUEscUJBQUEscUJBRkE7QUFHQSxvQkFBQTtBQUhBLEtBQUE7O0FBTUEsbUJBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLGFBQUEsd0JBREE7QUFFQSxxQkFBQSw4QkFGQTtBQUdBLG9CQUFBO0FBSEEsS0FBQTtBQU1BLENBcEJBOztBQXNCQSxJQUFBLFVBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxXQUFBLEtBQUEsR0FBQSxFQUFBO0FBQ0EsV0FBQSxLQUFBLEdBQUEsSUFBQTtBQUNBLFdBQUEsS0FBQSxHQUFBLGFBQUEsS0FBQTs7QUFFQSxXQUFBLGNBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLGNBQUEsQ0FBQSxLQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsa0JBQUEsRUFBQSxJQUFBO0FBQ0EsU0FGQTtBQUdBLEtBSkE7QUFLQSxXQUFBLGFBQUEsR0FBQSxVQUFBLEtBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxhQUFBLENBQUEsUUFBQSxFQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBLE9BQUE7QUFDQSxTQUZBO0FBR0EsS0FKQTs7QUFNQSxXQUFBLFNBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTs7QUFFQSxlQUFBLEtBQUEsR0FBQSxJQUFBOztBQUVBLG9CQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxtQkFBQSxZQUFBLGdCQUFBLEVBQUE7QUFDQSxTQUZBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsRUFBQSxDQUFBLE9BQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsU0FBQTtBQUNBLFNBTEEsRUFLQSxLQUxBLENBS0EsWUFBQTtBQUNBLG1CQUFBLEtBQUEsR0FBQSw0QkFBQTtBQUNBLFNBUEE7QUFTQSxLQWJBO0FBZUEsQ0FoQ0E7O0FDdEJBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLFFBQUEscUJBQUEsOERBQUE7QUFDQSxRQUFBLG1CQUFBLFNBQUEsZ0JBQUEsR0FBQTtBQUNBLFlBQUEsYUFBQTtBQUNBLGlCQUFBLENBQ0EsS0FEQSxFQUVBLGVBRkEsQ0FEQTtBQUtBLG9CQUFBLENBQ0EsT0FEQSxFQUVBLFNBRkEsRUFHQSxRQUhBO0FBTEEsU0FBQTs7QUFZQSxpQkFBQSxJQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLGdCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsV0FBQSxHQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsV0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxhQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsUUFBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLDhCQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsR0FBQSxHQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLFlBQUEsaUJBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsU0FBQSxNQUFBO0FBQ0EsZ0JBQUEsSUFBQSxhQUFBLE1BQUEsR0FBQSxJQUFBO0FBQ0EsZ0JBQUEsSUFBQSxjQUFBLEtBQUEsTUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLGdCQUFBLFFBQUEsWUFBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7O0FBRUEsbUJBQUEs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QUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsYUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEscUJBQUEsS0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFDQSxDQXhCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsVUFBQSxtQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxtQkFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsS0FIQTtBQUlBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsZ0JBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSxTQU5BLEVBT0EsSUFQQSxDQU9BLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsU0FYQSxDQUFBO0FBWUEsS0FiQTs7QUFlQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLGdCQUFBLGtCQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLFlBQUEsS0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBO0FBQUEsbUJBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQTtBQUFBLFNBQUEsQ0FBQTtBQUNBLGVBQUEsVUFBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsWUFBQSxZQUFBLGtCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxZQUNBLGNBREEsQ0FDQSxVQUFBLEVBREEsRUFDQSxVQUFBLFFBREEsRUFDQSxLQURBLEVBQ0EsUUFEQSxDQUFBO0FBRUEsU0FIQSxNQUdBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsT0FBQSxTQUFBLElBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFMQSxDQUFBO0FBTUE7QUFDQTtBQUNB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REEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsZUFBQSxTQUFBLFlBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxZQUFBLE9BQUEsT0FBQSxTQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQSxFQUFBLENBQUE7QUFDQSxlQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsZUFBQSxNQUFBO0FBQ0EsS0FKQTs7QUFNQSxRQUFBLGlCQUFBLEVBQUE7QUFDQSxtQkFBQSxjQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGFBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQUEsSUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEdBQUEsQ0FBQSxlQUFBLE9BQUEsQ0FBQTtBQUNBLFNBSEEsRUFHQSxJQUhBLENBR0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsUUFBQSxFQUFBLGVBQUEsY0FBQSxFQURBLENBQ0E7QUFDQSwyQkFBQSxjQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxlQUFBLGNBQUE7QUFDQSxTQVRBLENBQUE7QUFVQSxLQVhBOztBQWFBLG1CQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsRUFHQSxJQUhBLENBR0EsVUFBQSxPQUFBLEVBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsU0FBQSxFQUFBLElBQUE7QUFDQSxnQkFBQSxhQUFBLGVBQUEsY0FBQSxDQUFBLFNBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLHVCQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSwyQkFBQSxjQUFBLENBQUEsVUFBQSxJQUFBLE9BQUE7QUFDQSxtQkFBQSxPQUFBO0FBQ0EsU0FWQSxDQUFBO0FBV0EsS0FaQTs7QUFjQSxtQkFBQSxhQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxFQUFBLE9BQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBO0FBQ0EsZ0JBQUEsYUFBQSxlQUFBLGNBQUEsQ0FBQSxTQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0EsMkJBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTkEsQ0FBQTtBQU9BLEtBUkE7O0FBVUEsbUJBQUEsU0FBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxlQUFBLE9BRkEsQ0FBQTtBQUlBLEtBTEE7O0FBT0EsbUJBQUEsT0FBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsUUFBQSxFQUFBLEdBQUEsUUFBQTtBQUNBLGVBQUEsT0FBQTtBQUNBLEtBSEE7O0FBS0EsbUJBQUEsWUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEsa0JBQUEsU0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxTQUFBLGFBQUEsU0FBQSxJQUFBLENBQUE7QUFDQSwyQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLE1BQUE7QUFDQSxtQkFBQSxNQUFBO0FBQ0EsU0FMQSxDQUFBO0FBTUEsS0FQQTs7QUFTQSxtQkFBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGtCQUFBLFNBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxvQkFBQSxJQUFBLENBQUEsU0FBQSxJQUFBLEVBQUEsZUFBQSxhQUFBO0FBQ0EsbUJBQUEsZUFBQSxhQUFBLENBQUEsR0FBQSxDQUFBLFlBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQUtBLEtBTkE7O0FBUUEsV0FBQSxjQUFBO0FBRUEsQ0FuRkE7O0FDQUEsSUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxjQUFBLEVBQUE7QUFDQSxnQkFBQSxhQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsUUFBQSxPQUFBLEVBQUE7QUFDQSxRQUFBLFVBQUEsYUFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUE7QUFBQSxlQUFBLElBQUEsSUFBQTtBQUFBLEtBQUE7QUFDQSxRQUFBLGVBQUEsU0FBQSxZQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxPQUFBLE9BQUEsU0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUEsRUFBQSxDQUFBO0FBQ0EsZUFBQSxJQUFBLEdBQUEsSUFBQTtBQUNBLGVBQUEsTUFBQTtBQUNBLEtBSkE7O0FBTUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxLQUFBLEVBQUEsV0FBQSxFQURBLENBQ0E7QUFDQSx3QkFBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBLG1CQUFBLFdBQUE7QUFDQSxTQVBBLENBQUE7QUFRQSxLQVRBO0FBVUEsZ0JBQUEsUUFBQSxHQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsbUJBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxDQUFBO0FBRUEsS0FIQTs7QUFLQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxnQkFBQSxhQUFBLFlBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLHdCQUFBLFVBQUEsSUFBQSxJQUFBO0FBQ0EsbUJBQUEsSUFBQTtBQUNBLFNBUkEsQ0FBQTtBQVNBLEtBVkE7O0FBWUEsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsRUFBQSxPQUFBLENBQUEsWUFBQTtBQUNBLGdCQUFBLGFBQUEsWUFBQSxTQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBO0FBQ0EsYUFGQSxDQUFBO0FBR0Esd0JBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxDQUFBO0FBQ0EsU0FMQSxDQUFBO0FBTUEsS0FQQTs7QUFTQSxnQkFBQSx1QkFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLG1CQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFFQSxJQUZBLENBRUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxnQkFBQSxLQUFBLEVBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSx1QkFBQSxNQUFBLEdBQUEsQ0FBQSxtQ0FBQSxFQUFBLE9BQUEsQ0FBQTtBQUNBLGFBRkEsTUFHQTtBQUNBLHVCQUFBLFlBQUEsVUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLE9BQUEsRUFD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RUFBQSxFQUFBO0FBQ0Esb0NBQUEsZUFBQSxDQUFBLEVBQUE7QUFDQSxhQUZBO0FBR0E7QUFkQSxLQUFBO0FBZ0JBLENBakJBOztBQ0NBLElBQUEsU0FBQSxDQUFBLHNCQUFBLEVBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLGVBQUE7QUFDQSxrQ0FBQTtBQURBLFNBRkE7QUFLQSxjQUFBLGNBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsY0FBQSxPQUFBLEVBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLGVBQUE7QUFDQSxhQUZBOztBQU1BLHNCQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxvQkFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsV0FBQSxJQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUEsS0FBQSxvQkFBQSxFQUFBO0FBQ0Esd0JBQUEsT0FBQSxFQUFBLE1BQUEsSUFBQSxDQUFBLEdBQUEsQ0FBQSxFQUFBLFFBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQ0EsOEJBQUEsTUFBQSxDQUFBLFlBQUE7O0FBRUEsa0NBQUEsS0FBQSxDQUFBLE1BQUEsb0JBQUE7QUFDQSx5QkFIQTtBQUlBO0FBQ0E7QUFDQSxhQVRBO0FBV0E7QUF4QkEsS0FBQTtBQTBCQSxDQTNCQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCAnbmdQYXNzd29yZCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZScsICd1aS5tYXRlcmlhbGl6ZScsICdhbmd1bGFyLWlucHV0LXN0YXJzJywnYW5ndWxhci1zdHJpcGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICR1aVZpZXdTY3JvbGxQcm92aWRlcixzdHJpcGVQcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xuICAgICR1aVZpZXdTY3JvbGxQcm92aWRlci51c2VBbmNob3JTY3JvbGwoKTtcblxuICAgIC8vIHN0cmlwZVByb3ZpZGVyLnNldFB1Ymxpc2hhYmxlS2V5KCdteV9rZXknKTtcblxufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHsgIFxuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICAkcm9vdFNjb3BlLmZhY2Vib29rQXBwSWQgPSAnOTQxMDM4MjgyNjg2MjQyJztcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7IiwiXG5hcHAuY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgYWxsVXNlck9yZGVycywgJGxvZywgYWxsUHJvZHVjdHMsIGFsbFVzZXJzLCBhbGxPcmRlckRldGFpbHMsIE1hbmFnZU9yZGVyc0ZhY3RvcnkpIHtcblxuICAgICRzY29wZS5wcm9kdWN0cyA9IGFsbFByb2R1Y3RzO1xuICAgICRzY29wZS51c2VycyA9IGFsbFVzZXJzO1xuICAgICRzY29wZS51c2VyT3JkZXJzID0gYWxsVXNlck9yZGVycztcblxuICAgIC8vYWRkaW5nIHN0YXR1cyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kU3RhdHVzKG9yZGVyRGV0YWlsLnVzZXJPcmRlcklkKVxuICAgIFx0LnRoZW4oZnVuY3Rpb24oc3RhdHVzKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwuc3RhdHVzID0gc3RhdHVzO1xuICAgIFx0fSkuY2F0Y2goJGxvZy5lcnJvcik7XG4gICAgfSlcblxuICAgIC8vYWRkaW5nIHVzZXIgaW5mbyB0byBlYWNoIG9yZGVyRGV0YWlsXG4gICAgYWxsT3JkZXJEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24ob3JkZXJEZXRhaWwpe1xuICAgIFx0TWFuYWdlT3JkZXJzRmFjdG9yeS5maW5kVXNlcihvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIFx0XHRvcmRlckRldGFpbC51c2VyID0gdXNlcjtcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG4gICAgYWxsT3JkZXJEZXRhaWxzID0gYWxsT3JkZXJEZXRhaWxzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEudXNlck9yZGVySWQgLSBiLnVzZXJPcmRlcklkO1xuICAgIH0pO1xuICAgIGFsbE9yZGVyRGV0YWlscyA9IF8uZ3JvdXBCeShhbGxPcmRlckRldGFpbHMsICd1c2VyT3JkZXJJZCcpXG4gICAgJHNjb3BlLm9yZGVycyA9ICQubWFwKGFsbE9yZGVyRGV0YWlscyxmdW5jdGlvbiAob3JkZXIsIGkpIHtcbiAgICAgICAgaWYgKGkpIHJldHVybiBbb3JkZXJdO1xuICAgIH0pXG4gICAgY29uc29sZS5sb2coJHNjb3BlLm9yZGVycyk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYWRtaW4nLCB7XG4gICAgICAgIHVybDogJy9hZG1pbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWRtaW4vYWRtaW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBZG1pbkN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBhbGxQcm9kdWN0czogZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsVXNlcnM6IGZ1bmN0aW9uIChVc2VyRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS5mZXRjaEFsbCgpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsT3JkZXJEZXRhaWxzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJPcmRlcnM6IGZ1bmN0aW9uKE1hbmFnZU9yZGVyc0ZhY3Rvcnkpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsVXNlck9yZGVycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn0pXG4iLCIgYXBwLmNvbnRyb2xsZXIoJ0NhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkbG9nLCBjYXJ0Q29udGVudCwgQ2FydEZhY3Rvcnkpe1xuIFx0JHNjb3BlLmNhcnRDb250ZW50PWNhcnRDb250ZW50O1xuXG4gXHQkc2NvcGUucmVtb3ZlPSBmdW5jdGlvbihvcmRlcklkKSB7XG4gXHRcdENhcnRGYWN0b3J5LnJlbW92ZUZyb21DYXJ0KG9yZGVySWQpXG4gXHRcdC50aGVuKGZ1bmN0aW9uKG5ld0NhcnQpe1xuIFx0XHRcdCRzY29wZS5jYXJ0Q29udGVudCA9IG5ld0NhcnQ7XG4gXHRcdH0pLmNhdGNoKCRsb2cpXG4gXHR9XG5cbiBcdCRzY29wZS5jaGFuZ2VRdWFudGl0eT0gZnVuY3Rpb24gKGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2hhbmdlUXVhbnRpdHkoY2FydElkLCBxdWFudGl0eSwgYWRkT3JTdWJ0cmFjdCk7XG4gICAgICAgICRzY29wZS5jYXJ0Q29udGVudCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgfTtcblxuICAkc2NvcGUuY2hlY2tvdXQgPSBDYXJ0RmFjdG9yeS5jaGVja291dDtcblxuICAkc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG90YWwgPSAwO1xuICAgIGNhcnRDb250ZW50LmZvckVhY2goY2FydCA9PiB0b3RhbCArPSAoY2FydC5wcmljZSAqIGNhcnQucXVhbnRpdHkpKVxuXG4gICAgcmV0dXJuIHRvdGFsOyAgXG4gIH1cbiB9KVxuXG4gIiwiIFxuIGFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpe1xuIFx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NhcnQnLCB7XG4gXHRcdHVybDonL2NhcnQnLFxuIFx0XHR0ZW1wbGF0ZVVybDonanMvY2FydC9jYXJ0Lmh0bWwnLFxuIFx0XHRjb250cm9sbGVyOidDYXJ0Q3RybCcsXG4gXHRcdHJlc29sdmU6e1xuIFx0XHRcdGNhcnRDb250ZW50OmZ1bmN0aW9uKENhcnRGYWN0b3J5KXtcblxuIFx0XHRcdFx0cmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKTtcbiAgICAgICAgICAgICAgICAgIFxuIFx0XHRcdH0gICAgICAgICAgICAgICAgICAgICAgICBcbiBcdFx0fSAgICAgICAgICAgICAgIFxuIFx0fSkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiB9KSAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIiwiYXBwLmNvbnRyb2xsZXIoJ0NoZWNrb3V0Q3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIENhcnRGYWN0b3J5KSB7XG5cbiAgICBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coaXRlbXMpXG4gICAgICAgICRzY29wZS5pdGVtcyA9IGl0ZW1zO1xuXG4gIFx0XHRcdC8vY2FsY3VsYXRpbmcgdG90YWwgcHJpY2UgYW5kIHB1dCB0aGF0IGludG8gJHNjb3BlLnRvdGFsXG4gICAgICAgIHZhciBpdGVtc0FyciA9IGl0ZW1zO1xuICAgICAgICB2YXIgdG90YWxQcmljZUVhY2ggPSBbXTtcbiAgICAgICAgaXRlbXNBcnIuZm9yRWFjaChmdW5jdGlvbihlbGVtZW50KXtcbiAgICAgICAgXHR0b3RhbFByaWNlRWFjaC5wdXNoKGVsZW1lbnQucHJpY2UgKiBlbGVtZW50LnF1YW50aXR5KTtcbiAgICAgICAgfSlcbiAgICAgICAgJHNjb3BlLnRvdGFsID0gdG90YWxQcmljZUVhY2gucmVkdWNlKCAocHJldiwgY3VycikgPT4gcHJldiArIGN1cnIgKTtcbiAgICB9KVxuXG4gICAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjaGVja291dCcsIHtcbiAgICAgICAgdXJsOiAnL2NoZWNrb3V0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jaGVja291dC9jaGVja291dC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0NoZWNrb3V0Q3RybCdcbiAgICB9KTtcbn0pO1xuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgWydhbmd1bGlrZScsICdmc2FQcmVCdWlsdCcsJ25nUGFzc3dvcmQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTsgICBcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEudXNlcik7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5pc0FkbWluID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VyLmlzQWRtaW47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29udHJvbGxlcignT3JkZXJIaXN0b3JpZXNDdHJsJywgZnVuY3Rpb24gKCRsb2csICRzY29wZSwgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgT3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsKClcbiAgICAudGhlbihmdW5jdGlvbiAodXNlck9yZGVyc0Fycikge1xuXG4gICAgICAgIHVzZXJPcmRlcnNBcnIucGFpZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oYXJyLCBpKXtcbiAgICAgICAgICAgIGFyci5kYXRlID0gbmV3IERhdGUodXNlck9yZGVyc0Fyci5kYXRlW2ldKS50b1N0cmluZygpO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICAgICAgJHNjb3BlLnVzZXJPcmRlcnMgPSB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcztcbiAgICB9KVxuICAgIC5jYXRjaCgkbG9nKTtcbiAgICBcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlckhpc3RvcmllcycsIHtcbiAgICAgICAgdXJsOiAnL2hpc3RvcmllcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaGlzdG9yeS9vcmRlckhpc3Rvcmllcy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ09yZGVySGlzdG9yaWVzQ3RybCdcbiAgICAgICAgXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVzZXQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0L3Bhc3N3b3JkLzp0b2tlbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcGFzc3dvcmQucmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBBdXRoRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAkc2NvcGUudG9rZW4gPSAkc3RhdGVQYXJhbXMudG9rZW47XG5cbiAgICAkc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoZW1haWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0NoZWNrIHlvdXIgZW1haWwnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBwYXNzd29yZCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkKHBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobG9naW5JbmZvKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmRpcmVjdGl2ZSgnYW5pbWF0aW9uJywgZnVuY3Rpb24gKCRzdGF0ZSkge1xuICAgIHZhciBhbmltYXRpb25FbmRFdmVudHMgPSAnd2Via2l0QW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgbXNBbmltYXRpb25FbmQgYW5pbWF0aW9uZW5kJztcbiAgICB2YXIgY3JlYXRlQ2hhcmFjdGVycyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgICAgICAgIGFzaDogW1xuICAgICAgICAgICAgICAgICdhc2gnLFxuICAgICAgICAgICAgICAgICdhc2gtZ3JlZW4tYmFnJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvdGhlcnM6IFtcbiAgICAgICAgICAgICAgICAnamFtZXMnLFxuICAgICAgICAgICAgICAgICdjYXNzaWR5JyxcbiAgICAgICAgICAgICAgICAnamVzc2llJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFkgKCkge1xuICAgICAgICAgICAgcmV0dXJuICgoIE1hdGgucmFuZG9tKCkgKiAzICkgKyAyOSkudG9GaXhlZCgyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFogKHkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgyMCAtIHkpICogMTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJhbmRvbUNoYXJhY3RlcnMgKHdobykge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3RlcnNbd2hvXVsgTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIGNoYXJhY3RlcnNbd2hvXS5sZW5ndGggKSBdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZUNoYXJhY3RlciAod2hvKSB7XG5cbiAgICAgICAgICAgIHZhciB4RGVsYXkgPSAoIHdobyA9PT0gJ2FzaCcgKSA/IDQgOiA0Ljg7XG4gICAgICAgICAgICB2YXIgZGVsYXkgPSAnLXdlYmtpdC1hbmltYXRpb24tZGVsYXk6ICcgKyAoIE1hdGgucmFuZG9tKCkgKiAyLjcgKyB4RGVsYXkgKS50b0ZpeGVkKDMpICsgJ3M7JztcbiAgICAgICAgICAgIHZhciBjaGFyYWN0ZXIgPSByYW5kb21DaGFyYWN0ZXJzKCB3aG8gKTtcbiAgICAgICAgICAgIHZhciBib3R0b20gPSBnZXRZKCk7XG4gICAgICAgICAgICB2YXIgeSA9ICdib3R0b206ICcrIGJvdHRvbSArJyU7JztcbiAgICAgICAgICAgIHZhciB6ID0gJ3otaW5kZXg6ICcrIGdldFooIGJvdHRvbSApICsgJzsnO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gXCJzdHlsZT0nXCIrZGVsYXkrXCIgXCIreStcIiBcIit6K1wiJ1wiO1xuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArXG4gICAgICAgICAgICAgICAgXCI8aSBjbGFzcz0nXCIgKyBjaGFyYWN0ZXIgKyBcIiBvcGVuaW5nLXNjZW5lJyBcIisgc3R5bGUgKyBcIj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPGkgY2xhc3M9XCIgKyBjaGFyYWN0ZXIgKyBcIi1yaWdodCBcIiArIFwic3R5bGU9J1wiKyBkZWxheSArIFwiJz48L2k+XCIgK1xuICAgICAgICAgICAgICAgIFwiPC9pPlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFzaCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiAxNiApICsgMTY7XG4gICAgICAgIHZhciBvdGhlcnMgPSBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogOCApICsgODtcblxuICAgICAgICB2YXIgaG9yZGUgPSAnJztcblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBhc2g7IGkrKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdhc2gnICk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKCB2YXIgaiA9IDA7IGogPCBvdGhlcnM7IGorKyApIHtcbiAgICAgICAgICAgIGhvcmRlICs9IG1ha2VDaGFyYWN0ZXIoICdvdGhlcnMnICk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaHVtYW5zJykuaW5uZXJIVE1MID0gaG9yZGU7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInJ1bm5pbmctYW5pbWF0aW9uXCI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1IG9wZW5pbmctc2NlbmVcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJwaWthY2h1LXJpZ2h0XCI+PC9pPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicXVvdGUgZXhjbGFtYXRpb25cIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImh1bWFuc1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgY29tcGlsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI21haW4nKS5hZGRDbGFzcygnaGVyZScpXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUNoYXJhY3RlcnMoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBvc3Q6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAkKCcub3BlbmluZy1zY2VuZScpLmFkZENsYXNzKCdtb3ZlJylcbiAgICAgICAgICAgICAgICAgICAgJCgnLm1vdmUnKS5vbihhbmltYXRpb25FbmRFdmVudHMsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICAgIHVybDogJy8nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ1BheW1lbnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLFVzZXJGYWN0b3J5LCAkc3RhdGUsICRsb2csIENhcnRGYWN0b3J5LCB0b3RhbENvc3QsIGFycmF5T2ZJdGVtcyl7XG4gICRzY29wZS5pbmZvID0ge307XG4gIFxuICAkc2NvcGUudmFsaWRhdGVVc2VyPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQoJHNjb3BlLmluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5zaG93Q0MgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgkbG9nLmVycm9yKVxuICAgICAgICBcbiAgfVxuICAkc2NvcGUuZWRpdD1mdW5jdGlvbigpe1xuICAgICRzdGF0ZS5nbygnY2FydCcpXG4gIH1cblxuICAkc2NvcGUudG90YWxDb3N0ID0gdG90YWxDb3N0O1xuICAkc2NvcGUuYXJyYXlPZkl0ZW1zID0gYXJyYXlPZkl0ZW1zO1xuICAkc2NvcGUuc3RyaW5nT2ZJdGVtcyA9IGFycmF5T2ZJdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnRpdGxlKS5qb2luKCcsJylcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncGF5bWVudCcsIHtcbiAgICAgICAgdXJsOiAnL3BheW1lbnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3BheW1lbnQvcGF5bWVudC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUGF5bWVudEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgdG90YWxDb3N0OiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0KCkgfSxcbiAgICAgICAgICBhcnJheU9mSXRlbXM6IGZ1bmN0aW9uKENhcnRGYWN0b3J5KSB7IHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCkgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB0aGVQcm9kdWN0LCBhbGxSZXZpZXdzLCBQcm9kdWN0RmFjdG9yeSwgQ2FydEZhY3RvcnkpIHtcbiAgICAvLyBwcm9kdWN0XG4gICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICRzY29wZS5wcm9kdWN0ID0gdGhlUHJvZHVjdDtcbiAgICAkc2NvcGUucmV2aWV3cyA9IGFsbFJldmlld3M7XG4gICAgLy8gcmV2aWV3XG4gICAgJHNjb3BlLm1vZGFsT3BlbiA9IGZhbHNlO1xuICAgICRzY29wZS5zdWJtaXRSZXZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5uZXdSZXZpZXcucHJvZHVjdElkID0gJHNjb3BlLnByb2R1Y3QuaWQ7XG4gICAgICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldygkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLm5ld1JldmlldykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUucmV2aWV3cyA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3M7XG4gICAgICAgICAgICAkc2NvcGUubmV3UmV2aWV3ID0ge307XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91IScsIDEwMDApO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGFkZCB0byBjYXJ0XG4gICAgJHNjb3BlLmFkZFRvQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0KCRzY29wZS5wcm9kdWN0LmlkLCAkc2NvcGUucXVhbnRpdHkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVGhhbmsgeW91ISBZb3VyIGl0ZW0gd2FzIGFkZGVkIHRvIHlvdXIgY2FydCEnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5hcnJheU1ha2VyID0gZnVuY3Rpb24gKG51bSl7XG4gICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPD1udW07IGkgKyspe1xuICAgICAgICAgICAgYXJyLnB1c2goaSlcbiAgICAgICAgfSAgXG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfVxuXG59KSAgIFxuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICBhdXRvc2Nyb2xsOiAndHJ1ZScsXG4gICAgICAgIHVybDogJy9wcm9kdWN0cy86cHJvZHVjdElkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHRoZVByb2R1Y3Q6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCgkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxSZXZpZXdzOiBmdW5jdGlvbihQcm9kdWN0RmFjdG9yeSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cygkc3RhdGVQYXJhbXMucHJvZHVjdElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAiLCJhcHAuY29udHJvbGxlcignUHJvZmlsZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFVzZXJGYWN0b3J5LCAkc3RhdGUpe1xuXHQgICAgVXNlckZhY3RvcnkuZmV0Y2hPbmUoKVxuICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSkgXG5cbiAgICAgICRzY29wZS51c2VyID0ge307XG4gICAgICAkc2NvcGUucmV2aWV3cz0ge307XG4gICBcblxuICAkc2NvcGUuc2F2ZVVzZXJJbmZvPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyQmVmb3JlUGF5bWVudCgkc2NvcGUudXNlcikgXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdZb3Ugc3VjY2Vzc2Z1bGx5IHVwZGF0ZWQgeW91ciBwcm9maWxlIScsIDEwMDApO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnU29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKTtcbiAgICAgICAgfSkgICBcbiAgfVxuICAkc2NvcGUuZG9udFNhdmVJbmZvPWZ1bmN0aW9uKCl7XG4gICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgfVxuICAkc2NvcGUuc2hvd1Jldmlld3M9ZnVuY3Rpb24oKXtcbiAgICBVc2VyRmFjdG9yeS5mZXRjaE9uZVJldmlldygpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmV2aWV3cyl7XG4gICAgICBjb25zb2xlLmxvZyhcImhlbGxvb29vXCIsIHJldmlld3MpXG4gICAgICAkc2NvcGUucmV2aWV3cyA9IHJldmlld3M7XG4gICAgfSlcbiAgfVxuXG5cbn0pXG5cbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2ZpbGUnLCB7XG4gICAgICAgICAgICAgdXJsOiAnL3VzZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjonUHJvZmlsZUN0cmwnLFxuICAgIH0pO1xufSk7XG4gICAgICAgICAgICAgICAgXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgdXJsOiAnL3NpZ251cCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvc2lnbnVwL3NpZ251cC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG4gIGFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aEZhY3RvcnksICRzdGF0ZSkge1xuICAgICRzY29wZS5zaWdudXAgPSB7fTsgXG4gICAgJHNjb3BlLnNlbmRTaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICBBdXRoRmFjdG9yeS5zaWdudXAoc2lnbnVwSW5mbylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09ICdlbWFpbCBleGlzdHMgYWxyZWFkeScpIHtcbiAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnVXNlciBhbHJlYWR5IGV4aXN0cycsIDIwMDApO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlID09PSAnbm90IGEgdmFsaWQgZW1haWwnKXtcbiAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnSXQgaXMgbm90IGEgdmFsaWQgZW1haWwnLCAyMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlID09PSAncGFzc3dvcmRzIGRvIG5vdCBtYXRjaCcpe1xuICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdZb3VyIHBhc3N3b3JkcyBkbyBub3QgbWF0Y2guIFBsZWFzZSB0cnkgYWdhaW4hJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0dvIGFoZWFkIGFuZCBsb2dpbicsIDQwMDApO1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgJHNjb3BlLmdvb2dsZVNpZ251cCA9IEF1dGhGYWN0b3J5Lmdvb2dsZVNpZ251cDtcbn0pO1xuXG5cbiIsImFwcC5jb250cm9sbGVyKCdTdG9yZUN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBwcm9kdWN0cykge1xuICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzO1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3N0b3JlJywge1xuICAgICAgICB1cmw6ICcvc3RvcmUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3N0b3JlL3N0b3JlLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnU3RvcmVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdPcmRlckhpc3Rvcmllc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRDYXJ0ID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvcGFpZC8nXG4gICAgdmFyIG9yZGVySGlzdG9yaWVzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgb3JkZXJIaXN0b3JpZXNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkQ2FydClcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gXG5cbiAgICByZXR1cm4gb3JkZXJIaXN0b3JpZXNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdBdXRoRmFjdG9yeScsICBmdW5jdGlvbigkaHR0cCl7XG5cbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIHZhciBBdXRoRmFjdG9yeSA9IHt9O1xuXG5cbiAgICBBdXRoRmFjdG9yeS5zaWdudXAgPSBmdW5jdGlvbiAoc2lnbnVwSW5mbykge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3NpZ251cCcsIHNpZ251cEluZm8pLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hdXRoL2dvb2dsZScpO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LnJlc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAodG9rZW4sIGxvZ2luKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvcmVzZXQvcGFzc3dvcmQvJyArIHRva2VuLCBsb2dpbik7XG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9mb3Jnb3QnLCBlbWFpbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEF1dGhGYWN0b3J5O1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnQ2FydEZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHAsICRsb2csICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9vcmRlcnMvY2FydC8nO1xuICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaXRlbS5pbWFnZVVybCA9ICcvYXBpL3Byb2R1Y3RzLycgKyBpdGVtLnByb2R1Y3RJZCArICcvaW1hZ2UnO1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge307XG4gICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCA9IFtdO1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc29ydChmdW5jdGlvbiAoYSxiKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gYi5pZCAtIGEuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBpdGVtcy5tYXAoY29udmVydCk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1cGRhdGVDYXJ0JywgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydCk7XG4gICAgICAgICAgICByZXR1cm4gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmRlbGV0ZUl0ZW0gPSBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBwcm9kdWN0SWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0KVxuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IHRoaXMuY2FjaGVkQ2FydC5maWx0ZXIoaXRlbSA9PiBpdGVtLnByb2R1Y3RJZCA9PT0gcHJvZHVjdElkKTtcbiAgICAgICAgcmV0dXJuIChkdXBsaWNhdGUubGVuZ3RoKSA/IGR1cGxpY2F0ZVswXSA6IG51bGw7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuYWRkVG9DYXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgcXVhbnRpdHkpIHtcbiAgICAgIFxuICAgICAgICB2YXIgZHVwbGljYXRlID0gQ2FydEZhY3RvcnkuY2hlY2tGb3JEdXBsaWNhdGVzKHByb2R1Y3RJZCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeVxuICAgICAgICAgICAgLmNoYW5nZVF1YW50aXR5KGR1cGxpY2F0ZS5pZCwgZHVwbGljYXRlLnF1YW50aXR5LCAnYWRkJywgcXVhbnRpdHkgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArIHByb2R1Y3RJZCwge3F1YW50aXR5OiBxdWFudGl0eX0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydD1mdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgYWRkUmVtb3ZlQW5pbWF0aW9uKCk7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCtvcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpe1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUob3JkZXJJZClcbiAgICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5PWZ1bmN0aW9uKG9yZGVySWQsIHF1YW50aXR5LCBhZGRPclN1YnRyLCBhbW91bnQgPSAxKXtcbiAgICAgICAgdmFyIHJ1bkZ1bmM9ZmFsc2U7XG4gICAgICAgIGlmIChhZGRPclN1YnRyPT09J2FkZCcpIHtcbiAgICAgICAgICAgIGFkZFN1Y2Nlc3NBbmltYXRpb24oKVxuICAgICAgICAgICAgcXVhbnRpdHkrPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGFkZE9yU3VidHI9PT0nc3VidHJhY3QnICYmIHF1YW50aXR5PjEpIHtcbiAgICAgICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICAgICAgcXVhbnRpdHktPSArYW1vdW50O1xuICAgICAgICAgICAgcnVuRnVuYz10cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChydW5GdW5jPT09dHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgb3JkZXJJZCwge3F1YW50aXR5OnF1YW50aXR5fSlcbiAgICAgICAgICAgIC8vIC50aGVuKGNvbnZlcnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZUZyb250RW5kQ2FjaGVRdWFudGl0eShvcmRlcklkLHF1YW50aXR5KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUZyb250RW5kQ2FjaGUgPSBmdW5jdGlvbihvcmRlcklkKXtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZvckVhY2goZnVuY3Rpb24ob3JkZXIsaSl7XG4gICAgICAgICAgICBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIGluZGV4ID0gaTtcbiAgICAgICAgfSlcblxuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkgPSBmdW5jdGlvbiAob3JkZXJJZCxxdWFudGl0eSkge1xuICAgICAgICB2YXIgaSA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQuZmluZEluZGV4KGZ1bmN0aW9uKG9yZGVyKXtcbiAgICAgICAgICAgIC8vIGlmIChvcmRlci5pZCA9PT0gb3JkZXJJZCkge1xuICAgICAgICAgICAgLy8gICAgIG9yZGVyLnF1YW50aXR5ID0gcXVhbnRpdHk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICByZXR1cm4gb3JkZXIuaWQgPT09IG9yZGVySWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0W2ldLnF1YW50aXR5ID0gcXVhbnRpdHlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdjaGVja291dCcpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdvcmRlckhpc3RvcmllcycpO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoMCwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5sZW5ndGgpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIFNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfSAgXG5cbiAgICBDYXJ0RmFjdG9yeS5nZXRUb3RhbENvc3QgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICAgcmV0dXJuIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oY2FydCl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY2FydClcbiAgICAgICAgICAgICAgICBjYXJ0LmZvckVhY2goaXRlbSA9PiB0b3RhbCArPSAoaXRlbS5wcmljZSppdGVtLnF1YW50aXR5KSApXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RvdGEnLCB0b3RhbClcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCRsb2cuZXJyb3IpXG4gICAgfVxuXG5cbiAgICB2YXIgYW5pbWF0aW9uRW5kID0gJ3dlYmtpdEFuaW1hdGlvbkVuZCBtb3pBbmltYXRpb25FbmQgTVNBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBhbmltYXRpb25lbmQnO1xuXG4gICAgZnVuY3Rpb24gYWRkU3VjY2Vzc0FuaW1hdGlvbigpIHtcbiAgICAgICAgJCgnI2NhcnQtaWNvbicpLmFkZENsYXNzKCdhbmltYXRlZCBydWJiZXJCYW5kJykub25lKGFuaW1hdGlvbkVuZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NhcnQtaWNvbicpLnJlbW92ZUNsYXNzKCdhbmltYXRlZCBydWJiZXJCYW5kJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cblxuICAgIGZ1bmN0aW9uIGFkZFJlbW92ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgJCgnI2NhcnQtaWNvbicpLmFkZENsYXNzKCdhbmltYXRlZCBzaGFrZScpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgc2hha2UnKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgIENhcnRGYWN0b3J5LmZpbmRPbmVVc2VySW5mbz1mdW5jdGlvbigpe1xuICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgIH1cblxuICAgIHJldHVybiBDYXJ0RmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnTWFuYWdlT3JkZXJzRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGNhY2hlZE9yZGVyRGV0YWlscyA9IFtdO1xuICAgIHZhciBjYWNoZWRVc2VyT3JkZXJzID0gW107XG4gICAgdmFyIGJhc2VVcmwgPSAnL2FwaS9tYW5hZ2VPcmRlcnMvJ1xuICAgIHZhciBtYW5hZ2VPcmRlcnNGYWN0b3J5ID0ge307XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZE9yZGVyRGV0YWlscylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRPcmRlckRldGFpbHM7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyT3JkZXInKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgY2FjaGVkVXNlck9yZGVycylcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VyT3JkZXJzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXIvJyArIHVzZXJPcmRlcklkKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24odXNlck9yZGVySWQsIGRhdGEpe1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwrICd1c2VyT3JkZXIvJysgdXNlck9yZGVySWQsIGRhdGEpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXJPcmRlcil7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIlVwZGF0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgdXBkYXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVyc1t1cGRhdGVkSW5kXSA9IHVzZXJPcmRlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJPcmRlcjtcbiAgICAgICAgfSlcbiAgICB9XG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAodXNlck9yZGVySWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkKVxuICAgICAgICAuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KFwiRGVsZXRlZFwiLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlck9yZGVycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXJPcmRlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXIuaWQgPT09IHVzZXJPcmRlcklkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2VyT3JkZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hbmFnZU9yZGVyc0ZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cblxuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvcHJvZHVjdHMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgcGFyc2VUaW1lU3RyID0gZnVuY3Rpb24gKHJldmlldykge1xuICAgICAgICB2YXIgZGF0ZSA9IHJldmlldy5jcmVhdGVkQXQuc3Vic3RyKDAsIDEwKTtcbiAgICAgICAgcmV2aWV3LmRhdGUgPSBkYXRlO1xuICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgIH1cblxuICAgIHZhciBQcm9kdWN0RmFjdG9yeSA9IHt9O1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzID0gW107XG4gICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyA9IFtdO1xuXG4gICAgUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCkudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMubWFwKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weShwcm9kdWN0cywgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VwZGF0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5maW5kSW5kZXgoZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzW3VwZGF0ZWRJbmRdID0gcHJvZHVjdDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RlbGV0ZWQnLCAxMDAwKTtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3QuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyBpZClcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQpO1xuXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNvbnZlcnQgPSBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICBwcm9kdWN0LmltYWdlVXJsID0gYmFzZVVybCArIHByb2R1Y3QuaWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIHByb2R1Y3Q7XG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmNyZWF0ZVJldmlldyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkLCBkYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldmlldyA9IHBhcnNlVGltZVN0cihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLnB1c2gocmV2aWV3KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbFJldmlld3MgPSBmdW5jdGlvbiAocHJvZHVjdElkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcmV2aWV3cy8nICsgcHJvZHVjdElkKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MpO1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzLm1hcChwYXJzZVRpbWVTdHIpO1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvZHVjdEZhY3Rvcnk7XG5cbn0pXG4iLCJhcHAuZmFjdG9yeSgnVXNlckZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcbiAgICB2YXIgVXNlckZhY3RvcnkgPSB7fTtcbiAgICAgICAgVXNlckZhY3RvcnkuY2FjaGVkUmV2aWV3cz1bXTtcbiAgICB2YXIgY2FjaGVkVXNlcnMgPSBbXTtcbiAgICB2YXIgdGVzdD1bXTtcbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3VzZXJzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKS50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuY29weSh1c2VycywgY2FjaGVkVXNlcnMpOyAvLyB3aHkgYW5ndWxhciBjb3B5IGFsdGVycyBhcnJheSBvcmRlciEhISEhISFcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVkVXNlcnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQgLSBiLmlkO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlcnM7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9O1xuICAgICAgVXNlckZhY3RvcnkuZmV0Y2hPbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICB9O1xuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlciA9IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KGJhc2VVcmwgKyBpZCwgZGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vyc1t1cGRhdGVkSW5kXSA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVkSW5kID0gY2FjaGVkVXNlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXIuaWQgPT09IGlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjYWNoZWRVc2Vycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50ID0gZnVuY3Rpb24gKGluZm9PYmope1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgICAgIGlmKHVzZXIuaWQgPT09ICdzZXNzaW9uJyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVNlc3Npb25DYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkudXBkYXRlVXNlcih1c2VyLmlkLGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoJ2FwaS9vcmRlcnMvY2FydC91cGRhdGVVc2VyQ2FydCcsIGluZm9PYmopXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICB9XG5cblxuICAgICAgVXNlckZhY3RvcnkuZmV0Y2hPbmVSZXZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Jldmlld3MvJyArIHVzZXIuaWQgKyAnL3Jldmlld3MnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIFVzZXJGYWN0b3J5LmNhY2hlZFJldmlld3MpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuY2FjaGVkUmV2aWV3cy5tYXAocGFyc2VUaW1lU3RyKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiBVc2VyRmFjdG9yeTtcbn0pXG5cbiIsIlxuICBhcHAuY29udHJvbGxlcignYW5ndWxpa2VDdHJsJywgW1xuICAgICAgJyRzY29wZScsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbiAgICAgICAgICAkc2NvcGUubXlNb2RlbCA9IHtcbiAgICAgICAgICAgICAgVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJyxcbiAgICAgICAgICAgICAgTmFtZTogIFwiUG9rZW1hcnRcIiwgXG4gICAgICAgICAgICAgIEltYWdlVXJsOiAnaHR0cDovL3Bva2VtYXJ0LWZzYS5oZXJva3VhcHAuY29tJ1xuICAgICAgICAgIH07XG4gICAgICB9XG4gIF0pOyIsIlxuXG4oZnVuY3Rpb24gKCkge1xuICAgIGFuZ3VsYXIubW9kdWxlKCdhbmd1bGlrZScsIFtdKVxuXG4gICAgICAuZGlyZWN0aXZlKCdmYkxpa2UnLCBbXG4gICAgICAgICAgJyR3aW5kb3cnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICBmYkxpa2U6ICc9PydcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5GQikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIEZhY2Vib29rIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRTY3JpcHQoJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5pbml0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBJZDogJHJvb3RTY29wZS5mYWNlYm9va0FwcElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhmYm1sOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICd2Mi4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckxpa2VCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckxpa2VCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWF0dHJzLmZiTGlrZSAmJiAhc2NvcGUuZmJMaWtlICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgnZmJMaWtlJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gcnVuIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kV2F0Y2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImZiLWxpa2VcIicgKyAoISFzY29wZS5mYkxpa2UgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5mYkxpa2UgKyAnXCInIDogJycpICsgJyBkYXRhLWxheW91dD1cImJ1dHRvbl9jb3VudFwiIGRhdGEtYWN0aW9uPVwibGlrZVwiIGRhdGEtc2hvdy1mYWNlcz1cInRydWVcIiBkYXRhLXNoYXJlPVwidHJ1ZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5GQi5YRkJNTC5wYXJzZShlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICBdKVxuXG4gICAgICAuZGlyZWN0aXZlKCdnb29nbGVQbHVzJywgW1xuICAgICAgICAgICckd2luZG93JywgZnVuY3Rpb24gKCR3aW5kb3cpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgIGdvb2dsZVBsdXM6ICc9PydcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LmdhcGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBHb29nbGUgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9hcGlzLmdvb2dsZS5jb20vanMvcGxhdGZvcm0uanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQbHVzQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBsdXNCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclBsdXNCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWF0dHJzLmdvb2dsZVBsdXMgJiYgIXNjb3BlLmdvb2dsZVBsdXMgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCdnb29nbGVQbHVzJywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQbHVzQnV0dG9uKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCgnPGRpdiBjbGFzcz1cImctcGx1c29uZVwiJyArICghIXNjb3BlLmdvb2dsZVBsdXMgPyAnIGRhdGEtaHJlZj1cIicgKyBzY29wZS5nb29nbGVQbHVzICsgJ1wiJyA6ICcnKSArICcgZGF0YS1zaXplPVwibWVkaXVtXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LmdhcGkucGx1c29uZS5nbyhlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICBdKVxuXG4gICAgICAuZGlyZWN0aXZlKCd0d2VldCcsIFtcbiAgICAgICAgICAnJHdpbmRvdycsICckbG9jYXRpb24nLFxuICAgICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgIHR3ZWV0OiAnPScsXG4gICAgICAgICAgICAgICAgICAgICAgdHdlZXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnR3dHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgVHdpdHRlciBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL3BsYXRmb3JtLnR3aXR0ZXIuY29tL3dpZGdldHMuanMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUd2VldEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyVHdlZXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUudHdlZXQgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCd0d2VldCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCJodHRwczovL3R3aXR0ZXIuY29tL3NoYXJlXCIgY2xhc3M9XCJ0d2l0dGVyLXNoYXJlLWJ1dHRvblwiIGRhdGEtdGV4dD1cIicgKyBzY29wZS50d2VldCArICdcIiBkYXRhLXVybD1cIicgKyAoc2NvcGUudHdlZXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICdcIj5Ud2VldDwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cudHd0dHIud2lkZ2V0cy5sb2FkKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgIF0pXG5cbiAgICAgIC5kaXJlY3RpdmUoJ3Bpbkl0JywgW1xuICAgICAgICAgICckd2luZG93JywgJyRsb2NhdGlvbicsXG4gICAgICAgICAgZnVuY3Rpb24gKCR3aW5kb3csICRsb2NhdGlvbikge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgcGluSXQ6ICc9JyxcbiAgICAgICAgICAgICAgICAgICAgICBwaW5JdEltYWdlOiAnPScsXG4gICAgICAgICAgICAgICAgICAgICAgcGluSXRVcmw6ICc9J1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIFBpbnRlcmVzdCBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBkLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdTQ1JJUFQnKVswXSwgcCA9IGQuY3JlYXRlRWxlbWVudCgnU0NSSVBUJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5zcmMgPSAnLy9hc3NldHMucGludGVyZXN0LmNvbS9qcy9waW5pdC5qcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwWydkYXRhLXBpbi1idWlsZCddID0gJ3BhcnNlUGlucyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISEkd2luZG93LnBhcnNlUGlucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQocC5vbmxvYWQsIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUocCwgZik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0oJHdpbmRvdy5kb2N1bWVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclBpbkl0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJQaW5JdEJ1dHRvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzY29wZS5waW5JdCAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ3Bpbkl0JywgZnVuY3Rpb24gKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxhIGhyZWY9XCIvL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9JyArIChzY29wZS5waW5JdFVybCB8fCAkbG9jYXRpb24uYWJzVXJsKCkpICsgJyZtZWRpYT0nICsgc2NvcGUucGluSXRJbWFnZSArICcmZGVzY3JpcHRpb249JyArIHNjb3BlLnBpbkl0ICsgJ1wiIGRhdGEtcGluLWRvPVwiYnV0dG9uUGluXCIgZGF0YS1waW4tY29uZmlnPVwiYmVzaWRlXCI+PC9hPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5wYXJzZVBpbnMoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgXSk7XG5cbn0pKCk7XG4iLCJhcHAuZGlyZWN0aXZlKCdzaG9wcGluZ0NhcnQnLCBmdW5jdGlvbihDYXJ0RmFjdG9yeSwgJHJvb3RTY29wZSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBhY3RpdmU6ICc9JyxcbiAgICAgICAgICAgIGFkZEFuZFJldmVhbENhcmQ6ICc9J1xuICAgICAgICB9LFxuICAgICAgICAvLyBzY29wZTogeyBzZXRGbjogJyYnIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpLnRoZW4oZnVuY3Rpb24gKGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gQ2FydEZhY3RvcnkuY2FjaGVkQ2FydDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ3VwZGF0ZUNhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIGNhcnQpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5jYXJ0ID0gY2FydDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBzY29wZS5yZXZlYWxDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0IGNoZWNrb3V0LS1hY3RpdmUnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmhpZGVDYXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmFjdGl2ZSA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgICAgICAgc2NvcGUuc2hvd0NhcnQgPSAnY2hlY2tvdXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NvcGUudG90YWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICAgICAgICAgIGlmKHNjb3BlLmNhcnQpXG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UgKiBpdGVtLnF1YW50aXR5KSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgLy8gc2NvcGUuc2V0Rm4oe3RoZURpckZuOiBzY29wZS51cGRhdGVNYXB9KTtcblxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ1Nob3AnLCBzdGF0ZTogJ3N0b3JlJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS50b2dnbGVMb2dvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjk3cHggLTMwNnB4JylcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51bnRvZ2dsZUxvZ28gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcucG9rZWJhbGwgaS5ncmVhdCcpLmNzcygnYmFja2dyb3VuZC1wb3NpdGlvbicsICctMjkzcHggLTlweCcpXG5cbiAgICAgICAgICAgIH0gICBcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICBzY29wZS5hZG1pbiA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldEFkbWluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEF1dGhJbnRlcmNlcHRvcik7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5hZG1pbiA9IEF1dGhTZXJ2aWNlLmlzQWRtaW4odXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG4gICAgICAgICAgICBzZXRBZG1pbigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFwcC5kaXJlY3RpdmUoJ29hdXRoQnV0dG9uJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHNjb3BlOiB7XG4gICAgICBwcm92aWRlck5hbWU6ICdAJ1xuICAgIH0sXG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJy9qcy9jb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmh0bWwnXG4gIH1cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgnb3JkZXJFbnRyeScsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1lbnRyeS9vcmRlci1lbnRyeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIG9yZGVyRGV0YWlsczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzLCBlLCBhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzLm9yZGVyRGV0YWlscyk7XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yeUN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuXG59KSIsImFwcC5kaXJlY3RpdmUoJ29yZGVySGlzdG9yeScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5odG1sJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIGhpc3RvcmllczogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdPcmRlckhpc3RvcnlDdHJsJ1xuICAgXG4gICAgfVxuXG59KVxuICAiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdENhcmRDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblxuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbXG4gICAgICAgIHtuYW1lOiAnQWxsJ30sXG4gICAgICAgIHtuYW1lOiAnRmlyZSd9LFxuICAgICAgICB7bmFtZTogJ1dhdGVyJ30sXG4gICAgICAgIHtuYW1lOiAnR3Jhc3MnfSxcbiAgICAgICAge25hbWU6ICdSb2NrJ30sXG4gICAgICAgIHtuYW1lOiAnRHJhZ29uJ30sXG4gICAgICAgIHtuYW1lOiAnUHN5Y2hpYyd9LFxuICAgICAgICB7bmFtZTogJ0ljZSd9LFxuICAgICAgICB7bmFtZTogJ05vcm1hbCd9LFxuICAgICAgICB7bmFtZTogJ0J1Zyd9LFxuICAgICAgICB7bmFtZTogJ0VsZWN0cmljJ30sXG4gICAgICAgIHtuYW1lOiAnR3JvdW5kJ30sXG4gICAgICAgIHtuYW1lOiAnRmFpcnknfSxcbiAgICAgICAge25hbWU6ICdGaWdodGluZyd9LFxuICAgICAgICB7bmFtZTogJ0dob3N0J30sXG4gICAgICAgIHtuYW1lOiAnUG9pc29uJ31cbiAgICBdXG5cbiAgICAkc2NvcGUuZmlsdGVyID0gZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCBjYXRlZ29yeSA9PT0gJ0FsbCcpIHJldHVybiB0cnVlXG4gICAgICAgICAgICBlbHNlIHJldHVybiBwcm9kdWN0LmNhdGVnb3J5ID09PSBjYXRlZ29yeVxuICAgICAgICB9O1xuICAgIH07XG4gICAgJHNjb3BlLnNlYXJjaEZpbHRlcj1mdW5jdGlvbihzZWFyY2hpbmdOYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgaWYgKCFzZWFyY2hpbmdOYW1lKSByZXR1cm4gdHJ1ZTsgICAgICAgICAgIFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGxlbiA9IHNlYXJjaGluZ05hbWUubGVuZ3RoXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2R1Y3QnLCBwcm9kdWN0LnRpdGxlKVxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnRpdGxlLnN1YnN0cmluZygwLGxlbikudG9Mb3dlckNhc2UoKT09c2VhcmNoaW5nTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUucHJpY2VSYW5nZUZpbHRlcj1mdW5jdGlvbihtaW49MCxtYXg9MjAwMCl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihwcm9kdWN0KXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LnByaWNlPj1taW4gJiYgcHJvZHVjdC5wcmljZTw9bWF4O1xuICAgICAgICB9XG4gICAgfVxuICAgICRzY29wZS5zb3J0aW5nRnVuYz1mdW5jdGlvbihzb3J0VHlwZT1cInVudG91Y2hlZFwiKXtcbiAgICAgICAgaWYgKHNvcnRUeXBlPT09XCJ1bnRvdWNoZWRcIikgcmV0dXJuIG51bGw7XG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09XCJsb3dcIikgcmV0dXJuICdwcmljZSdcbiAgICAgICAgZWxzZSBpZiAoc29ydFR5cGU9PT0naGlnaCcpIHJldHVybiAnLXByaWNlJ1xuICAgICAgICB9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCdwcm9kdWN0Q2FyZCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0czogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q2FyZEN0cmwnXG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3Byb2R1Y3RFbnRyeScsIGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdDogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuc3VibWl0VXBkYXRlID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkudXBkYXRlUHJvZHVjdChpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVQcm9kdWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdChpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsIi8vIGFwcC5kaXJlY3RpdmUoJ3N0YXJSYXRpbmcnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuLy8gICAgICAgdGVtcGxhdGU6XG4vLyAgICAgICAgICc8c3BhbiBjbGFzcz1cInN0YXJzXCI+JyArXG4vLyAgICAgICAgICAnPGRpdiBjbGFzcz1cInN0YXJzLWZpbGxlZCBsZWZ0XCI+JyArXG4vLyAgICAgICAgICAgICAnPHNwYW4+4piFPC9zcGFuPicgK1xuLy8gICAgICAgICAgJzwvZGl2PicgK1xuLy8gICAgICAgJzwvc3Bhbj4nXG4vLyAgICAgfTtcbi8vIH0pXG4iLCIgLy8gYXBwLmNvbnRyb2xsZXIoJ1NlYXJjaEJhckN0cmwnLCBmdW5jdGlvbigkc2NvcGUpe1xuIC8vIFx0JHNjb3BlLnByb2R1Y3Q9XG4gLy8gfSkiLCJhcHAuZGlyZWN0aXZlKCdzZWFyY2hCYXInLCBmdW5jdGlvbigpe1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OidFJyxcblx0XHR0ZW1wbGF0ZVVybDonanMvY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmh0bWwnLFxuXHRcdGNvbnRyb2xsZXI6J1Byb2R1Y3RDYXJkQ3RybCdcblx0fVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgndXNlckVudHJ5JywgZnVuY3Rpb24gKFVzZXJGYWN0b3J5LCBBdXRoRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1lbnRyeS91c2VyLWVudHJ5Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlcjogJz0nLFxuICAgICAgICAgICAgbmdNb2RlbDogJz0nXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSwgYXR0cikge1xuICAgICAgICAgICAgc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgICAgICAgICBBdXRoRmFjdG9yeS5mb3JnZXRQYXNzd29yZCh7ZW1haWw6IGVtYWlsfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEb25lJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnT29wcywgc29tZXRoaW5nIHdlbnQgd3JvbmcnLCAxMDAwKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NvcGUuZGVsZXRlVXNlciA9IGZ1bmN0aW9uICh1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgVXNlckZhY3RvcnkuZGVsZXRlVXNlcih1c2VySWQpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnRXJhc2UgZnJvbSBwbGFuZXQgRWFydGgnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyT3JkZXInLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvdXNlci1vcmRlci91c2VyLW9yZGVyLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdXNlck9yZGVyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyhpZCwgc2NvcGUubmdNb2RlbClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyT3JkZXIgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBNYW5hZ2VPcmRlcnNGYWN0b3J5LmRlbGV0ZVVzZXJPcmRlcihpZClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiXG5hcHAuZGlyZWN0aXZlKCdjbGlja0FueXdoZXJlQnV0SGVyZScsIGZ1bmN0aW9uKCRkb2N1bWVudCl7XG4gIHJldHVybiB7XG4gICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICBjbGlja0FueXdoZXJlQnV0SGVyZTogJyYnXG4gICAgICAgICAgIH0sXG4gICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWwsIGF0dHIpIHtcblxuICAgICAgICAgICAgICAgJCgnLmxvZ28nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICRkb2N1bWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldC5pZCAhPT0gJ2NhcnQtaWNvbicgJiYgZS50YXJnZXQuaWQgIT09ICdhZGQtdG8tY2FydC1idXR0b24nKSB7XG4gICAgICAgICAgICAgICAgICAgaWYgKGVsICE9PSBlLnRhcmdldCAmJiAhZWxbMF0uY29udGFpbnMoZS50YXJnZXQpICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRldmFsKHNjb3BlLmNsaWNrQW55d2hlcmVCdXRIZXJlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICB9XG4gICAgICAgIH1cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
