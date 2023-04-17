const Sib = require("sib-api-v3-sdk");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const accountsServices = require("../services/accountsServices");
const s3Services = require('../services/s3');
const mailServices = require("../services/mailServices");
const mailDataServices = require("../services/mailDataServices");

const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const { encrypt, decrypt } = require("../services/encryptionServices");

async function getThesisListById(mentorId) {
    let result = {
        status: "Fail",
        result: null,
        error: null
    }
    if (!mentorId) {
        result.error = "Mentor Id not provided";
        return result;
    }
    let thesisListResult = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getThesisListByMentorId?secret=vedant&userId="+mentorId, {
        method: "GET",
    }
    ).then(function (response) {
        return response.json();
    }).then(function (data) {
        // console.log('Request succeeded with JSON response', data);
        return data;
    }).catch(function (error) {
        console.log('Request failed', error);
        result.error = error;
    });
    if (result.error) return result;
    if (thesisListResult.status == "Fail") {
        result.error = thesisListResult.error;
        return result;
    }
    result.status = "Success";
    result.result = thesisListResult.result;
    return result;
}

async function getThesisById(thesisId) {
    let result = {
        status: "Fail",
        result: null,
        error: null
    }
    if (!thesisId) {
        result.error = "Mentor Id not provided";
        return result;
    }
    let thesisResult = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getThesisById?secret=vedant&thesisId="+thesisId, {
        method: "GET",
    }
    ).then(function (response) {
        return response.json();
    }).then(function (data) {
        // console.log('Request succeeded with JSON response', data);
        return data;
    }).catch(function (error) {
        console.log('Request failed', error);
        result.error = error;
    });
    if (result.error) return result;
    if (thesisResult.status == "Fail") {
        result.error = thesisResult.error;
        return result;
    }
    result.status = "Success";
    result.result = thesisResult.result[0];
    console.log(result);
    return result;
}


async function uploadThesis(mentorId, scholarEmail, thesisName, thesis) {
    let result = {
        status: "Success",
        result: null
    }
    let errResult = {
        status: "Fail",
        error: null
    }
    let mentor = await accountsServices.getUserById(mentorId);
    console.log("mentor", mentor);
    if (!mentor) {
        errResult.error = "Mentor not found";
        return errResult;
    }

    let scholarResult = await accountsServices.getUserByEmail(scholarEmail);
    if (!scholarResult||scholarResult.status=="Fail") {
        errResult.error = "Scholar not found";
        return errResult;
    }
    let scholar = scholarResult.result;
    console.log("scholar", scholar);
    //pushing thesis into database
    console.log("Thesis req: ", thesis);
    let pushResult = await s3Services.uploadFile(thesis);
    console.log("thesis", pushResult);
    await unlinkFile(thesis.path)
    const thesisReqBody = {
        mentorId: mentor._id,
        thesisName: thesisName,
        thesisLink: `/users/thesis/${pushResult.Key}`,
        scholarId: scholar._id
    };
    //adding in mongoDB
    await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createThesis?secret=vedant", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(thesisReqBody)
    }
    ).then(function (response) {
        return response.json();
    }).then(function (data) {
        // console.log('Request succeeded with JSON response', data);
        console.log(data);
        result.result = data;
    }).catch(function (error) {
        console.log('Request failed', error);
        return callback(error);
    });
    
    // Sending Mail
    let content = mailDataServices.thesisSubmissionContent(mentor.name, description);
    mailServices.sendMail(scholar.email, content, "Thesis submitted");
    return result;
}

module.exports = {
    getThesisById,
    getThesisListById,
    uploadThesis
}