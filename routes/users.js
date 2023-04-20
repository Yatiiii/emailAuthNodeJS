var express = require('express');
var router = express.Router();

require('dotenv').config()

var accountsServices = require('../services/accountsServices');


router.get('/',  async function (req, res, next) {
  res.render('index', { layout: 'userLayout' });
});


module.exports = router;
