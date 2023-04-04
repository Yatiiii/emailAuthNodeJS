const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const Sib = require("sib-api-v3-sdk");
require("dotenv").config();

// const uri = process.env.MONGODB_URI;
// const client = new MongoClient(uri);
// const database = client.db("LetUsFarm");

const jwt = require("jsonwebtoken");

const userImageS3 = require("../services/userImageS3");
const userCertificateS3 = require("../services/userCertificateS3");
const jwtServices = require("../services/jwtServices");

const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const { encrypt, decrypt } = require("../services/encryptionServices");

/*-------------------Functions----------------------*/
function getUserByEmail(email) {
    fetch(
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
}

function getUserById(id) {
    fetch(
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
}
async function createUser(fullName, email, phone, password) {
    try {
        let bcryptSalt;
        bcrypt.genSalt(10, function (saltError, salt) {
            if (saltError) {
                throw new Error(saltError);
            } else {
                bcryptSalt = salt;
            }
        });
        let hashedPass;
        bcrypt.hash(password, salt, function (hashError, hash) {
            if (hashError) {
                throw new Error(hashError);
            }
            hashedPass = hash;
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
                    data.result;
                } else {
                    throw new Error("An unknown error occurred!");
                }
            })
            .catch(function (error) {
                console.log("Request failed", error);
                throw new Error(error);
            });
    } catch (err) {
        throw new Error(err)
    }
    // hashing password and adding user
    // bcrypt.genSalt(10, function (saltError, salt) {
    //     if (saltError) {
    //         return callback(saltError);
    //     } else {
    //         bcrypt.hash(password, salt, function (hashError, hash) {
    //             if (hashError) {
    //                 return callback(hashError);
    //             }
    //             console.log(hash);
    //             const reqBody = {
    //                 fullName: fullName,
    //                 email: email,
    //                 password: hash,
    //                 phone: phone,
    //             };
    //             // console.log(reqBody)
    //             fetch(
    //                 "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUser?secret=vedant",
    //                 {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify(reqBody),
    //                 }
    //             )
    //                 .then(function (response) {
    //                     return response.json();
    //                 })
    //                 .then(function (data) {
    //                     console.log("Request succeeded with JSON response", data);
    //                     if (data.status == "Fail") {
    //                         return callback(data.error);
    //                     } else if (data.status == "Success") {
    //                         return callback(null, data.result);
    //                     } else {
    //                         return callback("An unknown error occurred!");
    //                     }
    //                 })
    //                 .catch(function (error) {
    //                     console.log("Request failed", error);
    //                     return callback(error);
    //                 });
    //         });
    //     }
    // });
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
    sendMail(email, code);
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
        })
        .catch(function (error) {
            console.log("Request failed", error);
            return error;
        });
}

function sendMail(email, code) {
    const client = Sib.ApiClient.instance;
    const apiKey = client.authentications["api-key"];
    apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

    const tranEmailApi = new Sib.TransactionalEmailsApi();
    const sender = {
        email: "vedantjain1008@gmail.com",
        name: "Vedant",
    };
    const receivers = [
        {
            email: email,
        },
    ];

    tranEmailApi
        .sendTransacEmail({
            sender,
            to: receivers,
            subject: "Verification Code",
            htmlContent: `
        Your one time verification code is -
            <h1>${code}</h1>
        This is a one time verification code.
        Thank you for registering at LetUsFarm`,
        })
        .then(console.log)
        .catch(console.log);
}

async function checkVerification(email, code) {
    try {
        //Checking user
        const findUser = getUserByEmail(email);
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
            return callback(findUser.error);
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
                    throw new Error("Code Expired. We have sent a new verification Code");
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
                        return true;
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
                        console.log("New verification created: ", data);
                        return true;
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

            // sendEmailVerification(email, function (error) {
            //     if (error) return callback(error);
            //     else {
            //         return callback("We have sent a verification Code");
            //     }
            // });
        }
    } catch (err) {
        throw new Error(err);
    }

}

async function signIn(email, password) {
    try {
        const findUser = await fetch(
            "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail=" +
            email,
            {
                method: "GET",
            }
        ).then(function (response) {
            return response.json();
        })
            .then(function (data) {
                return data;
            })
            .catch(function (error) {
                console.log("Request failed", error);
                throw new Error(error);
            });
        if (findUser.status == "Fail") {
            throw new Error(findUser.error);
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
                throw new Error(error);
            } else if (!isMatch) {
                throw new Error("Wrong Password");
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
                throw new Error(error);
            });
        if (!updation) {
            throw new Error("Unable to add tokens");
        }
        const result = {
            user: user,
            refreshToken: refreshToken,
            accessToken: accessToken
        }
        // console.log("Result: ",result)
        return result;
    } catch (err) {
        console.log(err);
    }
}

// async function profileCompletion(email, userImage, userCertificate, addressLine1, addressLine2, addressPinCode, addressCity, addressState, addressCountry, callback) {
//     const user = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/getUserByEmail?secret=alwaysShine&email="+email, {
//             method: "GET",
//         }).then(function (response) {
//             return response.json();
//         }).then(function (data) {
//             // console.log('Request succeeded with JSON response', data);
//             if (data) return data;
//             else return callback("User Not Found");
//         }).catch(function (error) {
//             console.log('Request failed', error);
//             return callback(error);
//         });
//     if (!user) return callback("User Not Found");

//     const awsUserImage = await userImageS3.uploadFile(userImage); // UPLOADING IMAGE
//     // console.log(`users/image/${imageUpload.key}`);
//     await unlinkFile(userImage.path);
//     const awsUserCertificate = await userCertificateS3.uploadFile(userCertificate); // UPLOADING CERTIFICATE
//     // console.log(`users/certificate/${certificateUpload.key}`);
//     await unlinkFile(userCertificate.path);

//     const reqBody = {
//         email: email,
//         awsUserImage: awsUserImage,
//         awsUserCertificate: awsUserCertificate,
//         addressLine1: addressLine1,
//         addressLine2: addressLine2,
//         addressPinCode: addressPinCode,
//         addressCity: addressCity,
//         addressState: addressState,
//         addressCountry: addressCountry,
//     };
//     fetch(
//                 "https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/completeProfile?secret=alwaysShine",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         // 'Content-Type': 'application/x-www-form-urlencoded',
//                     },
//                     body: JSON.stringify(reqBody),
//                 }
//             )
//                 .then(function (response) {
//                     return response.json();
//                 })
//                 .then(function (data) {
//                     console.log(data)
//                     return callback(null,true);
//                 })
//                 .catch(function (error) {
//                     console.log("Request failed", error);
//                     return callback(error);
//                 });

// }
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
