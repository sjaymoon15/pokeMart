
  app.controller('angulikeCtrl', [
      '$scope', function ($scope) {
          $scope.myModel = {
              Url: 'http://pokemart-fsa.herokuapp.com',
              Name:  "Pokemart", 
              ImageUrl: 'http://pokemart-fsa.herokuapp.com'
          };
      }
  ]);