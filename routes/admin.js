var express = require('express');
var router = express.Router();

require('dotenv').config()

const adminServices = require('../services/adminServices');
const accountsServices = require('../services/accountsServices');
const userImageS3 = require('../services/userImageS3');
const userCertificateS3 = require('../services/userCertificateS3');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
var path = require('path');
var multer = require('multer');

const { encrypt, decrypt } = require('../services/encryptionServices');

router.get('/unreviewedUsers', function (req, res, next) {
    adminServices.getUnreviewedUsers(function (error, users) {
        let encUsersEmail = [];
        if (error) {
            res.send(error);
        } else {
            users.forEach(user => {
                const encEmail = encrypt(user.email);
                encUsersEmail.push(encEmail);
            });
            // console.log(result, encUsersEmail);
        }
        // res.send(users);
        res.render('admin/unreviewedUsers.ejs', { users:users, encUsersEmail });
    })
});

router.get('/unreviewedItemsPerUser', function (req, res, next) {
    adminServices.getUnreviewedItemsPerUser(function (error, users) {
        if (error) {
            res.send(error);
        } else {
            let encUsersEmail = [];
            users.forEach(user => {
                const encEmail = encrypt(user.seller.email);
                encUsersEmail.push(encEmail);
            });
            res.render('admin/unreviewedItemsPerUser.ejs',{ users:users, encUsersEmail })
        }
    })
})

router.get('/unreviewedItemsOfUser/:cipherTextEmail', function (req, res, next){
    const { cipherTextEmail } = req.params;
    const email = decrypt(cipherTextEmail);
    adminServices.getUnreviewedItemsOfUserByEmail(email, function (error, items) {
        if (error) {
            res.send(error);
        } else {
            let encItemsId = [];
            items.forEach(item => {
                const encId = encrypt(item._id);
                encItemsId.push(encId);
            });
            res.render('admin/unreviewedItemsOfUser.ejs', { items, encItemsId, email, cipherTextEmail });
        }
    })
})

router.get('/user/view/:cipherTextEmail', function (req, res, next) {
    const { cipherTextEmail } = req.params;
    const userEmail = decrypt(cipherTextEmail);
    accountsServices.getUserProfileByEmail(userEmail, function (error, user) {
        if (error) {
            res.send(error);
        } else {
            res.render('admin/viewUnreviewedUser', { user, cipherTextEmail });
        }
    })
})

router.get('/items/view/:cipherTextItemId', function (req, res, next) {
    const { cipherTextItemId } = req.params;
    const itemId = decrypt(cipherTextItemId);
    console.log(itemId)
    itemServices.getItemById(itemId, function (error, result) {
        if (error) {
            res.send(error);
        } else {
            const [item] = result;
            const userCipherTextEmail = encrypt(item.seller.email);
            itemServices.viewItemUnits(function (error2, units) {
                console.log(units);
                if (error2) res.send(error2);
                else res.render('admin/viewUnreviewedItem', { item, cipherTextItemId, userCipherTextEmail, units });
            })
        }
    })
})

router.post('/user/view/:cipherTextEmail/approve', function (req, res, next) {
    const { cipherTextEmail } = req.params;
    const email = decrypt(cipherTextEmail);
    
    adminServices.updateUserReviewStatus(email, "Approved", "Account Approved", function (error, result) {
        if (error) {
            res.send(error);
        } else {
            res.redirect('/admin/unreviewedUsers');
        }
    })
})

router.post('/user/view/:cipherTextEmail/reject', function (req, res, next) {
    const { cipherTextEmail } = req.params;
    const email = decrypt(cipherTextEmail);
    const { rejectionReason } = req.body;
    adminServices.updateUserReviewStatus(email, "Rejected", rejectionReason , function (error, result) {
        if (error) {
            res.send(error);
        } else {
            res.redirect('/admin/unreviewedUsers');
        }
    })
})

router.post('/items/view/:cipherTextItemId/approve', function (req, res, next) {
    const { cipherTextItemId } = req.params;
    const { unitId, profitMargin } = req.body;
    if (!unitId || !profitMargin) res.send("All Fields are necessary");

    const itemId = decrypt(cipherTextItemId);
    if(profitMargin<0||profitMargin>100) res.send("Profit margin is out of range")
    adminServices.updateItemReviewStatus(itemId, "Approved", "Account Approved", unitId, profitMargin, function (error, result) {
        if (error) {
            res.send(error);
        } else {
            res.redirect('/admin/unreviewedItemsPerUser');
        }
    })
})

router.post('/items/view/:cipherTextItemId/reject', function (req, res, next) {
    const { cipherTextItemId } = req.params;
    const itemId = decrypt(cipherTextItemId);
    const { rejectionReason } = req.body;
    adminServices.updateItemReviewStatus(itemId, "Rejected", rejectionReason , function (error, result) {
        if (error) {
            res.send(error);
        } else {
            res.redirect('/admin/unreviewedItemsPerUsers');
        }
    })
})

module.exports = router;
