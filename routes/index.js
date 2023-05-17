var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  console.log("Ses",req.session);
  if(!req.session.user){
    console.log("yes");
    res.redirect('accounts/signIn');
  }
  res.render('index', { title: 'Express' });
});

router.get('/signIn', function (req, res, next) {
  res.render('accounts/signIn');
});

router.get('/register', function (req, res, next) {
  res.render('/accounts/register');
});
router.get('/quiz.html', function (req, res, next) {
  res.render('quiz');
});

module.exports = router;
