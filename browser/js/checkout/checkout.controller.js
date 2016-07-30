app.controller('CheckoutCtrl', function ($scope, CartFactory) {

    CartFactory.fetchAllFromCart()
    .then(function (items) {
    		console.log('items', items)
    		items.forEach(function(item){
    			item.imageUrl = "http://pokeapi.co/media/img/"+ item.productId+".png"
    		})
        $scope.items = items;
  			
  			//calculating total price and put that into $scope.total
        var itemsArr = items;
        var totalPriceEach = [];
        itemsArr.forEach(function(element){
        	totalPriceEach.push(element.price * element.quantity);
        })
        $scope.total = totalPriceEach.reduce( (prev, curr) => prev + curr );
    })

    
});
