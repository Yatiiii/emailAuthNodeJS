const  fetch = require('node-fetch');
const bcrypt = require("bcrypt");
const Sib = require("sib-api-v3-sdk");
require("dotenv").config();

const mailServices = require("../services/mailServices");
const mailDataServices = require("../services/mailDataServices");

/*-------------------Functions----------------------*/
async function getUserByEmail(email) {
    let user = await fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/getUserByEmail?secret=vedant&userEmail=" +
        email,
        {
            method: "GET",
        }
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            // console.log('Request succeeded with JSON response', data);

            return data;
        })
        .catch(function (error) {
            console.log("Request failed", error);
            return { status: "Fail", error: error };
        });
    return user;
}

async function getUserById(id) {
    let user = await fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/getUserById?secret=vedant&userId=" +
        id,
        {
            method: "GET",
        }
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            return data;
        })
        .catch(function (error) {
            console.log("Request failed", error);
            return { status: "Fail", error: error };
        });
    return user;
}

async function createUser(fullName, email, phone, password) {
    try {
        let hashedPass;
        bcrypt.genSalt(10, function (saltError, salt) {
            if (saltError) {
                throw new Error(saltError);
            } else {
                bcrypt.hash(password, salt, async function (hashError, hashPass) {
                    if (hashError) {
                        throw new Error(hashError);
                    }
                    hashedPass = hashPass;
                    const reqBody = {
                        fullName: fullName,
                        email: email,
                        password: hashedPass,
                        phone: phone,
                    };
                    // console.log(reqBody)
                    await fetch(
                        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/createUser?secret=vedant",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(reqBody),
                        }
                    )
                        .then(function (response) {
                            return response.json();
                        })
                        .then(function (data) {
                            console.log("Request succeeded with JSON response", data);
                            if (data.status == "Fail") {
                                throw new Error(data.error);
                            } else if (data.status == "Success") {
                                console.log("User created: ", data.result);
                            } else {
                                throw new Error("An unknown error occurred!");
                            }
                        })
                        .catch(function (error) {
                            console.log("Request failed", error);
                            throw new Error(error);
                        });

                });
            }
        });
        return { status: "Success" }
    } catch (err) {
        let result = {
            status: "Fail",
            error: err
        };
        return result;
    }
}

function generateVerificationCode() {
    const max = 999999;
    const min = 100000;
    let code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code;
}

async function sendEmailVerification(email) {
    let code = generateVerificationCode();
    const reqBody = {
        userEmail: email,
        code: code,
    };
    let content = mailDataServices.verificationMailContent(code);
    mailServices.sendMail(email, content, "Verification Code");
    console.log(email, code);
    let result  =  await fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/createVerification?secret=t",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: JSON.stringify(reqBody),
        }
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            console.log("Verification created: ", data);
            return { status: "Success", result: data };
        })
        .catch(function (error) {
            console.log("Request failed", error);
            return { status: "Fail", error: error };
        });
    return result;
}

async function checkVerification(email, code) {
    try {
        //Checking user
        let findUser = await getUserByEmail(email);
        console.log("User found: ", findUser);
        if (findUser.status == "Fail") {
            return {
                status: "Fail",
                error: findUser.error
            };
        }
        const user = findUser.result;
        const userId = user._id;

        //Fetching verification
        let findVerification = await fetch(
            "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/getVerificationByUserId?secret=vedant&userId=" +
            userId,
            {
                method: "GET",
            }
        )
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                // console.log('Request succeeded with JSON response', data);
                console.log("verification founded: ", data);
                return data;
            })
            .catch(function (error) {
                console.log("Request failed", error);
                throw new Error(error);
            });
        if (findVerification.status == "Fail") {
            throw new Error(findVerification.error);
        }
        const verification = findVerification.result;
        if (verification) {
            const currDate = Date.now();
            if (currDate - verification.createdAt > 600000) {
                let sendverificationError = await sendEmailVerification(email);
                if (sendverificationError.status ==  "Fail")
                        throw new Error(sendverificationError.error);
                else {
                    let sendverificationError = await sendEmailVerification(email);
                    if (sendverificationError.status ==  "Fail")
                        throw new Error(sendverificationError.error);

                    return {
                        status: "Fail",
                        error: "We have sent a new verification code"
                    }
                }
            } else if (verification.code == code) {
                //updating user's verification status
                const userReqBody = {
                    userEmail: email,
                };
                await fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/updateUserVerificationByUserEmail?secret=vedant",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            // 'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: JSON.stringify(userReqBody),
                    }
                )
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        console.log("Updation of user: ", data);
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        throw new Error(error);
                    });

                //updating verification's status to SUCCESS
                const verificationReqBody = {
                    verificationId: verification._id,
                    status: "Successs",
                };
                let result = await fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/updateVerificationsStatusById?secret=vedant",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            // 'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: JSON.stringify(verificationReqBody),
                    }
                )
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        console.log("updation of  verification", data);
                        return {
                            status: "Success",
                            result: "Verified"
                        };
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        throw new Error(error);
                    });
                let content = mailDataServices.successfulVerification();
                mailServices.sendMail(email, content, "Successfull Verification");
                return result;
            } else {
                //updating verification's status to FAILED
                const verificationReqBody = {
                    verificationId: verification._id,
                    status: "Failed",
                };
                let result = await fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/p2/updateVerificationsStatusById?secret=vedant",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            // 'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: JSON.stringify(verificationReqBody),
                    }
                )
                    .then(function (response) {
                        return response.json();
                    })
                    .then(async function (data) {
                        return data;
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        throw new Error(error);
                    });
                console.log(result);
                    let sendverificationError = await sendEmailVerification(email);
                    if (sendverificationError.status ==  "Fail")
                        throw new Error(sendverificationError.error);
                throw new Error("Incorrect Code");
            }
        } else {
            let sendverificationError = await sendEmailVerification(email);
            if (sendverificationError.status ==  "Fail")
                throw new Error(sendverificationError.error);

            return {
                status: "Fail",
                error: "We have sent a new verification code"
            }
        }
    } catch (err) {
        return {
            status: "Fail",
            error: err
        }
    }

}

async function signIn(email, password, callback) {
    const errResult = {
        status: "Fail",
        error: null
    }
    const findUser = await getUserByEmail(email);
    console.log(findUser);
    if (findUser.status == "Fail") {
        errResult.error = findUser.error;
        return callback(errResult);
    }

    // console.log("User Found: ", findUser);
    const user = findUser.result;
    if (!user.isEmailVerified) {
        return callback({
            status: "User not verified",
            user
        });
    }

    //matching password
    let passMatch;
    bcrypt.compare(password, user.password,async function (error, isMatch) {
        if (error) {
            errResult.error = error;
            return errResult;
        } else if (!isMatch) {
            errResult.error = "Wrong Password";
            return errResult;
        } else {
            passMatch = true;
        //     res.cookie('user_id',user.id);
        //    return res.redirect('/users/profile');
            const result = {
                status: "Success",
                user: user,
            }
            return callback(result);
        }
    });
}
// async function logOut(_id) {
//     try {
//       const userId = await SessionModel.findOne({ where: { id: _id } });
//       if (userId == null) {
//         throw new UserNotSignedIn();
//       }
//       const user = await UserModel.findOne({ where: { id: userId } });
//       if (!user) {
//         throw new UserNotSignedIn();
//       }
//       await SessionModel.destroy({ where: { id: _id } });
//     } catch (err) {
//       console.log(err);
//       throw (err);
//     }
//   }
module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    signIn,
    // logOut,
    sendEmailVerification,
    checkVerification,
};
