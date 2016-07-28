/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/

var chalk = require('chalk');
var db = require('./server/db');
var User = db.model('user');
var Product = db.model('product');
var UserOrders = db.model('userOrders');
var OrderDetails = db.model('orderDetails')
var Review = db.model('review');

var Promise = require('sequelize').Promise;

// OB/SB: consider folder (e.g. `seedData` with a bunch of json files in it)
var seedUsers = function () {

    var users = [
    {
        email: 'testing@fsa.com',
        password: 'password'
    },
    {
        email: 'obama@gmail.com',
        password: 'potus'
    },
    {
        email: 'ross@gmail.com',
        password: 'pivot'
    }
    ];

    var creatingUsers = users.map(function (userObj) {
        return User.create(userObj);
    });

    var products = [
    {
        title: 'pikachu',
        category: 'pokemon',
        description: ' best lightning pokemon. Loves hats.',
        photoUrl: 'whatever',
        quantity: 4,
        price: 30
    },
    {
        title: 'Squirtle',
        category: 'pokemon',
        description: ' great starter pokemon. Would evolve again',
        photoUrl: 'whatever',
        quantity: 8,
        price: 20
   },
   {
        title: 'Charmander',
        category: 'pokemon',
        description: 'another starter pokemon from gameboy original',
        photoUrl: 'whatever',
        quantity: 8,
        price: 20
   },
   {
        title: 'Zubat',
        category: 'pokemon',
        description: 'bats, bats eveywhere',
        photoUrl: 'whatever',
        quantity: 99,
        price: 1
   }
   ];


   var creatingProducts = products.map(function (productObj) {
        return Product.create(productObj);
    });

   var reviews = [
    {
        content:'worst pokemon ever' ,
        title:'dont buy',
        rating: 4,
        //productId: 4
    },
    {
        content:'asdijalsdijalsd best POKERMON ever',
        title:'I love it',
        rating: 4,
        //productId: 1
   },{
        content:'great value, dont get it wet ' ,
        title:'caution',
        rating: 5,
        //productId: 3
    },
    {
        content:'too expensive for me ',
        title:'Bad choice ',
        rating: 2,
        //productId: 2
   }
   ];

    var creatingReviews = reviews.map(function (reviewObj, i) {
        return Review.create(reviewObj)
                .then(function(review) {
                    console.log(i)
                    return review.setAuthor((i%2) + 1)
                })
    });

   return Promise.all(creatingUsers)
            .then(function () {
                return Promise.all(creatingProducts)
            }).then (function() {
                return Promise.all(creatingReviews)
            }).then(function(){
                return Product.findById(1)
                .then(function(product){
                   
                   return product.addToOrder(2,'1')
                })
                .catch(console.error);
            })
        

};

db.sync({ force: true })
.then(function () {
    return seedUsers();
})
.then(function () {
    console.log(chalk.green('Seed successful!'));
    process.exit(0);
})
.catch(function (err) {
    console.error(err);
    process.exit(1);
});