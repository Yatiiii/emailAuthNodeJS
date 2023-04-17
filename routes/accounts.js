const express = require('express');
require('dotenv').config()

const router = express.Router();

const jwt = require('jsonwebtoken');

const accountsServices = require('../services/accountsServices');
const jwtServices = require('../services/jwtServices');
const { encrypt, decrypt } = require('../services/encryptionServices');
const { NetworkFirewall } = require('aws-sdk');

//-----------------------REGISTER----------------------------------------
router.get('/register', (req, res) => {
    res.render('accounts/register');
});

router.post('/register', async (req, res) => {
    const { fullName, email, phone, password, confirmPassword } = req.body;
    if (password == null || (password != confirmPassword)) res.render('accounts/register', { error: "Passwords do not match" });
    else {
        let strongPasswordReq = new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})');
        // atleast one lower case char
        // atleast one upper case char
        // atleast one digit
        // atleast one special char
        // atleast of length 8
        if (strongPasswordReq.test(password)) {
            let result = await accountsServices.createUser(fullName, email, phone, password);
            if (result.status == "Fail") {
                res.status(200).send("Error: " + result.error);
            }
            res.redirect('/accounts/sendVerification');
        } else {
            res.render('accounts/register', { error: 'Enter a valid Password', fullName, email, phone });
        }
    }
});

//-----------------------VERIFICATION---------------------------------------
router.get('/sendVerification', (req, res) => {
    res.render('accounts/sendVerificationCode');
})

router.post('/sendVerification', (req, res) => {
    let { email } = req.body;
    let sendVerificationResult = accountsServices.sendEmailVerification(email);
    if (sendVerificationResult.status == "Fail") res.render('accounts/sendVerificationCode', { error: sendVerificationResult.error });
    else res.redirect('/accounts/verification')
})

router.get('/verification', (req, res) => {
    res.render('accounts/verification');
});

router.post('/verification', async (req, res) => {
    const { email, code } = req.body;
    try {
        let verificationResult = await accountsServices.checkVerification(email, code);
        if (verificationResult.status == "Fail") {
            res.render('accounts/verification', { error:verificationResult.error, email:email });
        }
        else {
            res.redirect('/accounts/signIn');
        }
    } catch (error) {
        console.log(error);
        res.render('accounts/verification', { error, email });
    }
});


//------------------------------SIGN IN------------------------------------------
router.get('/signIn',async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt_accessToken) {
        if (!cookies?.jwt_refreshToken) {
            res.render('accounts/signIn', { title: 'Express', email: '' });
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
        }
    } else {
        res.redirect('/users/');
    }
    // res.render('accounts/signIn', { title: 'Express', email: '' });
});

router.post('/signIn', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await accountsServices.signIn(email, password, function (result) {
            if (result.status == "Fail") {
                res.status(200).send("Error: "+result.error);
                return;
            }
            if (result.status !== "Success") throw new Error("Unknown error occurred");
            // console.log(result);
            const { user, refreshToken, accessToken } = result;
            console.log("signing in: ", user, refreshToken, accessToken);
            if (user.isEmailVerified) {
                res.cookie('jwt_refreshToken', refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
                res.cookie('jwt_accessToken', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
                // res.header('Authorization', 'Authorization ' + accessToken);
                // req.header('authorization','Authorization ' + accessToken)
                // console.log(res);
                // console.log(res.headersSent);
                // req.userId = foundUser._id;
                res.redirect(`/users/`);
            }
            else {
                let result = accountsServices.sendEmailVerification(email);
                if (result.status == "Success") res.redirect('/accounts/verification');
                else res.redirect('/accounts/signIn');
            }
        });
        
    } catch (err) {
        res.render('error:'+err);
    }
});


module.exports = router;