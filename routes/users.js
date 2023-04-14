var express = require('express');
var router = express.Router();

require('dotenv').config()

var accountsServices = require('../services/accountsServices');
var mentorServices = require('../services/mentorServices');
var s3Services = require('../services/s3');
const userImageS3 = require('../services/userImageS3');
const userCertificateS3 = require('../services/userCertificateS3');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
var path = require('path');
var multer = require('multer');

const { encrypt, decrypt } = require('../services/encryptionServices');
const verifyJWT = require('../middleware/verifyJWT');
const upload = require('../middleware/uploadFile');
// app.use(verifyJWT);

router.get('/thesis/:key', (req, res) => {
    const { key } = req.params;
    // console.log(key)
    const readStream = s3Services.getFileStream(key)

    readStream.pipe(res)
})

router.get('/certificate/:key', (req, res) => {
    const { key } = req.params;
    // console.log(key)
    const readStream = userCertificateS3.getFileStream(key)

    readStream.pipe(res)
})

router.get('/', verifyJWT, async function (req, res, next) {
  const { userId } = req;
  let user = await accountsServices.getUserById(userId);
  res.send('Hello ' + user.name);
});

router.get('/publish', verifyJWT, function (req, res, next) {
  res.render('mentor/uploadThesis');
});

router.post('/publish', verifyJWT, upload.single('thesis'), async function (req, res, next) {
  try {
    // console.log(req);
    const { userId } = req;
    const { sEmail, description } = req.body;
    const thesis  = req.file;
    let result = await mentorServices.uploadThesis(userId, sEmail, description, thesis);
    if (result.status == "Fail") throw new Error(result.error);
    else res.redirect('/users/');
  } catch (error) {
    res.send(error);
  }
})

router.get('/viewThesis/', verifyJWT, function (req, res, next) {
  res.render('mentor/viewThesis');
})
// router.get('/profile/completion/:cipherTextEmail', function (req, res, next) {
//   const { cipherTextEmail } = req.params;
//   const email = decrypt(cipherTextEmail);
//   res.render('accounts/profileCompletion', { cipherTextEmail: cipherTextEmail, email: email });
// });

// router.post('/profile/completion/:cipherTextEmail', itemServices.upload.any(), async function (req, res, next) {
//   try {
//     const { cipherTextEmail } = req.params;
//     const [image, certificate] = req.files;
//     const { addressLine1, addressLine2, addressPinCode, addressCity, addressState, addressCountry } = req.body;
//     const email = decrypt(cipherTextEmail);
//     await accountsServices.profileCompletion(email, image, certificate, addressLine1, addressLine2, addressPinCode, addressCity, addressState, addressCountry, function (error, success) {
//       if (error) {
//         console.log(error);
//         res.render('accounts/profileCompletion', { error: error, cipherTextEmail: cipherTextEmail, email: email });
//       } else if (success) {
//         res.redirect(`/users/${cipherTextEmail}`);
//       } else {
//         res.render('accounts/profileCompletion', { error: "An Unknown Error Occurred.", cipherTextEmail: cipherTextEmail, email: email });
//       }
//     })
//   } catch (error) {
//     console.log(error);
//     res.send("An error occured");
//   }
// });


module.exports = router;
