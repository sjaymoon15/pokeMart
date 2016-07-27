var chai = require('chai');
var expect = chai.expect;

var supertest = require('supertest'); // OB/SB: check out supertest-as-promised
var db = require('../../../server/db');
var User = db.model('user')
var app = require('../../../server/app')(db);
var agent = supertest.agent(app);


describe('Users API routes ', function() {
  var user1= { email: 'user1@users.com' , password: 'momo', isAdmin:true},
  createdUserId, usersLength;


  //get all the users and store length so we can test for it after we create a new user
  before(function(done){
    User.findAll()
    .then(function(users){
      usersLength = users.length
    }).catch(console.error)
    done();
  });


  // OB/SB: it can be brittle to rely on state from previous spec in later spec
  it('POST api/users should create a user', function(done) {
    agent
    .post('/api/users')
    .send(user1)
    .end(function(err, res){
      if (err) console.log(err)
        createdUserId = res.body.id;
      expect(res).to.be.an('object')
      console.log('bbb',createdUserId)
      done();
    })
  });

  it('logs in as user', function(done){
    // OB/SB: do a beforeEach
    agent
    .post('/login')
    .send(user1)
    .end(function(err,res){
      if (err) console.log(err)
      done();
    });
  })

  it('api/users should return all users for admin', function(done) {
    agent
    .get('/api/users')
    .end(function(err,res){
      if (err) console.log(err)
        expect(res.body).to.have.length(usersLength + 1)
      done();
    });
  });

  it('api/users/:id should return one user', function(done) {
    agent
    .get('/api/users/' + createdUserId)
    .end(function(err,res){
      if (err) console.log(err); // OB/SB: call done on the error
      expect(res.body.email).to.equal(user1.email)
      done();
    });
  });

  it('PUT api/users/:id should update user info', function(done){
    agent
        .put('/api/users/' + createdUserId)
        .send({email: 'newEmail@email.com'})
        .end(function(err,res){
          if (err) console.log(err)
          expect(res.body.email).to.equal('newEmail@email.com')
        done();
        })
  })

  it('DELETE api/users/:id should delete a user', function(done) {
    agent
    .del('/api/users/'+ createdUserId)
    .expect(204)
    .end(done)
  })

  // OB/SB: assert auth stuff (e.g. expect 401 when trying to update without being logged in)
});
