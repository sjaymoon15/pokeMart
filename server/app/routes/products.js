'use strict'

var router = require('express').Router();

router.get('/', function(req, res, next) {
  res.send('request made')
})

module.exports = router;