var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/signIn', function (req, res, next) {
  res.render('accounts/signIn');
});

router.get('/register', function (req, res, next) {
  res.render('/accounts/register');
});


module.exports = router;
