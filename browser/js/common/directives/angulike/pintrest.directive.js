app.directive('pinIt', [
        '$window', '$location',
        function ($window, $location) {
            return {
                restrict: 'A',
                // scope: {
                //     pinIt: '=',
                //     pinItImage: '=',
                //     pinItUrl: '='
                // },
                controller:'PintCtrl',
                link: function (scope, element, attrs) {
                    if (!$window.parsePins) {
                        // Load Pinterest SDK if not already loaded
                        (function (d) {
                            var f = d.getElementsByTagName('SCRIPT')[0], p = d.createElement('SCRIPT');
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
                        }($window.document));
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
        }
    ]);