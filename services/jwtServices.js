const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const Sib = require('sib-api-v3-sdk')
require('dotenv').config()

// const uri = process.env.MONGODB_URI;
// const client = new MongoClient(uri);
// const database = client.db("LetUsFarm");

const jwt = require('jsonwebtoken');

const userImageS3 = require('../services/userImageS3'); 
const userCertificateS3 = require('../services/userCertificateS3');

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

const { encrypt, decrypt } = require('../services/encryptionServices');

function getUserByRefreshToken(refreshToken, callback) {
    if (!refreshToken) {
        return callback("RefreshToken cannot be null");
    }

    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByRefreshToken?secret=vedant&refreshToken="+refreshToken, {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            if (data) return callback(null, data);
            else return callback("User Not Found");
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
}

module.exports = {
    getUserByRefreshToken
};