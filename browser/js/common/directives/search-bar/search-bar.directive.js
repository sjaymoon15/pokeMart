app.directive('searchBar', function(){
	return {
		restrict:'E',
		templateUrl:'js/common/directives/search-bar/search-bar.html',
		controller:'ProductCardCtrl' //JA-SB: Why ProductCardCtrl? Search bar controller is empty.
	}
})

