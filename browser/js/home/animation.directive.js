app.directive('animation', function ($state) {
    var animationEndEvents = 'webkitAnimationEnd oanimationend msAnimationEnd animationend';
    var createCharacters = function (){
        var characters = {
            ash: [
                'ash',
                'ash-green-bag',
            ],
            others: [
                'james',
                'cassidy',
                'jessie'
            ]
        };

        function getY () {
            return (( Math.random() * 3 ) + 29).toFixed(2);
        }

        function getZ (y) {
            return Math.floor((20 - y) * 100);
        }

        function randomCharacters (who) {
            return characters[who][ Math.floor( Math.random() * characters[who].length ) ];
        }

        function makeCharacter (who) {

            var xDelay = ( who === 'ash' ) ? 4 : 4.8;
            var delay = '-webkit-animation-delay: ' + ( Math.random() * 2.7 + xDelay ).toFixed(3) + 's;';
            var character = randomCharacters( who );
            var bottom = getY();
            var y = 'bottom: '+ bottom +'%;';
            var z = 'z-index: '+ getZ( bottom ) + ';';
            var style = "style='"+delay+" "+y+" "+z+"'";

            return "" +
                "<i class='" + character + " opening-scene' "+ style + ">" +
                    "<i class=" + character + "-right " + "style='"+ delay + "'></i>" +
                "</i>";
        }

        var ash = Math.floor( Math.random() * 16 ) + 16;
        var others = Math.floor( Math.random() * 8 ) + 8;

        var horde = '';

        for ( var i = 0; i < ash; i++ ) {
            horde += makeCharacter( 'ash' );
        }

        for ( var j = 0; j < others; j++ ) {
            horde += makeCharacter( 'others' );
        }

        document.getElementById('humans').innerHTML = horde;
    };

    return {
        restrict: 'E',
        template: '<div class="running-animation">' +
                        '<i class="pikachu opening-scene">' +
                            '<i class="pikachu-right"></i>' +
                            '<div class="quote exclamation"></div>' +
                        '</i>' +
                        '<div id="humans"></div>' +
                    '</div>',
        compile: function () {
            return {
                pre: function () {
                    $('#main').addClass('here')
                    createCharacters();
                },
                post: function () {

                    $('.opening-scene').addClass('move')
                    $('.move').on(animationEndEvents, function (e) {
                        $state.go('store');
                    });
                }
            }
        },
        scope: function () {

        }
    }
})
