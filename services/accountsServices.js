const bcrypt = require("bcrypt");
const Sib = require("sib-api-v3-sdk");
require("dotenv").config();

const jwtServices = require("../services/jwtServices");
const mailServices = require("../services/mailServices");
const mailDataServices = require("../services/mailDataServices");

const fs = require("fs");
const util = require("util");

/*-------------------Functions----------------------*/
async function getUserByEmail(email) {
    let user = await fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail=" +
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
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserById?secret=vedant&userId=" +
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
                bcrypt.hash(password, salt, function (hashError, hashPass) {
                    if (hashError) {
                        throw new Error(hashError);
                    }
                    hashedPass = hashPass;
                });
            }
        });

        const reqBody = {
            fullName: fullName,
            email: email,
            password: hashedPass,
            phone: phone,
        };
        // console.log(reqBody)
        await fetch(
            "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUser?secret=vedant",
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

function sendEmailVerification(email) {
    let code = generateVerificationCode();
    const reqBody = {
        userEmail: email,
        code: code,
    };
    let content = mailDataServices.verificationMailContent(code);
    mailServices.sendMail(email, content);
    console.log(email, code);
    fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createVerification?secret=vedant",
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
}

async function checkVerification(email, code) {
    try {
        //Checking user
        let findUser = await getUserByEmail(email);
        console.log("User found: ", findUser);
        // const findUser = await fetch(
        //     "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail=" +
        //     email,
        //     {
        //         method: "GET",
        //     }
        // )
        //     .then(function (response) {
        //         return response.json();
        //     })
        //     .then(function (data) {
        //         console.log("User founded: ", data);
        //         return data;
        //     })
        //     .catch(function (error) {
        //         console.log("Request failed", error);
        //         return callback(error);
        //     });
        // console.log(findUser)
        if (findUser.status == "Fail") {
            return {
                status: "Fail",
                error: findUser.error
            };
        }
        const user = findUser.result;
        const userId = user._id;

        //Fetching verification
        let findVerification;
        await fetch(
            "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getVerificationByUserId?secret=vedant&userId=" +
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
                findVerification = data;
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
                let sendverificationError = sendEmailVerification(email);
                if (sendverificationError)
                    throw new Error(sendverificationError);
                else {
                    let sendverificationError = sendEmailVerification(email);
                    if (sendverificationError)
                        throw new Error(sendverificationError);

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
                fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/updateUserVerificationByUserEmail?secret=vedant",
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
                fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/updateVerificationsStatusById?secret=vedant",
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
            } else {
                //updating verification's status to FAILED
                const verificationReqBody = {
                    verificationId: verification._id,
                    status: "Failed",
                };
                fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/updateUserVerificationByUserEmail?secret=vedant",
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
                        let sendverificationError = sendEmailVerification(email);
                        if (sendverificationError)
                            throw new Error(sendverificationError);

                        return {
                            status: "Fail",
                            error: "We have sent a new verification code"
                        }
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        throw new Error(error);
                    });
                throw new Error("Incorrect Code");
            }
        } else {
            let sendverificationError = sendEmailVerification(email);
            if (sendverificationError)
                throw new Error(sendverificationError);

            return {
                status: "Fail",
                error: "We have sent a new verification code"
            }
            // sendEmailVerification(email, function (error) {
            //     if (error) return callback(error);
            //     else {
            //         return callback("We have sent a verification Code");
            //     }
            // });
        }
    } catch (err) {
        return {
            status: "Fail",
            error: err
        }
    }

}

async function signIn(email, password) {
    const errResult = {
        status: "Fail",
        error: null
    }
    const findUser = await getUserByEmail(email);
    console.log(findUser);
    if (findUser.status == "Fail") {
        errResult.error = findUser.error;
        return errResult;
    }

    // console.log("User Found: ", findUser);
    const user = findUser.result;
    if (!user.isEmailVerified) {
        return { user, _, _ };
    }

    //matching password
    let passMatch;
    bcrypt.compare(password, user.password, function (error, isMatch) {
        if (error) {
            errResult.error = error;
            return errResult;
        } else if (!isMatch) {
            errResult.error = "Wrong Password";
            return errResult;
        } else {
            passMatch = true;
        }
    });

    //creating tokens
    const accessToken = jwtServices.createAccessToken(user);
    const refreshToken = jwtServices.createRefreshToken(user);

    //Adding refresh Token in database
    const refreshTokenBody = {
        userId: user._id,
        refreshToken: refreshToken,
    };
    const updation = await fetch(
        "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUserRefreshToken?secret=vedant",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: JSON.stringify(refreshTokenBody),
        }
    ).then(function (response) {
        return response.json();
    })
        .then(function (data) {
            return data;
        })
        .catch(function (error) {
            console.log("Request failed", error);
            errResult.error = error;
            return errResult;
        });
    if (!updation) {
        errResult.error = "Unable to add tokens";
        return errResult;
    }
    const result = {
        status: "Success",
        user: user,
        refreshToken: refreshToken,
        accessToken: accessToken
    }
    // console.log("Result: ",result)
    return result;
    // try {
    //     const findUser = await fetch(
    //         "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail=" +
    //         email,
    //         {
    //             method: "GET",
    //         }
    //     ).then(function (response) {
    //         return response.json();
    //     })
    //         .then(function (data) {
    //             return data;
    //         })
    //         .catch(function (error) {
    //             console.log("Request failed", error);
    //             throw new Error(error);
    //         });
    //     if (findUser.status == "Fail") {
    //         throw new Error(findUser.error);
    //     }

    //     // console.log("User Found: ", findUser);
    //     const user = findUser.result;
    //     if (!user.isEmailVerified) {
    //         return { user, _, _ };
    //     }

    //     //matching password
    //     let passMatch;
    //     bcrypt.compare(password, user.password, function (error, isMatch) {
    //         if (error) {
    //             throw new Error(error);
    //         } else if (!isMatch) {
    //             throw new Error("Wrong Password");
    //         } else {
    //             passMatch = true;
    //         }
    //     });

    //     //creating tokens
    //     const accessToken = jwtServices.createAccessToken(user);
    //     const refreshToken = jwtServices.createRefreshToken(user);

    //     //Adding refresh Token in database
    //     const refreshTokenBody = {
    //         userId: user._id,
    //         refreshToken: refreshToken,
    //     };
    //     const updation = await fetch(
    //         "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUserRefreshToken?secret=vedant",
    //         {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 // 'Content-Type': 'application/x-www-form-urlencoded',
    //             },
    //             body: JSON.stringify(refreshTokenBody),
    //         }
    //     ).then(function (response) {
    //         return response.json();
    //     })
    //         .then(function (data) {
    //             return data;
    //         })
    //         .catch(function (error) {
    //             console.log("Request failed", error);
    //             throw new Error(error);
    //         });
    //     if (!updation) {
    //         throw new Error("Unable to add tokens");
    //     }
    //     const result = {
    //         status: "Success",
    //         user: user,
    //         refreshToken: refreshToken,
    //         accessToken: accessToken
    //     }
    //     // console.log("Result: ",result)
    //     return result;
    // } catch (err) {
    //     console.log(err);
    //     const result = {
    //         status: "Fail",
    //         error: err
    //     }
    //     return result;
    // }
}
module.exports = {
    // isAuthentic,
    // isApproved,
    getUserByEmail,
    getUserById,
    // getUserProfileByEmail,
    createUser,
    signIn,
    sendEmailVerification,
    checkVerification,
    // profileCompletion,
};
