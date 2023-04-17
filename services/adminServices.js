const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail')
const dotenv = require('dotenv');
require('dotenv').config();

const userImageS3 = require('../services/userImageS3'); 
const userCertificateS3 = require('../services/userCertificateS3');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

const { encrypt, decrypt } = require('../services/encryptionServices');

async function getDepartments() {
    let departmentsResult = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getDepartments?secret=vedant", {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            return data;
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
    return departmentsResult;
}

async function getRoles() {
    let rolesResult = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getRoles?secret=vedant", {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            return data;
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
    return rolesResult;
}



/*-------------------Functions----------------------*/
function getUnreviewedUsers(callback) {
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/listUnreviewedUsers?secret=alwaysShine", {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            return callback(null, data);
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
}

function getUnreviewedItemsPerUser(callback) {
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/listUnreviewedItemsPerUser?secret=alwaysShine", {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            return callback(null, data);
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
}

function getUnreviewedItemsOfUserByEmail(email, callback) {
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/listUnreviewedItemsOfUserByEmail?secret=alwaysShine&email="+email, {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            if (data === "User Not Found") return callback("User Not Found");
            if (data === "Email cannot be empty") return callback("Email cannot be empty");

            return callback(null, data);
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
}

function updateUserReviewStatus(email, reviewStatus, reviewResponse, callback) {
    if (!email) return callback("User Email cannot be null");
    if (reviewStatus === null) return callback("Review Status cannot be null");
    if (reviewStatus == false && reviewResponse === null) return callback("Review Response cannot be null");
    
    const reqBody = {
        email: email,
        reviewStatus: reviewStatus,
        reviewResponse: reviewResponse,
    }
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/updateUserReviewStatus?secret=alwaysShine", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                        // 'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: JSON.stringify(reqBody)
                }
                ).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    console.log('Request succeeded with JSON response', data);
                    return callback(null, data);
                }).catch(function (error) {
                    console.log('Request failed', error);
                    return callback(error);
                });
}

function updateItemReviewStatus(itemId, reviewStatus, reviewResponse, unitId, profitMargin, callback) {
    if (!itemId) return callback("User Email cannot be null");
    if (reviewStatus === null) return callback("Review Status cannot be null");
    if (reviewStatus == false && reviewResponse === null) return callback("Review Response cannot be null");
    
    const reqBody = {
        itemId: itemId,
        reviewStatus: reviewStatus,
        reviewResponse: reviewResponse,
        unitId: unitId,
        profitMargin: profitMargin,
    }
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/updateItemReviewStatus?secret=alwaysShine", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                        // 'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: JSON.stringify(reqBody)
                }
                ).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    console.log('Request succeeded with JSON response', data);
                    return callback(null, data);
                }).catch(function (error) {
                    console.log('Request failed', error);
                    return callback(error);
                });
}

module.exports = {
    getDepartments,
    getRoles,
    getUnreviewedUsers,
    getUnreviewedItemsPerUser,
    getUnreviewedItemsOfUserByEmail,
    updateUserReviewStatus,
    updateItemReviewStatus
};