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
        return $http.get('/api/users/getLoggedInUserId').then(function (res) {
            var id = res.data.id;
            data.authorId = id;
        }).then(function () {
            $http.post('/api/reviews/' + productId, data).then(function (response) {
                var review = parseTimeStr(response.data);
                ProductFactory.cachedReviews.push(review);
                return review;
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWRtaW4vYWRtaW4uY29udHJvbGxlci5qcyIsImFkbWluL2FkbWluLmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuanMiLCJjaGVja291dC9jaGVja291dC5jb250cm9sbGVyLmpzIiwiY2hlY2tvdXQvY2hlY2tvdXQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuY29udHJvbGxlci5qcyIsImhpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuanMiLCJob21lL2FuaW1hdGlvbi5kaXJlY3RpdmUuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJwYXltZW50L3BheW1lbnQuY29udHJvbGxlci5qcyIsInBheW1lbnQvcGF5bWVudC5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwic3RvcmUvc3RvcmUuY29udHJvbGxlci5qcyIsInN0b3JlL3N0b3JlLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9GdWxsc3RhY2tQaWNzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9PcmRlckhpc3Rvcmllcy5mYWN0b3J5LmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9hdXRoLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL2NhcnQuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvbWFuYWdlT3JkZXJzLmZhY3RvcnkuanMiLCJjb21tb24vZmFjdG9yaWVzL3Byb2R1Y3QuZmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvY2FydC1yZXZlYWwvY2FydC1yZXZlYWwuanMiLCJjb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuanMiLCJjb21tb24vZGlyZWN0aXZlcy9vYXV0aC1idXR0b24vb2F1dGgtYnV0dG9uLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWVudHJ5L29yZGVyLWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL29yZGVyLWhpc3Rvcnkvb3JkZXItaGlzdG9yeS5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItaGlzdG9yeS9vcmRlci1oaXN0b3J5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3Byb2R1Y3QtY2FyZC9wcm9kdWN0LWNhcmQuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvYW5ndWxpa2UvYW5ndWxpa2UuY29udHJvbGxlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2FuZ3VsaWtlL2FuZ3VsaWtlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcHJvZHVjdC1lbnRyeS9wcm9kdWN0LWVudHJ5LmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmV2aWV3LWVudHJ5L3N0YXItcmF0aW5nLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3NlYXJjaC1iYXIvc2VhcmNoLWJhci5jb250cm9sbGVyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvc2VhcmNoLWJhci9zZWFyY2gtYmFyLmRpcmVjdGl2ZS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3VzZXItZW50cnkvdXNlci1lbnRyeS5kaXJlY3RpdmUuanMiLCJjb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuZGlyZWN0aXZlLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvdXRpbGl0eS9jbGlja0FueXdoZXJlQnV0SGVyZS5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLFVBQUEsRUFBQSxhQUFBLEVBQUEsWUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLGdCQUFBLEVBQUEscUJBQUEsRUFBQSxnQkFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUEscUJBQUEsRUFBQSxjQUFBLEVBQUE7QUFDQTtBQUNBLHNCQUFBLFNBQUEsQ0FBQSxJQUFBO0FBQ0E7QUFDQSx1QkFBQSxTQUFBLENBQUEsR0FBQTtBQUNBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxLQUZBO0FBR0EsMEJBQUEsZUFBQTs7QUFFQTtBQUVBLENBYkE7O0FBZUE7QUFDQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsSUFBQSxNQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0EsZUFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw2QkFBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFlBQUEsWUFBQSxlQUFBLEVBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsY0FBQSxjQUFBOztB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QTtBQUtBLDBCQUFBLHdCQUxBO0FBTUEsdUJBQUE7QUFOQSxLQUFBOztBQVNBLFFBQUEsT0FBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsYUFBQTtBQUNBLGlCQUFBLFlBQUEsZ0JBREE7QUFFQSxpQkFBQSxZQUFBLGFBRkE7QUFHQSxpQkFBQSxZQUFBLGNBSEE7QUFJQSxpQkFBQSxZQUFBO0FBSkEsU0FBQTtBQU1BLGVBQUE7QUFDQSwyQkFBQSx1QkFBQSxRQUFBLEVBQUE7QUFDQSwyQkFBQSxVQUFBLENBQUEsV0FBQSxTQUFBLE1BQUEsQ0FBQSxFQUFBLFFBQUE7QUFDQSx1QkFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUE7QUFDQTtBQUpBLFNBQUE7QUFNQSxLQWJBOztBQWVBLFFBQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0Esc0JBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBREEsRUFFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG1CQUFBLFVBQUEsR0FBQSxDQUFBLGlCQUFBLENBQUE7QUFDQSxTQUpBLENBQUE7QUFNQSxLQVBBOztBQVNBLFFBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQSxFQUFBLEVBQUE7O0FBRUEsaUJBQUEsaUJBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxPQUFBLFNBQUEsSUFBQTtBQUNBLG9CQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQUEsRUFBQSxLQUFBLElBQUE7QUFDQSx1QkFBQSxVQUFBLENBQUEsWUFBQSxZQUFBO0FBQ0E7QUFDQSxtQkFBQSxLQUFBLElBQUE7QUFDQTs7QUFFQSxhQUFBLE9BQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsT0FBQTtBQUNBLFNBRkE7O0FBSUE7QUFDQTtBQUNBLGFBQUEsZUFBQSxHQUFBLFlBQUE7QUFDQSxtQkFBQSxDQUFBLENBQUEsUUFB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QSxRQUhBO0FBTEEsU0FBQTs7QUFZQSxpQkFBQSxJQUFBLEdBQUE7QUFDQSxtQkFBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLENBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxLQUFBLEtBQUEsQ0FBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEdBQUEsQ0FBQTtBQUNBOztBQUVBLGlCQUFBLGdCQUFBLENBQUEsR0FBQSxFQUFBO0FBQ0EsbUJBQUEsV0FBQSxHQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsV0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFDQTs7QUFFQSxpQkFBQSxhQUFBLENBQUEsR0FBQSxFQUFBOztBQUVBLGdCQUFBLFNBQUEsUUFBQSxLQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxnQkFBQSxRQUFBLDhCQUFBLENBQUEsS0FBQSxNQUFBLEtBQUEsR0FBQSxHQUFBLE1BQUEsRUFBQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLGdCQUFBLFlBQUEsaUJBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsU0FBQSxNQUFBO0FBQ0EsZ0JBQUEsSUFBQSxhQUFBLE1BQUEsR0FBQSxJQUFBO0FBQ0EsZ0JBQUEsSUFBQSxjQUFBLEtBQUEsTUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLGdCQUFBLFFBQUEsWUFBQSxLQUFBLEdBQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsQ0FBQSxHQUFBLEdBQUE7O0FBRUEsbUJBQUEsS0FDQSxZQURBLEdBQ0EsU0FEQSxHQUNBLGtCQURBLEdBQ0EsS0FEQSxHQUNBLEdBREEsR0FFQSxXQUZBLEdBRUEsU0FGQSxHQUVBLFNBRkEsR0FFQSxTQUZBLEdBRUEsS0FGQSxHQUVBLFFBRkEsR0FHQSxNQUhBO0FBSUE7O0FBRUEsWUFBQSxNQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLEVB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QUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGNBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsYUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxJQUFBLENBQUEscUJBQUEsS0FBQSxFQUFBLEtBQUEsQ0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsY0FBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSxTQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsS0FGQTs7QUFJQSxXQUFBLFdBQUE7QUFDQSxDQXhCQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxhQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7O0FBRUEsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFBLGVBQUEsSUFBQSxJQUFBO0FBQUEsS0FBQTtBQUNBLFFBQUEsVUFBQSxtQkFBQTtBQUNBLFFBQUEsVUFBQSxTQUFBLE9BQUEsQ0FBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxtQkFBQSxLQUFBLFNBQUEsR0FBQSxRQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsS0FIQTtBQUlBLFFBQUEsY0FBQSxFQUFBO0FBQ0EsZ0JBQUEsVUFBQSxHQUFBLEVBQUE7O0FBRUEsZ0JBQUEsZ0JBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsSUFBQSxDQUFBLFNBQUEsSUFBQSxFQUFBLFlBQUEsVUFBQTtBQUNBLG1CQUFBLFlBQUEsVUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSxTQU5BLEVBT0EsSUFQQSxDQU9BLFVBQUEsS0FBQSxFQUFBO0FBQ0Esd0JBQUEsVUFBQSxHQUFBLE1BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQTtBQUNBLHVCQUFBLEtBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQSxVQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsT0FBQSxDQUFBO0FBQ0EsU0FYQSxDQUFBO0FBWUEsS0FiQTs7QUFlQSxnQkFBQSxVQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG9CQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxZQUFBLFVBQUE7QUFDQSxtQkFBQSxZQUFBLFVBQUE7QUFDQSxTQUpBLENBQUE7QUFLQSxLQU5BOztBQVFBLGdCQUFBLGtCQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLFlBQUEsS0FBQSxVQUFBLENBQUEsTUFBQSxDQUFBO0FBQUEsbUJBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQTtBQUFBLFNBQUEsQ0FBQTtBQUNBLGVBQUEsVUFBQSxNQUFBLEdBQUEsVUFBQSxDQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxTQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsWUFBQSxZQUFBLGtCQUFBLENBQUEsU0FBQSxDQUFBO0FBQ0EsWUFBQSxTQUFBLEVBQUE7QUFDQSxtQkFBQSxZQUNBLGNBREEsQ0FDQSxVQUFBLEVBREEsRUFDQSxVQUFBLFFBREEsRUFDQSxLQURBLEVBQ0EsUUFEQSxDQUFBO0FBRUEsU0FIQSxNQUdBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLElBQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0Esb0JBQUEsT0FBQSxTQUFBLElBQUE7QUFDQSw0QkFBQSxVQUFBLENBQUEsSUFBQSxDQUFBLElBQUE7QUFDQSx1QkFBQSxJQUFBO0FBQ0EsYUFMQSxDQUFBO0FBTUE7QUFDQTtBQUNB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REEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsUUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLE9BQUEsR0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0Esd0JBQUEsWUFBQSxHQUFBLFVBQUEsV0FBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxZQUFBLEdBQUEsV0FBQSxFQUFBLElBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLFVBQUEsSUFBQSxTQUFBO0FBQ0EsbUJBQUEsU0FBQTtBQUNBLFNBVEEsQ0FBQTtBQVVBLEtBWEE7QUFZQSx3QkFBQSxlQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsTUFBQSxDQUFBLFVBQUEsWUFBQSxHQUFBLFdBQUEsRUFDQSxPQURBLENBQ0EsWUFBQTtBQUNBLHdCQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQTtBQUNBLGdCQUFBLGFBQUEsaUJBQUEsU0FBQSxDQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsdUJBQUEsVUFBQSxFQUFBLEtBQUEsV0FBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLDZCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBUEEsQ0FBQTtBQVFBLEtBVEE7O0FBV0EsV0FBQSxtQkFBQTtBQUVBLENBM0RBOztBQ0FBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBR0EsUUFBQSxVQUFBLGdCQUFBO0FBQ0EsUUFBQSxVQUFBLFNBQUEsT0FBQTtBQUFB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QUEsRUFEQSxDQUNBO0FBQ0Esd0JBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLHVCQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQTtBQUNBLGFBRkE7QUFHQSxtQkFBQSxXQUFBO0FBQ0EsU0FQQSxDQUFBO0FBUUEsS0FUQTtBQVVBLGdCQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxVQUFBLG1CQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsQ0FBQTtBQUVBLEtBSEE7O0FBS0EsZ0JBQUEsVUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsSUFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZ0JBQUEsYUFBQSxZQUFBLFNBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxhQUZBLENBQUE7QUFHQSx3QkFBQSxVQUFBLElBQUEsSUFBQTtBQUNBLG1CQUFBLElBQUE7QUFDQSxTQVJBLENBQUE7QUFTQSxLQVZBOztBQVlBLGdCQUFBLFVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsT0FBQSxDQUFBLFlBQUE7QUFDQSxnQkFBQSxhQUFBLFlBQUEsU0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsdUJBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUdBLHdCQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTEEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsZ0JBQUEsdUJBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxtQkFBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBRUEsSUFGQSxDQUVBLFVB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QkFBQSxHQURBO0FBRUEscUJBQUEscURBRkE7QUFHQSxlQUFBO0FBQ0Esc0JBQUE7QUFEQSxTQUhBO0FBTUEsb0JBQUE7QUFOQSxLQUFBO0FBUUEsQ0FUQTs7QUNDQSxJQUFBLFVBQUEsQ0FBQSxjQUFBLEVBQUEsQ0FDQSxRQURBLEVBQ0EsVUFBQSxNQUFBLEVBQUE7QUFDQSxXQUFBLE9BQUEsR0FBQTtBQUNBLGFBQUEsbUNBREE7QUFFQSxjQUFBLFVBRkE7QUFHQSxrQkFBQTtBQUhBLEtBQUE7QUFLQSxDQVBBLENBQUE7O0FDQ0EsQ0FBQSxZQUFBO0FBQ0EsWUFBQSxNQUFBLENBQUEsVUFBQSxFQUFBLEVBQUEsRUFFQSxTQUZBLENBRUEsUUFGQSxFQUVBLENBQ0EsU0FEQSxFQUNBLFlBREEsRUFDQSxVQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUE7QUFDQSxlQUFBO0FBQ0Esc0JBQUEsR0FEQTtBQUVBLG1CQUFBO0FBQ0Esd0JBQUE7QUFEQSxhQUZBOztBQU1BLGtCQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxDQUFBLFFBQUEsRUFBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEscUNBQUEsRUFBQSxZQUFBO0FBQ0EsZ0NBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLG1DQUFBLFdBQUEsYUFEQTtBQUVBLG1DQUFBLElBRkE7QUFHQSxxQ0FBQTtBQUhBLHlCQUFBO0FBS0E7QUFDQSxxQkFQQTtBQVFBLGlCQVZBLE1BVUE7QUFDQTtBQUNBOztBQUVBLG9CQUFBLGFBQUEsS0FBQTtBQUNBLHlCQUFBLGdCQUFBLEdBQUE7QUFDQSx3QkFBQSxDQUFBLENBQUEsTUFBQSxNQUFBLElBQUEsQ0FBQSxNQUFBLE1BQUEsSUFBQSxDQUFBLFVBQUEsRUFBQTtBQUNBO0FBQ0EscUNBQUEsSUFBQTtBQUNBLDRCQUFBLGNBQUEsTUFBQSxNQUFBLENBQUEsUUFBQSxFQUFBLFVBQUEsUUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGdDQUFBLFFBQUEsRUFBQTtBQUNB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QTtBQU9BLGNBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtBQUNBLGtCQUFBLFlBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLG9DQUFBLFlBQUEsQ0FBQSxFQUFBLEVBQUEsTUFBQSxPQUFBO0FBQ0EsYUFGQTtBQUdBLGtCQUFBLGVBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLG9DQUFBLGVBQUEsQ0FBQSxFQUFBO0FBQ0EsYUFGQTtBQUdBO0FBZEEsS0FBQTtBQWdCQSxDQWpCQTs7QUNDQSxJQUFBLFNBQUEsQ0FBQSxzQkFBQSxFQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxlQUFBO0FBQ0Esa0NBQUE7QUFEQSxTQUZBO0FBS0EsY0FBQSxjQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLGNBQUEsT0FBQSxFQUFBLEVBQUEsQ0FBQSxPQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxlQUFBO0FBQ0EsYUFGQTs7QUFNQSxzQkFBQSxFQUFBLENBQUEsT0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0Esb0JBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxLQUFBLFdBQUEsSUFBQSxFQUFBLE1BQUEsQ0FBQSxFQUFBLEtBQUEsb0JBQUEsRUFBQTtBQUNBLHdCQUFBLE9BQUEsRUFBQSxNQUFBLElBQUEsQ0FBQSxHQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUNBLDhCQUFBLE1BQUEsQ0FBQSxZQUFBOztBQUVBLGtDQUFBLEtBQUEsQ0FBQSxNQUFBLG9CQUFBO0FBQ0EseUJBSEE7QUFJQTtBQUNBO0FBQ0EsYUFUQTtBQVdBO0FBeEJBLEtBQUE7QUEwQkEsQ0EzQkEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcblxud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2FuZ3VsaWtlJywgJ2ZzYVByZUJ1aWx0JywgJ25nUGFzc3dvcmQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAndWkubWF0ZXJpYWxpemUnLCAnYW5ndWxhci1pbnB1dC1zdGFycycsJ2FuZ3VsYXItc3RyaXBlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIsc3RyaXBlUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbiAgICAkdWlWaWV3U2Nyb2xsUHJvdmlkZXIudXNlQW5jaG9yU2Nyb2xsKCk7XG5cbiAgICAvLyBzdHJpcGVQcm92aWRlci5zZXRQdWJsaXNoYWJsZUtleSgnbXlfa2V5Jyk7XG5cbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7ICBcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgJHJvb3RTY29wZS5mYWNlYm9va0FwcElkID0gJzk0MTAzODI4MjY4NjI0Mic7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsIlxuYXBwLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIGFsbFVzZXJPcmRlcnMsICRsb2csIGFsbFByb2R1Y3RzLCBhbGxVc2VycywgYWxsT3JkZXJEZXRhaWxzLCBNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG5cbiAgICAkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0cztcbiAgICAkc2NvcGUudXNlcnMgPSBhbGxVc2VycztcbiAgICAkc2NvcGUudXNlck9yZGVycyA9IGFsbFVzZXJPcmRlcnM7XG5cbiAgICAvL2FkZGluZyBzdGF0dXMgdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFN0YXR1cyhvcmRlckRldGFpbC51c2VyT3JkZXJJZClcbiAgICBcdC50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgXHRcdG9yZGVyRGV0YWlsLnN0YXR1cyA9IHN0YXR1cztcbiAgICBcdH0pLmNhdGNoKCRsb2cuZXJyb3IpO1xuICAgIH0pXG5cbiAgICAvL2FkZGluZyB1c2VyIGluZm8gdG8gZWFjaCBvcmRlckRldGFpbFxuICAgIGFsbE9yZGVyRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyRGV0YWlsKXtcbiAgICBcdE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmluZFVzZXIob3JkZXJEZXRhaWwudXNlck9yZGVySWQpXG4gICAgXHQudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICBcdFx0b3JkZXJEZXRhaWwudXNlciA9IHVzZXI7XG4gICAgXHR9KS5jYXRjaCgkbG9nLmVycm9yKTtcbiAgICB9KVxuICAgIGFsbE9yZGVyRGV0YWlscyA9IGFsbE9yZGVyRGV0YWlscy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLnVzZXJPcmRlcklkIC0gYi51c2VyT3JkZXJJZDtcbiAgICB9KTtcbiAgICBhbGxPcmRlckRldGFpbHMgPSBfLmdyb3VwQnkoYWxsT3JkZXJEZXRhaWxzLCAndXNlck9yZGVySWQnKVxuICAgICRzY29wZS5vcmRlcnMgPSAkLm1hcChhbGxPcmRlckRldGFpbHMsZnVuY3Rpb24gKG9yZGVyLCBpKSB7XG4gICAgICAgIGlmIChpKSByZXR1cm4gW29yZGVyXTtcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCRzY29wZS5vcmRlcnMpO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FkbWluJywge1xuICAgICAgICB1cmw6ICcvYWRtaW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FkbWluL2FkbWluLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWRtaW5DdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgICAgYWxsUHJvZHVjdHM6IGZ1bmN0aW9uIChQcm9kdWN0RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbFVzZXJzOiBmdW5jdGlvbiAoVXNlckZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXNlckZhY3RvcnkuZmV0Y2hBbGwoKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbE9yZGVyRGV0YWlsczogZnVuY3Rpb24oTWFuYWdlT3JkZXJzRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxVc2VyT3JkZXJzOiBmdW5jdGlvbihNYW5hZ2VPcmRlcnNGYWN0b3J5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbFVzZXJPcmRlcnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59KVxuIiwiIGFwcC5jb250cm9sbGVyKCdDYXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGxvZywgY2FydENvbnRlbnQsIENhcnRGYWN0b3J5KXtcbiBcdCRzY29wZS5jYXJ0Q29udGVudD1jYXJ0Q29udGVudDtcblxuIFx0JHNjb3BlLnJlbW92ZT0gZnVuY3Rpb24ob3JkZXJJZCkge1xuIFx0XHRDYXJ0RmFjdG9yeS5yZW1vdmVGcm9tQ2FydChvcmRlcklkKVxuIFx0XHQudGhlbihmdW5jdGlvbihuZXdDYXJ0KXtcbiBcdFx0XHQkc2NvcGUuY2FydENvbnRlbnQgPSBuZXdDYXJ0O1xuIFx0XHR9KS5jYXRjaCgkbG9nKVxuIFx0fVxuXG4gXHQkc2NvcGUuY2hhbmdlUXVhbnRpdHk9IGZ1bmN0aW9uIChjYXJ0SWQsIHF1YW50aXR5LCBhZGRPclN1YnRyYWN0KSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmNoYW5nZVF1YW50aXR5KGNhcnRJZCwgcXVhbnRpdHksIGFkZE9yU3VidHJhY3QpO1xuICAgICAgICAkc2NvcGUuY2FydENvbnRlbnQgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgIH07XG5cbiAgJHNjb3BlLmNoZWNrb3V0ID0gQ2FydEZhY3RvcnkuY2hlY2tvdXQ7XG5cbiAgJHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvdGFsID0gMDtcbiAgICBjYXJ0Q29udGVudC5mb3JFYWNoKGNhcnQgPT4gdG90YWwgKz0gKGNhcnQucHJpY2UgKiBjYXJ0LnF1YW50aXR5KSlcblxuICAgIHJldHVybiB0b3RhbDsgIFxuICB9XG4gfSlcblxuICIsIiBcbiBhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcbiBcdCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjYXJ0Jywge1xuIFx0XHR1cmw6Jy9jYXJ0JyxcbiBcdFx0dGVtcGxhdGVVcmw6J2pzL2NhcnQvY2FydC5odG1sJyxcbiBcdFx0Y29udHJvbGxlcjonQ2FydEN0cmwnLFxuIFx0XHRyZXNvbHZlOntcbiBcdFx0XHRjYXJ0Q29udGVudDpmdW5jdGlvbihDYXJ0RmFjdG9yeSl7XG5cbiBcdFx0XHRcdHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KCk7XG4gICAgICAgICAgICAgICAgICBcbiBcdFx0XHR9ICAgICAgICAgICAgICAgICAgICAgICAgXG4gXHRcdH0gICAgICAgICAgICAgICBcbiBcdH0pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gfSkgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICIsImFwcC5jb250cm9sbGVyKCdDaGVja291dEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGl0ZW1zKVxuICAgICAgICAkc2NvcGUuaXRlbXMgPSBpdGVtcztcblxuICBcdFx0XHQvL2NhbGN1bGF0aW5nIHRvdGFsIHByaWNlIGFuZCBwdXQgdGhhdCBpbnRvICRzY29wZS50b3RhbFxuICAgICAgICB2YXIgaXRlbXNBcnIgPSBpdGVtcztcbiAgICAgICAgdmFyIHRvdGFsUHJpY2VFYWNoID0gW107XG4gICAgICAgIGl0ZW1zQXJyLmZvckVhY2goZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICAgIFx0dG90YWxQcmljZUVhY2gucHVzaChlbGVtZW50LnByaWNlICogZWxlbWVudC5xdWFudGl0eSk7XG4gICAgICAgIH0pXG4gICAgICAgICRzY29wZS50b3RhbCA9IHRvdGFsUHJpY2VFYWNoLnJlZHVjZSggKHByZXYsIGN1cnIpID0+IHByZXYgKyBjdXJyICk7XG4gICAgfSlcblxuICAgICRzY29wZS5jaGVja291dCA9IENhcnRGYWN0b3J5LmNoZWNrb3V0O1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2hlY2tvdXQnLCB7XG4gICAgICAgIHVybDogJy9jaGVja291dCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY2hlY2tvdXQvY2hlY2tvdXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDaGVja291dEN0cmwnXG4gICAgfSk7XG59KTtcbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFsnYW5ndWxpa2UnLCAnZnNhUHJlQnVpbHQnLCduZ1Bhc3N3b3JkJywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJywgJ3VpLm1hdGVyaWFsaXplJywgJ2FuZ3VsYXItaW5wdXQtc3RhcnMnLCdhbmd1bGFyLXN0cmlwZSddKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7ICAgXG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhLnVzZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuaXNBZG1pbiA9IGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gdXNlci5pc0FkbWluO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ09yZGVySGlzdG9yaWVzQ3RybCcsIGZ1bmN0aW9uICgkbG9nLCAkc2NvcGUsIE9yZGVySGlzdG9yaWVzRmFjdG9yeSwgQ2FydEZhY3RvcnkpIHtcblxuICAgIE9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCgpXG4gICAgLnRoZW4oZnVuY3Rpb24gKHVzZXJPcmRlcnNBcnIpIHtcblxuICAgICAgICB1c2VyT3JkZXJzQXJyLnBhaWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGFyciwgaSl7XG4gICAgICAgICAgICBhcnIuZGF0ZSA9IG5ldyBEYXRlKHVzZXJPcmRlcnNBcnIuZGF0ZVtpXSkudG9TdHJpbmcoKTtcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgICRzY29wZS51c2VyT3JkZXJzID0gdXNlck9yZGVyc0Fyci5wYWlkSXRlbXM7XG4gICAgfSlcbiAgICAuY2F0Y2goJGxvZyk7XG4gICAgXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnb3JkZXJIaXN0b3JpZXMnLCB7XG4gICAgICAgIHVybDogJy9oaXN0b3JpZXMnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hpc3Rvcnkvb3JkZXJIaXN0b3JpZXMuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdPcmRlckhpc3Rvcmllc0N0cmwnXG4gICAgICAgIFxuICAgIH0pO1xufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdhbmltYXRpb24nLCBmdW5jdGlvbiAoJHN0YXRlKSB7XG4gICAgdmFyIGFuaW1hdGlvbkVuZEV2ZW50cyA9ICd3ZWJraXRBbmltYXRpb25FbmQgb2FuaW1hdGlvbmVuZCBtc0FuaW1hdGlvbkVuZCBhbmltYXRpb25lbmQnO1xuICAgIHZhciBjcmVhdGVDaGFyYWN0ZXJzID0gZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAgICAgICAgYXNoOiBbXG4gICAgICAgICAgICAgICAgJ2FzaCcsXG4gICAgICAgICAgICAgICAgJ2FzaC1ncmVlbi1iYWcnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG90aGVyczogW1xuICAgICAgICAgICAgICAgICdqYW1lcycsXG4gICAgICAgICAgICAgICAgJ2Nhc3NpZHknLFxuICAgICAgICAgICAgICAgICdqZXNzaWUnXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WSAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCggTWF0aC5yYW5kb20oKSAqIDMgKSArIDI5KS50b0ZpeGVkKDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0WiAoeSkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDIwIC0geSkgKiAxMDApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmFuZG9tQ2hhcmFjdGVycyAod2hvKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyc1t3aG9dWyBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogY2hhcmFjdGVyc1t3aG9dLmxlbmd0aCApIF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYWtlQ2hhcmFjdGVyICh3aG8pIHtcblxuICAgICAgICAgICAgdmFyIHhEZWxheSA9ICggd2hvID09PSAnYXNoJyApID8gNCA6IDQuODtcbiAgICAgICAgICAgIHZhciBkZWxheSA9ICctd2Via2l0LWFuaW1hdGlvbi1kZWxheTogJyArICggTWF0aC5yYW5kb20oKSAqIDIuNyArIHhEZWxheSApLnRvRml4ZWQoMykgKyAnczsnO1xuICAgICAgICAgICAgdmFyIGNoYXJhY3RlciA9IHJhbmRvbUNoYXJhY3RlcnMoIHdobyApO1xuICAgICAgICAgICAgdmFyIGJvdHRvbSA9IGdldFkoKTtcbiAgICAgICAgICAgIHZhciB5ID0gJ2JvdHRvbTogJysgYm90dG9tICsnJTsnO1xuICAgICAgICAgICAgdmFyIHogPSAnei1pbmRleDogJysgZ2V0WiggYm90dG9tICkgKyAnOyc7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBcInN0eWxlPSdcIitkZWxheStcIiBcIit5K1wiIFwiK3orXCInXCI7XG5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICtcbiAgICAgICAgICAgICAgICBcIjxpIGNsYXNzPSdcIiArIGNoYXJhY3RlciArIFwiIG9wZW5pbmctc2NlbmUnIFwiKyBzdHlsZSArIFwiPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8aSBjbGFzcz1cIiArIGNoYXJhY3RlciArIFwiLXJpZ2h0IFwiICsgXCJzdHlsZT0nXCIrIGRlbGF5ICsgXCInPjwvaT5cIiArXG4gICAgICAgICAgICAgICAgXCI8L2k+XCI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXNoID0gTWF0aC5mbG9vciggTWF0aC5yYW5kb20oKSAqIDE2ICkgKyAxNjtcbiAgICAgICAgdmFyIG90aGVycyA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiA4ICkgKyA4O1xuXG4gICAgICAgIHZhciBob3JkZSA9ICcnO1xuXG4gICAgICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGFzaDsgaSsrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ2FzaCcgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoIHZhciBqID0gMDsgaiA8IG90aGVyczsgaisrICkge1xuICAgICAgICAgICAgaG9yZGUgKz0gbWFrZUNoYXJhY3RlciggJ290aGVycycgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdodW1hbnMnKS5pbm5lckhUTUwgPSBob3JkZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicnVubmluZy1hbmltYXRpb25cIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUgb3BlbmluZy1zY2VuZVwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cInBpa2FjaHUtcmlnaHRcIj48L2k+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJxdW90ZSBleGNsYW1hdGlvblwiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzwvaT4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiaHVtYW5zXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICBjb21waWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHByZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbWFpbicpLmFkZENsYXNzKCdoZXJlJylcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlQ2hhcmFjdGVycygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcG9zdDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICQoJy5vcGVuaW5nLXNjZW5lJykuYWRkQ2xhc3MoJ21vdmUnKVxuICAgICAgICAgICAgICAgICAgICAkKCcubW92ZScpLm9uKGFuaW1hdGlvbkVuZEV2ZW50cywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnc3RvcmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzY29wZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIH1cbiAgICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVzZXQnLCB7XG4gICAgICAgIHVybDogJy9yZXNldCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwYXNzd29yZCcsIHtcbiAgICAgICAgdXJsOiAnL3Jlc2V0L3Bhc3N3b3JkLzp0b2tlbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vcGFzc3dvcmQucmVzZXQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSlcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlLCBBdXRoRmFjdG9yeSwgJHN0YXRlUGFyYW1zLCBDYXJ0RmFjdG9yeSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcbiAgICAkc2NvcGUudG9rZW4gPSAkc3RhdGVQYXJhbXMudG9rZW47XG5cbiAgICAkc2NvcGUuZm9yZ2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAoZW1haWwpIHtcbiAgICAgICAgQXV0aEZhY3RvcnkuZm9yZ2V0UGFzc3dvcmQoZW1haWwpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0NoZWNrIHlvdXIgZW1haWwnLCAxMDAwKTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgICRzY29wZS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBwYXNzd29yZCkge1xuICAgICAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkKHBhc3N3b3JkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICB9KVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoY2FydCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdzdG9yZScpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobG9naW5JbmZvKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTtcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL21lbWJlcnMtYXJlYScsXG4gICAgICAgIHRlbXBsYXRlOiAnPGltZyBuZy1yZXBlYXQ9XCJpdGVtIGluIHN0YXNoXCIgd2lkdGg9XCIzMDBcIiBuZy1zcmM9XCJ7eyBpdGVtIH19XCIgLz4nLFxuICAgICAgICBjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCBTZWNyZXRTdGFzaCkge1xuICAgICAgICAgICAgU2VjcmV0U3Rhc2guZ2V0U3Rhc2goKS50aGVuKGZ1bmN0aW9uIChzdGFzaCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zdGFzaCA9IHN0YXNoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGF1dGhlbnRpY2F0ZTogdHJ1ZVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnU2VjcmV0U3Rhc2gnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRTdGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9tZW1iZXJzL3NlY3JldC1zdGFzaCcpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFN0YXNoOiBnZXRTdGFzaFxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdQYXltZW50Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSxVc2VyRmFjdG9yeSwgJHN0YXRlLCAkbG9nLCBDYXJ0RmFjdG9yeSwgdG90YWxDb3N0LCBhcnJheU9mSXRlbXMpe1xuICAkc2NvcGUuaW5mbyA9IHt9O1xuICBcbiAgJHNjb3BlLnZhbGlkYXRlVXNlcj0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIFVzZXJGYWN0b3J5LnVwZGF0ZVVzZXJCZWZvcmVQYXltZW50KCRzY29wZS5pbmZvKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuc2hvd0NDID0gdHJ1ZTtcbiAgICAgICAgfSkuY2F0Y2goJGxvZy5lcnJvcilcbiAgICAgICAgXG4gIH1cbiAgJHNjb3BlLmVkaXQ9ZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ2NhcnQnKVxuICB9XG5cbiAgJHNjb3BlLnRvdGFsQ29zdCA9IHRvdGFsQ29zdDtcbiAgJHNjb3BlLmFycmF5T2ZJdGVtcyA9IGFycmF5T2ZJdGVtcztcbiAgJHNjb3BlLnN0cmluZ09mSXRlbXMgPSBhcnJheU9mSXRlbXMubWFwKGl0ZW0gPT4gaXRlbS50aXRsZSkuam9pbignLCcpXG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3BheW1lbnQnLCB7XG4gICAgICAgIHVybDogJy9wYXltZW50JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wYXltZW50L3BheW1lbnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1BheW1lbnRDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIHRvdGFsQ29zdDogZnVuY3Rpb24oQ2FydEZhY3RvcnkpIHsgcmV0dXJuIENhcnRGYWN0b3J5LmdldFRvdGFsQ29zdCgpIH0sXG4gICAgICAgICAgYXJyYXlPZkl0ZW1zOiBmdW5jdGlvbihDYXJ0RmFjdG9yeSkgeyByZXR1cm4gQ2FydEZhY3RvcnkuZmV0Y2hBbGxGcm9tQ2FydCgpIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4gIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgdGhlUHJvZHVjdCwgYWxsUmV2aWV3cywgUHJvZHVjdEZhY3RvcnksIENhcnRGYWN0b3J5KSB7XG4gICAgLy8gcHJvZHVjdFxuICAgICRzY29wZS5uZXdSZXZpZXcgPSB7fTtcbiAgICAkc2NvcGUucHJvZHVjdCA9IHRoZVByb2R1Y3Q7XG4gICAgJHNjb3BlLnJldmlld3MgPSBhbGxSZXZpZXdzO1xuICAgIC8vIHJldmlld1xuICAgICRzY29wZS5tb2RhbE9wZW4gPSBmYWxzZTtcbiAgICAkc2NvcGUuc3VibWl0UmV2aWV3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubmV3UmV2aWV3LnByb2R1Y3RJZCA9ICRzY29wZS5wcm9kdWN0LmlkO1xuICAgICAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcoJHNjb3BlLnByb2R1Y3QuaWQsICRzY29wZS5uZXdSZXZpZXcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnJldmlld3MgPSBQcm9kdWN0RmFjdG9yeS5jYWNoZWRSZXZpZXdzO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1JldmlldyA9IHt9O1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEnLCAxMDAwKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1NvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBhZGQgdG8gY2FydFxuICAgICRzY29wZS5hZGRUb0NhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCgkc2NvcGUucHJvZHVjdC5pZCwgJHNjb3BlLnF1YW50aXR5KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1RoYW5rIHlvdSEgWW91ciBpdGVtIHdhcyBhZGRlZCB0byB5b3VyIGNhcnQhJywgMTAwMCk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICAkc2NvcGUuYXJyYXlNYWtlciA9IGZ1bmN0aW9uIChudW0pe1xuICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9bnVtOyBpICsrKXtcbiAgICAgICAgICAgIGFyci5wdXNoKGkpXG4gICAgICAgIH0gIFxuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH1cblxufSkgICBcblxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZHVjdCcsIHtcbiAgICAgICAgYXV0b3Njcm9sbDogJ3RydWUnLFxuICAgICAgICB1cmw6ICcvcHJvZHVjdHMvOnByb2R1Y3RJZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdC9wcm9kdWN0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICB0aGVQcm9kdWN0OiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQoJHN0YXRlUGFyYW1zLnByb2R1Y3RJZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWxsUmV2aWV3czogZnVuY3Rpb24oUHJvZHVjdEZhY3RvcnksICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeS5mZXRjaEFsbFJldmlld3MoJHN0YXRlUGFyYW1zLnByb2R1Y3RJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2ZpbGVDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBVc2VyRmFjdG9yeSwgJHN0YXRlKXtcblx0ICAgIFVzZXJGYWN0b3J5LmZldGNoT25lKClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICRzY29wZS51c2VyID0gdXNlcjtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1NvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pIFxuXG4gICAgICAkc2NvcGUudXNlciA9IHt9O1xuICAgICAgJHNjb3BlLnJldmlld3M9IHt9O1xuICAgXG5cbiAgJHNjb3BlLnNhdmVVc2VySW5mbz0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQoJHNjb3BlLnVzZXIpIFxuICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnWW91IHN1Y2Nlc3NmdWxseSB1cGRhdGVkIHlvdXIgcHJvZmlsZSEnLCAxMDAwKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1NvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMCk7XG4gICAgICAgIH0pICAgXG4gIH1cbiAgJHNjb3BlLmRvbnRTYXZlSW5mbz1mdW5jdGlvbigpe1xuICAgICAkc3RhdGUuZ28oJ3N0b3JlJyk7XG4gIH1cbiAgJHNjb3BlLnNob3dSZXZpZXdzPWZ1bmN0aW9uKCl7XG4gICAgVXNlckZhY3RvcnkuZmV0Y2hPbmVSZXZpZXcoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJldmlld3Mpe1xuICAgICAgY29uc29sZS5sb2coXCJoZWxsb29vb1wiLCByZXZpZXdzKVxuICAgICAgJHNjb3BlLnJldmlld3MgPSByZXZpZXdzO1xuICAgIH0pXG4gIH1cblxuXG59KVxuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9maWxlJywge1xuICAgICAgICAgICAgIHVybDogJy91c2VyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J1Byb2ZpbGVDdHJsJyxcbiAgICB9KTtcbn0pO1xuICAgICAgICAgICAgICAgIFxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWdudXBDdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuICBhcHAuY29udHJvbGxlcignU2lnbnVwQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhGYWN0b3J5LCAkc3RhdGUpIHtcbiAgICAkc2NvcGUuc2lnbnVwID0ge307IFxuICAgICRzY29wZS5zZW5kU2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgQXV0aEZhY3Rvcnkuc2lnbnVwKHNpZ251cEluZm8pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSAnZW1haWwgZXhpc3RzIGFscmVhZHknKSB7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCAyMDAwKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ25vdCBhIHZhbGlkIGVtYWlsJyl7XG4gICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0l0IGlzIG5vdCBhIHZhbGlkIGVtYWlsJywgMjAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyZXNwb25zZSA9PT0gJ3Bhc3N3b3JkcyBkbyBub3QgbWF0Y2gnKXtcbiAgICAgICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdCgnWW91ciBwYXNzd29yZHMgZG8gbm90IG1hdGNoLiBQbGVhc2UgdHJ5IGFnYWluIScsIDIwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdHbyBhaGVhZCBhbmQgbG9naW4nLCA0MDAwKTtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuICAgICRzY29wZS5nb29nbGVTaWdudXAgPSBBdXRoRmFjdG9yeS5nb29nbGVTaWdudXA7XG59KTtcblxuXG4iLCJhcHAuY29udHJvbGxlcignU3RvcmVDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgcHJvZHVjdHMpIHtcbiAgICAkc2NvcGUucHJvZHVjdHMgPSBwcm9kdWN0cztcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzdG9yZScsIHtcbiAgICAgICAgdXJsOiAnL3N0b3JlJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9zdG9yZS9zdG9yZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1N0b3JlQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHByb2R1Y3RzOiBmdW5jdGlvbiAoUHJvZHVjdEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvZHVjdEZhY3RvcnkuZmV0Y2hBbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnT3JkZXJIaXN0b3JpZXNGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgY2FjaGVkQ2FydCA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL3BhaWQvJ1xuICAgIHZhciBvcmRlckhpc3Rvcmllc0ZhY3RvcnkgPSB7fTtcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcblxuICAgIG9yZGVySGlzdG9yaWVzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZENhcnQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuIFxuXG4gICAgcmV0dXJuIG9yZGVySGlzdG9yaWVzRmFjdG9yeTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnQXV0aEZhY3RvcnknLCAgZnVuY3Rpb24oJGh0dHApe1xuXG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG5cbiAgICB2YXIgQXV0aEZhY3RvcnkgPSB7fTtcblxuXG4gICAgQXV0aEZhY3Rvcnkuc2lnbnVwID0gZnVuY3Rpb24gKHNpZ251cEluZm8pIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9zaWdudXAnLCBzaWdudXBJbmZvKS50aGVuKGdldERhdGEpXG4gICAgfVxuXG4gICAgQXV0aEZhY3RvcnkuZ29vZ2xlU2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXV0aC9nb29nbGUnKTtcbiAgICB9XG5cbiAgICBBdXRoRmFjdG9yeS5yZXNldFBhc3N3b3JkID0gZnVuY3Rpb24gKHRva2VuLCBsb2dpbikge1xuICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL3Jlc2V0L3Bhc3N3b3JkLycgKyB0b2tlbiwgbG9naW4pO1xuICAgIH1cblxuICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkID0gZnVuY3Rpb24gKGVtYWlsKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvZm9yZ290JywgZW1haWwpO1xuICAgIH1cblxuICAgIHJldHVybiBBdXRoRmFjdG9yeTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0NhcnRGYWN0b3J5JywgZnVuY3Rpb24gKCRodHRwLCAkbG9nLCAkc3RhdGUsICRyb290U2NvcGUpIHtcblxuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvb3JkZXJzL2NhcnQvJztcbiAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGl0ZW0uaW1hZ2VVcmwgPSAnL2FwaS9wcm9kdWN0cy8nICsgaXRlbS5wcm9kdWN0SWQgKyAnL2ltYWdlJztcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHZhciBDYXJ0RmFjdG9yeSA9IHt9O1xuICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQgPSBbXTtcblxuICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LnNvcnQoZnVuY3Rpb24gKGEsYil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGIuaWQgLSBhLmlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgICAgICBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0ID0gaXRlbXMubWFwKGNvbnZlcnQpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgndXBkYXRlQ2FydCcsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1zLm1hcChjb252ZXJ0KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5kZWxldGVJdGVtID0gZnVuY3Rpb24ocHJvZHVjdElkKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZShiYXNlVXJsICsgcHJvZHVjdElkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydClcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyA9IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICAgIHZhciBkdXBsaWNhdGUgPSB0aGlzLmNhY2hlZENhcnQuZmlsdGVyKGl0ZW0gPT4gaXRlbS5wcm9kdWN0SWQgPT09IHByb2R1Y3RJZCk7XG4gICAgICAgIHJldHVybiAoZHVwbGljYXRlLmxlbmd0aCkgPyBkdXBsaWNhdGVbMF0gOiBudWxsO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZFRvQ2FydCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICBcbiAgICAgICAgdmFyIGR1cGxpY2F0ZSA9IENhcnRGYWN0b3J5LmNoZWNrRm9yRHVwbGljYXRlcyhwcm9kdWN0SWQpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gQ2FydEZhY3RvcnlcbiAgICAgICAgICAgIC5jaGFuZ2VRdWFudGl0eShkdXBsaWNhdGUuaWQsIGR1cGxpY2F0ZS5xdWFudGl0eSwgJ2FkZCcsIHF1YW50aXR5ICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyBwcm9kdWN0SWQsIHtxdWFudGl0eTogcXVhbnRpdHl9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlRnJvbUNhcnQ9ZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIGFkZFJlbW92ZUFuaW1hdGlvbigpO1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwrb3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlKG9yZGVySWQpXG4gICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0O1xuICAgICAgICB9KVxuICAgIH1cbiAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VRdWFudGl0eT1mdW5jdGlvbihvcmRlcklkLCBxdWFudGl0eSwgYWRkT3JTdWJ0ciwgYW1vdW50ID0gMSl7XG4gICAgICAgIHZhciBydW5GdW5jPWZhbHNlO1xuICAgICAgICBpZiAoYWRkT3JTdWJ0cj09PSdhZGQnKSB7XG4gICAgICAgICAgICBhZGRTdWNjZXNzQW5pbWF0aW9uKClcbiAgICAgICAgICAgIHF1YW50aXR5Kz0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRPclN1YnRyPT09J3N1YnRyYWN0JyAmJiBxdWFudGl0eT4xKSB7XG4gICAgICAgICAgICBhZGRSZW1vdmVBbmltYXRpb24oKTtcbiAgICAgICAgICAgIHF1YW50aXR5LT0gK2Ftb3VudDtcbiAgICAgICAgICAgIHJ1bkZ1bmM9dHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVuRnVuYz09PXRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIG9yZGVySWQsIHtxdWFudGl0eTpxdWFudGl0eX0pXG4gICAgICAgICAgICAvLyAudGhlbihjb252ZXJ0KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBDYXJ0RmFjdG9yeS5jaGFuZ2VGcm9udEVuZENhY2hlUXVhbnRpdHkob3JkZXJJZCxxdWFudGl0eSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZUZyb21Gcm9udEVuZENhY2hlID0gZnVuY3Rpb24ob3JkZXJJZCl7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5mb3JFYWNoKGZ1bmN0aW9uKG9yZGVyLGkpe1xuICAgICAgICAgICAgaWYgKG9yZGVyLmlkID09PSBvcmRlcklkKSBpbmRleCA9IGk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydC5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hhbmdlRnJvbnRFbmRDYWNoZVF1YW50aXR5ID0gZnVuY3Rpb24gKG9yZGVySWQscXVhbnRpdHkpIHtcbiAgICAgICAgdmFyIGkgPSBDYXJ0RmFjdG9yeS5jYWNoZWRDYXJ0LmZpbmRJbmRleChmdW5jdGlvbihvcmRlcil7XG4gICAgICAgICAgICAvLyBpZiAob3JkZXIuaWQgPT09IG9yZGVySWQpIHtcbiAgICAgICAgICAgIC8vICAgICBvcmRlci5xdWFudGl0eSA9IHF1YW50aXR5O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgcmV0dXJuIG9yZGVyLmlkID09PSBvcmRlcklkO1xuICAgICAgICB9KTtcbiAgICAgICAgQ2FydEZhY3RvcnkuY2FjaGVkQ2FydFtpXS5xdWFudGl0eSA9IHF1YW50aXR5XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwgKyAnY2hlY2tvdXQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnb3JkZXJIaXN0b3JpZXMnKTtcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmNhY2hlZENhcnQuc3BsaWNlKDAsIENhcnRGYWN0b3J5LmNhY2hlZENhcnQubGVuZ3RoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBTb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApO1xuICAgICAgICB9KVxuICAgIH0gIFxuXG4gICAgQ2FydEZhY3RvcnkuZ2V0VG90YWxDb3N0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgIHJldHVybiBDYXJ0RmFjdG9yeS5mZXRjaEFsbEZyb21DYXJ0KClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGNhcnQpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNhcnQpXG4gICAgICAgICAgICAgICAgY2FydC5mb3JFYWNoKGl0ZW0gPT4gdG90YWwgKz0gKGl0ZW0ucHJpY2UqaXRlbS5xdWFudGl0eSkgKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhJywgdG90YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgkbG9nLmVycm9yKVxuICAgIH1cblxuXG4gICAgdmFyIGFuaW1hdGlvbkVuZCA9ICd3ZWJraXRBbmltYXRpb25FbmQgbW96QW5pbWF0aW9uRW5kIE1TQW5pbWF0aW9uRW5kIG9hbmltYXRpb25lbmQgYW5pbWF0aW9uZW5kJztcblxuICAgIGZ1bmN0aW9uIGFkZFN1Y2Nlc3NBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpLm9uZShhbmltYXRpb25FbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjYXJ0LWljb24nKS5yZW1vdmVDbGFzcygnYW5pbWF0ZWQgcnViYmVyQmFuZCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBhZGRSZW1vdmVBbmltYXRpb24oKSB7XG4gICAgICAgICQoJyNjYXJ0LWljb24nKS5hZGRDbGFzcygnYW5pbWF0ZWQgc2hha2UnKS5vbmUoYW5pbWF0aW9uRW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2FydC1pY29uJykucmVtb3ZlQ2xhc3MoJ2FuaW1hdGVkIHNoYWtlJyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICBDYXJ0RmFjdG9yeS5maW5kT25lVXNlckluZm89ZnVuY3Rpb24oKXtcbiAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2NoZWNrb3V0JylcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG5cbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ01hbmFnZU9yZGVyc0ZhY3RvcnknLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBjYWNoZWRPcmRlckRldGFpbHMgPSBbXTtcbiAgICB2YXIgY2FjaGVkVXNlck9yZGVycyA9IFtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvbWFuYWdlT3JkZXJzLydcbiAgICB2YXIgbWFuYWdlT3JkZXJzRmFjdG9yeSA9IHt9O1xuICAgIHZhciBnZXREYXRhID0gcmVzID0+IHJlcy5kYXRhO1xuXG4gICAgbWFuYWdlT3JkZXJzRmFjdG9yeS5mZXRjaEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGFuZ3VsYXIuY29weShyZXNwb25zZS5kYXRhLCBjYWNoZWRPcmRlckRldGFpbHMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkT3JkZXJEZXRhaWxzO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZmV0Y2hBbGxVc2VyT3JkZXJzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsKyAndXNlck9yZGVyJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHJlc3BvbnNlLmRhdGEsIGNhY2hlZFVzZXJPcmRlcnMpXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVXNlck9yZGVycztcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRTdGF0dXMgPSBmdW5jdGlvbih1c2VyT3JkZXJJZCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LmZpbmRVc2VyID0gZnVuY3Rpb24odXNlck9yZGVySWQpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwrICd1c2VyLycgKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICB9XG5cbiAgICBtYW5hZ2VPcmRlcnNGYWN0b3J5LnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHVzZXJPcmRlcklkLCBkYXRhKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsKyAndXNlck9yZGVyLycrIHVzZXJPcmRlcklkLCBkYXRhKVxuICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyT3JkZXIpe1xuICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoXCJVcGRhdGVkXCIsIDEwMDApO1xuICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2VyT3JkZXJzLmZpbmRJbmRleChmdW5jdGlvbiAodXNlck9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJPcmRlcnNbdXBkYXRlZEluZF0gPSB1c2VyT3JkZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyT3JkZXI7XG4gICAgICAgIH0pXG4gICAgfVxuICAgIG1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyID0gZnVuY3Rpb24gKHVzZXJPcmRlcklkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCsgJ3VzZXJPcmRlci8nKyB1c2VyT3JkZXJJZClcbiAgICAgICAgLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBNYXRlcmlhbGl6ZS50b2FzdChcIkRlbGV0ZWRcIiwgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IGNhY2hlZFVzZXJPcmRlcnMuZmluZEluZGV4KGZ1bmN0aW9uICh1c2VyT3JkZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlck9yZGVyLmlkID09PSB1c2VyT3JkZXJJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2FjaGVkVXNlck9yZGVycy5zcGxpY2UoZGVsZXRlZEluZCwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBtYW5hZ2VPcmRlcnNGYWN0b3J5O1xuXG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0RmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG5cbiAgICB2YXIgYmFzZVVybCA9ICcvYXBpL3Byb2R1Y3RzLyc7XG4gICAgdmFyIGdldERhdGEgPSByZXMgPT4gcmVzLmRhdGE7XG4gICAgdmFyIHBhcnNlVGltZVN0ciA9IGZ1bmN0aW9uIChyZXZpZXcpIHtcbiAgICAgICAgdmFyIGRhdGUgPSByZXZpZXcuY3JlYXRlZEF0LnN1YnN0cigwLCAxMCk7XG4gICAgICAgIHJldmlldy5kYXRlID0gZGF0ZTtcbiAgICAgICAgcmV0dXJuIHJldmlldztcbiAgICB9XG5cbiAgICB2YXIgUHJvZHVjdEZhY3RvcnkgPSB7fTtcbiAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0cyA9IFtdO1xuICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MgPSBbXTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocHJvZHVjdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLm1hcChQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChwcm9kdWN0cykge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvZHVjdHMsIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzKTsgLy8gd2h5IGFuZ3VsYXIgY29weSBhbHRlcnMgYXJyYXkgb3JkZXIhISEhISEhXG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkIC0gYi5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfTtcblxuICAgIFByb2R1Y3RGYWN0b3J5LnVwZGF0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dChiYXNlVXJsICsgaWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdVcGRhdGVkJywgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkSW5kID0gUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuZmluZEluZGV4KGZ1bmN0aW9uIChwcm9kdWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5jYWNoZWRQcm9kdWN0c1t1cGRhdGVkSW5kXSA9IHByb2R1Y3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgfVxuXG4gICAgUHJvZHVjdEZhY3RvcnkuZGVsZXRlUHJvZHVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGJhc2VVcmwgKyBpZCkuc3VjY2VzcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdEZWxldGVkJywgMTAwMCk7XG4gICAgICAgICAgICB2YXIgZGVsZXRlZEluZCA9IFByb2R1Y3RGYWN0b3J5LmNhY2hlZFByb2R1Y3RzLmZpbmRJbmRleChmdW5jdGlvbiAocHJvZHVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0LmlkID09PSBpZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUHJvZHVjdHMuc3BsaWNlKGRlbGV0ZWRJbmQsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5mZXRjaEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgaWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihQcm9kdWN0RmFjdG9yeS5jb252ZXJ0KTtcblxuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jb252ZXJ0ID0gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgcHJvZHVjdC5pbWFnZVVybCA9IGJhc2VVcmwgKyBwcm9kdWN0LmlkICsgJy9pbWFnZSc7XG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xuICAgIH07XG5cbiAgICBQcm9kdWN0RmFjdG9yeS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdXNlcnMvZ2V0TG9nZ2VkSW5Vc2VySWQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSByZXMuZGF0YS5pZDtcbiAgICAgICAgICAgIGRhdGEuYXV0aG9ySWQgPSBpZDtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQsIGRhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXZpZXcgPSBwYXJzZVRpbWVTdHIocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MucHVzaChyZXZpZXcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFByb2R1Y3RGYWN0b3J5LmZldGNoQWxsUmV2aWV3cyA9IGZ1bmN0aW9uIChwcm9kdWN0SWQpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9yZXZpZXdzLycgKyBwcm9kdWN0SWQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgUHJvZHVjdEZhY3RvcnkuY2FjaGVkUmV2aWV3cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb2R1Y3RGYWN0b3J5LmNhY2hlZFJldmlld3MubWFwKHBhcnNlVGltZVN0cik7XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBQcm9kdWN0RmFjdG9yeTtcblxufSlcbiIsImFwcC5mYWN0b3J5KCdVc2VyRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuICAgIHZhciBVc2VyRmFjdG9yeSA9IHt9O1xuICAgICAgICBVc2VyRmFjdG9yeS5jYWNoZWRSZXZpZXdzPVtdO1xuICAgIHZhciBjYWNoZWRVc2VycyA9IFtdO1xuICAgIHZhciB0ZXN0PVtdO1xuICAgIHZhciBiYXNlVXJsID0gJy9hcGkvdXNlcnMvJztcbiAgICB2YXIgZ2V0RGF0YSA9IHJlcyA9PiByZXMuZGF0YTtcbiAgICB2YXIgcGFyc2VUaW1lU3RyID0gZnVuY3Rpb24gKHJldmlldykge1xuICAgICAgICB2YXIgZGF0ZSA9IHJldmlldy5jcmVhdGVkQXQuc3Vic3RyKDAsIDEwKTtcbiAgICAgICAgcmV2aWV3LmRhdGUgPSBkYXRlO1xuICAgICAgICByZXR1cm4gcmV2aWV3O1xuICAgIH1cblxuICAgIFVzZXJGYWN0b3J5LmZldGNoQWxsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGJhc2VVcmwpLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXNlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KHVzZXJzLCBjYWNoZWRVc2Vycyk7IC8vIHdoeSBhbmd1bGFyIGNvcHkgYWx0ZXJzIGFycmF5IG9yZGVyISEhISEhIVxuICAgICAgICAgICAgICAgICAgICBjYWNoZWRVc2Vycy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZCAtIGIuaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRVc2VycztcbiAgICAgICAgICAgICAgICB9KVxuICAgIH07XG4gICAgICBVc2VyRmFjdG9yeS5mZXRjaE9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gIH07XG5cbiAgICBVc2VyRmFjdG9yeS51cGRhdGVVc2VyID0gZnVuY3Rpb24gKGlkLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5wdXQoYmFzZVVybCArIGlkLCBkYXRhKVxuICAgICAgICAgICAgICAgIC50aGVuKGdldERhdGEpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyLmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFVzZXJzW3VwZGF0ZWRJbmRdID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoYmFzZVVybCArIGlkKS5zdWNjZXNzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZWRJbmQgPSBjYWNoZWRVc2Vycy5maW5kSW5kZXgoZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdXNlci5pZCA9PT0gaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNhY2hlZFVzZXJzLnNwbGljZShkZWxldGVkSW5kLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgVXNlckZhY3RvcnkudXBkYXRlVXNlckJlZm9yZVBheW1lbnQgPSBmdW5jdGlvbiAoaW5mb09iail7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoYmFzZVVybCArICdnZXRMb2dnZWRJblVzZXJJZCcpXG4gICAgICAgICAgICAudGhlbihnZXREYXRhKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgICAgICAgICAgaWYodXNlci5pZCA9PT0gJ3Nlc3Npb24nKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGh0dHAucHV0KCdhcGkvb3JkZXJzL2NhcnQvdXBkYXRlU2Vzc2lvbkNhcnQnLCBpbmZvT2JqKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS51cGRhdGVVc2VyKHVzZXIuaWQsaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnYXBpL29yZGVycy9jYXJ0L3VwZGF0ZVVzZXJDYXJ0JywgaW5mb09iailcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgICBVc2VyRmFjdG9yeS5mZXRjaE9uZVJldmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldChiYXNlVXJsICsgJ2dldExvZ2dlZEluVXNlcklkJylcbiAgICAgICAgLnRoZW4oZ2V0RGF0YSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcmV2aWV3cy8nICsgdXNlci5pZCArICcvcmV2aWV3cycpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkocmVzcG9uc2UuZGF0YSwgVXNlckZhY3RvcnkuY2FjaGVkUmV2aWV3cyk7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBVc2VyRmFjdG9yeS5jYWNoZWRSZXZpZXdzLm1hcChwYXJzZVRpbWVTdHIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgcmV0dXJuIFVzZXJGYWN0b3J5O1xufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgnc2hvcHBpbmdDYXJ0JywgZnVuY3Rpb24oQ2FydEZhY3RvcnksICRyb290U2NvcGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2NhcnQtcmV2ZWFsL2NhcnQtcmV2ZWFsLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgYWN0aXZlOiAnPScsXG4gICAgICAgICAgICBhZGRBbmRSZXZlYWxDYXJkOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgLy8gc2NvcGU6IHsgc2V0Rm46ICcmJyB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIENhcnRGYWN0b3J5LmZldGNoQWxsRnJvbUNhcnQoKS50aGVuKGZ1bmN0aW9uIChjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IENhcnRGYWN0b3J5LmNhY2hlZENhcnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCd1cGRhdGVDYXJ0JywgZnVuY3Rpb24gKGV2ZW50LCBjYXJ0KSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuY2FydCA9IGNhcnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgc2NvcGUucmV2ZWFsQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5zaG93Q2FydCA9ICdjaGVja291dCBjaGVja291dC0tYWN0aXZlJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5oaWRlQ2FydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5hY3RpdmUgPSAnaW5hY3RpdmUnO1xuICAgICAgICAgICAgICAgIHNjb3BlLnNob3dDYXJ0ID0gJ2NoZWNrb3V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjb3BlLnRvdGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgICAgICAgICAgICBpZihzY29wZS5jYXJ0KVxuICAgICAgICAgICAgICAgIHNjb3BlLmNhcnQuZm9yRWFjaChpdGVtID0+IHRvdGFsICs9IChpdGVtLnByaWNlICogaXRlbS5xdWFudGl0eSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIC8vIHNjb3BlLnNldEZuKHt0aGVEaXJGbjogc2NvcGUudXBkYXRlTWFwfSk7XG5cbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdTaG9wJywgc3RhdGU6ICdzdG9yZScgfSxcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudG9nZ2xlTG9nbyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5N3B4IC0zMDZweCcpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NvcGUudW50b2dnbGVMb2dvID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCgnLnBva2ViYWxsIGkuZ3JlYXQnKS5jc3MoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnLTI5M3B4IC05cHgnKVxuXG4gICAgICAgICAgICB9ICAgXG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgc2NvcGUuYWRtaW4gPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRBZG1pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhBdXRoSW50ZXJjZXB0b3IpO1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuYWRtaW4gPSBBdXRoU2VydmljZS5pc0FkbWluKHVzZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuICAgICAgICAgICAgc2V0QWRtaW4oKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCdvYXV0aEJ1dHRvbicsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBzY29wZToge1xuICAgICAgcHJvdmlkZXJOYW1lOiAnQCdcbiAgICB9LFxuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvY29tbW9uL2RpcmVjdGl2ZXMvb2F1dGgtYnV0dG9uL29hdXRoLWJ1dHRvbi5odG1sJ1xuICB9XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ29yZGVyRW50cnknLCBmdW5jdGlvbiAoTWFuYWdlT3JkZXJzRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvb3JkZXItZW50cnkvb3JkZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBvcmRlckRldGFpbHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAocywgZSwgYSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocy5vcmRlckRldGFpbHMpO1xuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckhpc3RvcnlDdHJsJywgZnVuY3Rpb24oJHNjb3BlKXtcblxufSkiLCJhcHAuZGlyZWN0aXZlKCdvcmRlckhpc3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9vcmRlci1oaXN0b3J5L29yZGVyLWhpc3RvcnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBoaXN0b3JpZXM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnT3JkZXJIaXN0b3J5Q3RybCdcbiAgIFxuICAgIH1cblxufSlcbiAgIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDYXJkQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG5cblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gW1xuICAgICAgICB7bmFtZTogJ0FsbCd9LFxuICAgICAgICB7bmFtZTogJ0ZpcmUnfSxcbiAgICAgICAge25hbWU6ICdXYXRlcid9LFxuICAgICAgICB7bmFtZTogJ0dyYXNzJ30sXG4gICAgICAgIHtuYW1lOiAnUm9jayd9LFxuICAgICAgICB7bmFtZTogJ0RyYWdvbid9LFxuICAgICAgICB7bmFtZTogJ1BzeWNoaWMnfSxcbiAgICAgICAge25hbWU6ICdJY2UnfSxcbiAgICAgICAge25hbWU6ICdOb3JtYWwnfSxcbiAgICAgICAge25hbWU6ICdCdWcnfSxcbiAgICAgICAge25hbWU6ICdFbGVjdHJpYyd9LFxuICAgICAgICB7bmFtZTogJ0dyb3VuZCd9LFxuICAgICAgICB7bmFtZTogJ0ZhaXJ5J30sXG4gICAgICAgIHtuYW1lOiAnRmlnaHRpbmcnfSxcbiAgICAgICAge25hbWU6ICdHaG9zdCd9LFxuICAgICAgICB7bmFtZTogJ1BvaXNvbid9XG4gICAgXVxuXG4gICAgJHNjb3BlLmZpbHRlciA9IGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgY2F0ZWdvcnkgPT09ICdBbGwnKSByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZWxzZSByZXR1cm4gcHJvZHVjdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgICRzY29wZS5zZWFyY2hGaWx0ZXI9ZnVuY3Rpb24oc2VhcmNoaW5nTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmICghc2VhcmNoaW5nTmFtZSkgcmV0dXJuIHRydWU7ICAgICAgICAgICBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsZW4gPSBzZWFyY2hpbmdOYW1lLmxlbmd0aFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm9kdWN0JywgcHJvZHVjdC50aXRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdC50aXRsZS5zdWJzdHJpbmcoMCxsZW4pLnRvTG93ZXJDYXNlKCk9PXNlYXJjaGluZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG4gICAgJHNjb3BlLnByaWNlUmFuZ2VGaWx0ZXI9ZnVuY3Rpb24obWluPTAsbWF4PTIwMDApe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvZHVjdCl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdC5wcmljZT49bWluICYmIHByb2R1Y3QucHJpY2U8PW1heDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkc2NvcGUuc29ydGluZ0Z1bmM9ZnVuY3Rpb24oc29ydFR5cGU9XCJ1bnRvdWNoZWRcIil7XG4gICAgICAgIGlmIChzb3J0VHlwZT09PVwidW50b3VjaGVkXCIpIHJldHVybiBudWxsO1xuICAgICAgICBlbHNlIGlmIChzb3J0VHlwZT09PVwibG93XCIpIHJldHVybiAncHJpY2UnXG4gICAgICAgIGVsc2UgaWYgKHNvcnRUeXBlPT09J2hpZ2gnKSByZXR1cm4gJy1wcmljZSdcbiAgICAgICAgfVxufSlcblxuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdENhcmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWNhcmQvcHJvZHVjdC1jYXJkLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgcHJvZHVjdHM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvZHVjdENhcmRDdHJsJ1xuICAgIH1cbn0pXG4iLCJcbiAgYXBwLmNvbnRyb2xsZXIoJ2FuZ3VsaWtlQ3RybCcsIFtcbiAgICAgICckc2NvcGUnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgICAgJHNjb3BlLm15TW9kZWwgPSB7XG4gICAgICAgICAgICAgIFVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbScsXG4gICAgICAgICAgICAgIE5hbWU6ICBcIlBva2VtYXJ0XCIsIFxuICAgICAgICAgICAgICBJbWFnZVVybDogJ2h0dHA6Ly9wb2tlbWFydC1mc2EuaGVyb2t1YXBwLmNvbSdcbiAgICAgICAgICB9O1xuICAgICAgfVxuICBdKTsiLCJcblxuKGZ1bmN0aW9uICgpIHtcbiAgICBhbmd1bGFyLm1vZHVsZSgnYW5ndWxpa2UnLCBbXSlcblxuICAgICAgLmRpcmVjdGl2ZSgnZmJMaWtlJywgW1xuICAgICAgICAgICckd2luZG93JywgJyRyb290U2NvcGUnLCBmdW5jdGlvbiAoJHdpbmRvdywgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgZmJMaWtlOiAnPT8nXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoISR3aW5kb3cuRkIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBGYWNlYm9vayBTREsgaWYgbm90IGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICQuZ2V0U2NyaXB0KCcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL3Nkay5qcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuaW5pdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICRyb290U2NvcGUuZmFjZWJvb2tBcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ZmJtbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAndjIuMCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJMaWtlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJMaWtlQnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5mYkxpa2UgJiYgIXNjb3BlLmZiTGlrZSAmJiAhd2F0Y2hBZGRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgZGF0YSBpZiBpdCBoYXNuJ3QgbG9hZGVkIHlldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdW5iaW5kV2F0Y2ggPSBzY29wZS4kd2F0Y2goJ2ZiTGlrZScsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyTGlrZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHJ1biBvbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuYmluZFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxkaXYgY2xhc3M9XCJmYi1saWtlXCInICsgKCEhc2NvcGUuZmJMaWtlID8gJyBkYXRhLWhyZWY9XCInICsgc2NvcGUuZmJMaWtlICsgJ1wiJyA6ICcnKSArICcgZGF0YS1sYXlvdXQ9XCJidXR0b25fY291bnRcIiBkYXRhLWFjdGlvbj1cImxpa2VcIiBkYXRhLXNob3ctZmFjZXM9XCJ0cnVlXCIgZGF0YS1zaGFyZT1cInRydWVcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cuRkIuWEZCTUwucGFyc2UoZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgXSlcblxuICAgICAgLmRpcmVjdGl2ZSgnZ29vZ2xlUGx1cycsIFtcbiAgICAgICAgICAnJHdpbmRvdycsIGZ1bmN0aW9uICgkd2luZG93KSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICBnb29nbGVQbHVzOiAnPT8nXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5nYXBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgR29vZ2xlIFNESyBpZiBub3QgYWxyZWFkeSBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRTY3JpcHQoJy8vYXBpcy5nb29nbGUuY29tL2pzL3BsYXRmb3JtLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGx1c0J1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQbHVzQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHdhdGNoQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW5kZXJQbHVzQnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhdHRycy5nb29nbGVQbHVzICYmICFzY29wZS5nb29nbGVQbHVzICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgnZ29vZ2xlUGx1cycsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGx1c0J1dHRvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoJzxkaXYgY2xhc3M9XCJnLXBsdXNvbmVcIicgKyAoISFzY29wZS5nb29nbGVQbHVzID8gJyBkYXRhLWhyZWY9XCInICsgc2NvcGUuZ29vZ2xlUGx1cyArICdcIicgOiAnJykgKyAnIGRhdGEtc2l6ZT1cIm1lZGl1bVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5nYXBpLnBsdXNvbmUuZ28oZWxlbWVudC5wYXJlbnQoKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgXSlcblxuICAgICAgLmRpcmVjdGl2ZSgndHdlZXQnLCBbXG4gICAgICAgICAgJyR3aW5kb3cnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgICBmdW5jdGlvbiAoJHdpbmRvdywgJGxvY2F0aW9uKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICB0d2VldDogJz0nLFxuICAgICAgICAgICAgICAgICAgICAgIHR3ZWV0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy50d3R0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIFR3aXR0ZXIgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkLmdldFNjcmlwdCgnLy9wbGF0Zm9ybS50d2l0dGVyLmNvbS93aWRnZXRzLmpzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHdlZXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB2YXIgd2F0Y2hBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlclR3ZWV0QnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNjb3BlLnR3ZWV0ICYmICF3YXRjaEFkZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBkYXRhIGlmIGl0IGhhc24ndCBsb2FkZWQgeWV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXRjaEFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1bmJpbmRXYXRjaCA9IHNjb3BlLiR3YXRjaCgndHdlZXQnLCBmdW5jdGlvbiAobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclR3ZWV0QnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiaHR0cHM6Ly90d2l0dGVyLmNvbS9zaGFyZVwiIGNsYXNzPVwidHdpdHRlci1zaGFyZS1idXR0b25cIiBkYXRhLXRleHQ9XCInICsgc2NvcGUudHdlZXQgKyAnXCIgZGF0YS11cmw9XCInICsgKHNjb3BlLnR3ZWV0VXJsIHx8ICRsb2NhdGlvbi5hYnNVcmwoKSkgKyAnXCI+VHdlZXQ8L2E+Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkd2luZG93LnR3dHRyLndpZGdldHMubG9hZChlbGVtZW50LnBhcmVudCgpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICBdKVxuXG4gICAgICAuZGlyZWN0aXZlKCdwaW5JdCcsIFtcbiAgICAgICAgICAnJHdpbmRvdycsICckbG9jYXRpb24nLFxuICAgICAgICAgIGZ1bmN0aW9uICgkd2luZG93LCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgIHBpbkl0OiAnPScsXG4gICAgICAgICAgICAgICAgICAgICAgcGluSXRJbWFnZTogJz0nLFxuICAgICAgICAgICAgICAgICAgICAgIHBpbkl0VXJsOiAnPSdcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBQaW50ZXJlc3QgU0RLIGlmIG5vdCBhbHJlYWR5IGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnU0NSSVBUJylbMF0sIHAgPSBkLmNyZWF0ZUVsZW1lbnQoJ1NDUklQVCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwLmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHAuc3JjID0gJy8vYXNzZXRzLnBpbnRlcmVzdC5jb20vanMvcGluaXQuanMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcFsnZGF0YS1waW4tYnVpbGQnXSA9ICdwYXJzZVBpbnMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhJHdpbmRvdy5wYXJzZVBpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHAub25sb2FkLCAxMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHAsIGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KCR3aW5kb3cuZG9jdW1lbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJQaW5JdEJ1dHRvbigpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIHZhciB3YXRjaEFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVyUGluSXRCdXR0b24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUucGluSXQgJiYgIXdhdGNoQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGRhdGEgaWYgaXQgaGFzbid0IGxvYWRlZCB5ZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQWRkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVuYmluZFdhdGNoID0gc2NvcGUuJHdhdGNoKCdwaW5JdCcsIGZ1bmN0aW9uIChuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUGluSXRCdXR0b24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBydW4gb25jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRXYXRjaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5odG1sKCc8YSBocmVmPVwiLy93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPScgKyAoc2NvcGUucGluSXRVcmwgfHwgJGxvY2F0aW9uLmFic1VybCgpKSArICcmbWVkaWE9JyArIHNjb3BlLnBpbkl0SW1hZ2UgKyAnJmRlc2NyaXB0aW9uPScgKyBzY29wZS5waW5JdCArICdcIiBkYXRhLXBpbi1kbz1cImJ1dHRvblBpblwiIGRhdGEtcGluLWNvbmZpZz1cImJlc2lkZVwiPjwvYT4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR3aW5kb3cucGFyc2VQaW5zKGVsZW1lbnQucGFyZW50KClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgIF0pO1xuXG59KSgpO1xuIiwiYXBwLmRpcmVjdGl2ZSgncHJvZHVjdEVudHJ5JywgZnVuY3Rpb24gKFByb2R1Y3RGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9wcm9kdWN0LWVudHJ5L3Byb2R1Y3QtZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBwcm9kdWN0OiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5zdWJtaXRVcGRhdGUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS51cGRhdGVQcm9kdWN0KGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVByb2R1Y3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICBQcm9kdWN0RmFjdG9yeS5kZWxldGVQcm9kdWN0KGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiLy8gYXBwLmRpcmVjdGl2ZSgnc3RhclJhdGluZycsIGZ1bmN0aW9uICgpIHtcbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgcmVzdHJpY3Q6ICdFQScsXG4vLyAgICAgICB0ZW1wbGF0ZTpcbi8vICAgICAgICAgJzxzcGFuIGNsYXNzPVwic3RhcnNcIj4nICtcbi8vICAgICAgICAgICc8ZGl2IGNsYXNzPVwic3RhcnMtZmlsbGVkIGxlZnRcIj4nICtcbi8vICAgICAgICAgICAgICc8c3Bhbj7imIU8L3NwYW4+JyArXG4vLyAgICAgICAgICAnPC9kaXY+JyArXG4vLyAgICAgICAnPC9zcGFuPidcbi8vICAgICB9O1xuLy8gfSlcbiIsIiAvLyBhcHAuY29udHJvbGxlcignU2VhcmNoQmFyQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSl7XG4gLy8gXHQkc2NvcGUucHJvZHVjdD1cbiAvLyB9KSIsImFwcC5kaXJlY3RpdmUoJ3NlYXJjaEJhcicsIGZ1bmN0aW9uKCl7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6J0UnLFxuXHRcdHRlbXBsYXRlVXJsOidqcy9jb21tb24vZGlyZWN0aXZlcy9zZWFyY2gtYmFyL3NlYXJjaC1iYXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjonUHJvZHVjdENhcmRDdHJsJ1xuXHR9XG59KVxuXG4iLCJhcHAuZGlyZWN0aXZlKCd1c2VyRW50cnknLCBmdW5jdGlvbiAoVXNlckZhY3RvcnksIEF1dGhGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLWVudHJ5L3VzZXItZW50cnkuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyOiAnPScsXG4gICAgICAgICAgICBuZ01vZGVsOiAnPSdcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgICBzY29wZS5mb3JnZXRQYXNzd29yZCA9IGZ1bmN0aW9uIChlbWFpbCkge1xuICAgICAgICAgICAgICAgIEF1dGhGYWN0b3J5LmZvcmdldFBhc3N3b3JkKHtlbWFpbDogZW1haWx9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ0RvbmUnLCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdPb3BzLCBzb21ldGhpbmcgd2VudCB3cm9uZycsIDEwMDApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzY29wZS5kZWxldGVVc2VyID0gZnVuY3Rpb24gKHVzZXJJZCkge1xuICAgICAgICAgICAgICAgICBVc2VyRmFjdG9yeS5kZWxldGVVc2VyKHVzZXJJZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIE1hdGVyaWFsaXplLnRvYXN0KCdFcmFzZSBmcm9tIHBsYW5ldCBFYXJ0aCcsIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTWF0ZXJpYWxpemUudG9hc3QoJ09vcHMsIHNvbWV0aGluZyB3ZW50IHdyb25nJywgMTAwMClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiIsImFwcC5kaXJlY3RpdmUoJ3VzZXJPcmRlcicsIGZ1bmN0aW9uIChNYW5hZ2VPcmRlcnNGYWN0b3J5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy91c2VyLW9yZGVyL3VzZXItb3JkZXIuaHRtbCcsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICB1c2VyT3JkZXI6ICc9JyxcbiAgICAgICAgICAgIG5nTW9kZWw6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgICAgICAgIHNjb3BlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkudXBkYXRlU3RhdHVzKGlkLCBzY29wZS5uZ01vZGVsKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjb3BlLmRlbGV0ZVVzZXJPcmRlciA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIE1hbmFnZU9yZGVyc0ZhY3RvcnkuZGVsZXRlVXNlck9yZGVyKGlkKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pXG4iLCJcbmFwcC5kaXJlY3RpdmUoJ2NsaWNrQW55d2hlcmVCdXRIZXJlJywgZnVuY3Rpb24oJGRvY3VtZW50KXtcbiAgcmV0dXJuIHtcbiAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgIGNsaWNrQW55d2hlcmVCdXRIZXJlOiAnJidcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbCwgYXR0cikge1xuXG4gICAgICAgICAgICAgICAkKCcubG9nbycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICBcblxuICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0LmlkICE9PSAnY2FydC1pY29uJyAmJiBlLnRhcmdldC5pZCAhPT0gJ2FkZC10by1jYXJ0LWJ1dHRvbicpIHtcbiAgICAgICAgICAgICAgICAgICBpZiAoZWwgIT09IGUudGFyZ2V0ICYmICFlbFswXS5jb250YWlucyhlLnRhcmdldCkgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGV2YWwoc2NvcGUuY2xpY2tBbnl3aGVyZUJ1dEhlcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIH1cbiAgICAgICAgfVxufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
