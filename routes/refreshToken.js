const express = require('express');
require('dotenv').config()

const router = express.Router();

const jwt = require('jsonwebtoken');

const accountsServices = require('../services/accountsServices');
const { encrypt, decrypt } = require('../services/encryptionServices');
const jwtServices = require('../services/jwtServices');

const handleRefreshToken = (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    console.log(cookies.jwt);
    const refreshToken = cookies.jwt;
    
    const findUser = jwtServices.getUserByRefreshToken(refreshToken);
    if (findUser.status == "Fail") {
        res.send(findUser.error);
    }
    const user = findUser.result;
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || user._id !== decoded.userId) {
                res.sendStatus(403);
            }
            const accessToken = jwt.sign(
                { "userId": user._id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );
            res.json(accessToken);
        }
    )
}

module.exports = handleRefreshToken;