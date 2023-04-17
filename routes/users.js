var express = require('express');
var router = express.Router();

require('dotenv').config()

var jwtServices = require('../services/jwtServices');
var adminServices = require('../services/adminServices');
var accountsServices = require('../services/accountsServices');
var mentorServices = require('../services/mentorServices');
var hodServices = require('../services/hodServices');
var s3Services = require('../services/s3');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
var path = require('path');
var multer = require('multer');

const { encrypt, decrypt } = require('../services/encryptionServices');
const verifyJWT = require('../middleware/verifyJWT');
const upload = require('../middleware/uploadFile');
const { verify } = require('crypto');
// app.use(verifyJWT);

router.get('/thesis/:key', (req, res) => {
  const { key } = req.params;
  // console.log(key)
  const readStream = s3Services.getFileStream(key)

  readStream.pipe(res)
})

router.get('/', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  let user = await accountsServices.getUserById(userId);
  res.render('index', { layout: 'userLayout', name: user.name });
});


router.get('/publish', verifyJWT, function (req, res, next) {
  const { userId, userName, userRole } = req;
  res.render('mentor/uploadThesis', { layout: 'userLayout', name: userName });
});

router.post('/publish', verifyJWT, upload.single('thesis'), async function (req, res, next) {
  try {
    // console.log(req);
    const { userId, userName, userRole } = req;
    const { sEmail, description } = req.body;
    const thesis = req.file;
    let result = await mentorServices.uploadThesis(userId, sEmail, thesisName, thesis);
    if (result.status == "Fail") throw new Error(result.error);
    else res.redirect('/users/');
  } catch (error) {
    res.send(error);
  }
})


router.get('/viewThesis/:thesisId', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  const { thesisId } = req.params;
  const thesisResult = await mentorServices.getThesisById(thesisId);
  if (thesisResult.status == "Fail") {
    error = thesisResult.error;
    res.render('error', { layout: 'userLayout', name: userName, error: error });
  } else {
    let thesis = thesisResult.result;
    res.render('mentor/viewThesis', { layout: 'userLayout', name: userName, thesis: thesis });
  }
})

router.get('/viewThesisList/', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  if (userRole == "Scholar") {
    // submitted thesis
  }
  if (userRole == "Reviewer") {
    // reviewed thesis    
  }
  let thesisListResult = await mentorServices.getThesisListById(userId);
  if (thesisListResult.status == "Fail") {
    let error = thesisListResult.error;
    res.render('error', { layout: 'userLayout', name: userName, error: error });
  }
  let thesisList = (thesisListResult).result;
  res.render('mentor/viewThesisList', { layout: 'userLayout', name: userName, thesisList: thesisList });
})

router.get('/viewApproveThesisList/', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  if (userRole == "HOD") {
    let thesisListResult = await hodServices.getThesisToBeApprovedListById(userId);
    if (thesisListResult.status == "Fail") {
      let error = thesisListResult.error;
      res.render('error', { layout: 'userLayout', name: userName, error: error });
    }
    let thesisList = (thesisListResult).result;
    res.render('hod/viewApproveThesisList', { layout: 'userLayout', name: userName, thesisList: thesisList });
  }
  else if (userRole == "Dean") {
    // reviewed thesis    
  }

})

router.post('/approveThesis/:thesisId', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  const { thesisId } = req.params;
  const { thesisName, scholarEmail, mentorEmail } = req.body;
  if (userRole == "HOD") {
    let status = "Forwarded to Dean";
    const updationResult = await hodServices.approveThesis(userName, thesisId, thesisName,scholarEmail, mentorEmail);
    if (updationResult.status == "Fail") {
      let error = updationResult.error;
      res.render('error', { layout: 'userLayout', error: error });
    } else {
      res.redirect('/users/viewApproveThesisList/');
    }
  }
})


router.get('/profileCompletion', verifyJWT, async function (req, res, next) {
  let { userId, userName } = req;
  let user = await accountsServices.getUserById(userId);
  let departments = await adminServices.getDepartments();
  let roles = await adminServices.getRoles();
  // console.log(roles, departments);
  // let departments = [], roles = [];
  res.render('accounts/profileCompletion', { layout: 'userLayout', name: user.name, email: user.email, departments: departments, roles: roles });
});

router.post('/profileCompletion', verifyJWT, async function (req, res, next) {
  const { userId, userName, userRole } = req;
  const { name, email, institute, department, role, rollNo, dateOfJoining, pfId } = req.body;
  console.log(req.body);
  if (!name || !email || !institute || !department || !role) {
    error = "Error: Insuficient data.";
    res.render('error', { layout: 'userLayout', error: error });
    return;
  }
  // const today = new Date();
  console.log(dateOfJoining);
  if (role !== "Scholar" && role !== "Mentor" && role !== "Reviewer" && role !== "Dean" && role !== "HOD") {
    error = "Error: Incorrect data";
    res.render('error', { layout: 'userLayout', error: error });
    return;
  }
  if (role == "Scholar" && !rollNo && !dateOfJoining) {
    error = "Error: Insuficient data.";
    res.render('error', { layout: 'userLayout', error: error });
    return;
  }
  else if ((role == "Mentor" || role == "Reviewer" || role == "Dean" || role == "HOD") && (!pfId)) {
    res.send("Error: Insuficient data.");
    return;
  }
  let profileCompletionStatus = await accountsServices.completeUserProfile(userId, name, email, institute, department, role, rollNo, dateOfJoining, pfId);
  if (profileCompletionStatus.status == "Fail") {
    res.render('error', { layout: 'userLayout', error: profileCompletionStatus.error });
    return;
  }
  else {
    let refreshToken = cookies.jwt_refreshToken;
    let newAccessToken = await jwtServices.refreshAccessTokenByRefreshToken(refreshToken);
    if (newAccessToken) {
      res.cookie('jwt_accessToken', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
      res.redirect('/users/');
    }
    else {
      res.render('accounts/signIn', { title: 'Express', email: '' });
    }
    res.redirect("/users/")
  }
})


module.exports = router;
