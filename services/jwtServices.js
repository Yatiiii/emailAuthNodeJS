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

async function getUserByRefreshToken(refreshToken) {
    try {
        if (!refreshToken) {
            throw new Error("RefreshToken cannot be null");
        }

        let user = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByRefreshToken?secret=vedant&refreshToken=" + refreshToken, {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            if (data) return data;
            else throw new Error("User Not Found");
        }).catch(function (error) {
            console.log('Request failed', error);
            throw new Error(error);
        });
        return user;
    } catch (err) {
        return null;
    }
}

function createAccessToken(user) {
    const accessToken = jwt.sign(
        { "userId": user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );
    return accessToken;
}

function createRefreshToken(user) {
    const refreshToken = jwt.sign(
        { "userId": user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1d' }
    );
    return refreshToken;
}

async function refreshAccessTokenByRefreshToken(refreshToken) {
    try {
        const findUser = await getUserByRefreshToken(refreshToken);
        if (findUser.status == "Fail") throw new Error(findUser.error);
        const user = findUser.result;
        const newAccesToken = createAccessToken(user);
        if (!newAccesToken) throw new Error("Unable to create Access Token");

        return newAccesToken;
    } catch (err) {
        return null;
    }
}

async function createTokens(user) {
    try {
        const newAccessToken = createAccessToken(user);
        const newRefreshToken = createRefreshToken(user);

        const userId = user._id;

        const refreshTokenReqBody = {
            userId: userId,
            refreshToken: newRefreshToken
        };

        let result = {
            status: "Fail",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }
        await fetch(
            "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUserRefreshToken?secret=vedant",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: JSON.stringify(refreshTokenReqBody),
            }
        ).then(function (response) {
            return response.json();
        })
            .then(function (data) {
                result.status = "Success";
            })
            .catch(function (error) {
                console.log("Request failed", error);
                throw new Error(error);
            });
        return result;
    } catch (err) {
        throw new Error(err);
    }
}
module.exports = {
    getUserByRefreshToken,
    createAccessToken,
    createRefreshToken,
    refreshAccessTokenByRefreshToken,
    createTokens
};