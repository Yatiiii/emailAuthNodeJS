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

/*-----------Middleware----------------*/
// function isAuthentic(req, res, next) {
//     const { cipherTextEmail } = req.params;
//     const email = decrypt(cipherTextEmail);
//     fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/getUserByEmail?secret=alwaysShine&email="+email, {
//             method: "GET",
//         }).then(function (response) {
//             return response.json();
//         }).then(function (data) {
//             // console.log('Request succeeded with JSON response', data);
//             if (data) {
//                 if (data.isProfileComplete||req.route.path=="/profile/completion/:cipherTextEmail") next();
//                 else res.redirect(`/users/profile/completion/${cipherTextEmail}`);
//             }
//             else res.send("User not Found.\nPlease Log-in.");
//         }).catch(function (error) {
//             console.log('Request failed', error);
//             res.send("User not Found.\nPlease Log-in."+error);
//         });
// }

// function isApproved(req, res, next) {
//     const { cipherTextEmail } = req.params;
//     const email = decrypt(cipherTextEmail);
//     fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/getUserProfileByEmail?secret=alwaysShine&email=" + email, {
//         method: "GET",
//     }).then(function (response) {
//         return response.json();
//     }).then(function (data) {
//         if (!data) res.send("User Not Found");
//         const [user] = data;
//         if(!user.isReviewed) res.send("Your account is under review. Action not available")
//         const [latestReview] = user.review.slice(-1);
//         if(latestReview === "Rejected") res.send("Your account is not approved. Action not available.")
//         else next();
//     })
// }

/*-------------------Functions----------------------*/
function getUserByEmail(email, callback) {
    fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail="+email, {
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

function getUserById(id, callback) {
     fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserById?secret=vedant&userId="+id, {
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

// function getUserProfileByEmail(email, callback) {
//     fetch("https://ap-south-1.aws.data.mongodb-api.com/app/letusfarm-fuadi/endpoint/getUserProfileByEmail?secret=alwaysShine&email="+email, {
//             method: "GET",
//         }).then(function (response) {
//             return response.json();
//         }).then(function (data) {
//             // console.log('Request succeeded with JSON response', data);
//             if (data) return callback(null, data[0]);
//             else return callback("User Not Found");
//         }).catch(function (error) {
//             console.log('Request failed', error);
//             return callback(error);
//         });
// }

async function createUser(fullName, email, phone, password, callback) {
    // hashing password and adding user
    bcrypt.genSalt(10, function (saltError, salt) {
        if (saltError) {
            return callback(saltError);
        } else {
            bcrypt.hash(password, salt, function (hashError, hash) {
                if (hashError) {
                    return callback(hashError);
                }
                console.log(hash);
                const reqBody = {
                    fullName: fullName,
                    email: email,
                    password: hash,
                    phone: phone,
                };
                // console.log(reqBody)
                fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUser?secret=vedant", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reqBody)
                }
                ).then(function (response) {
                    return response.json();
                }).then(function (data) {
                    console.log('Request succeeded with JSON response', data);
                    if (data.status == "Fail") {
                        return callback(data.error);
                    }
                    else if (data.status == "Success") {
                        return callback(null, data.result);
                    } 
                    else {
                        return callback("An unknown error occurred!");
                    }
                }).catch(function (error) {
                    console.log('Request failed', error);
                    return callback(error);
                });
            });
        }
    });
}

function generateVerificationCode() {
    const max = 999999;
    const min = 100000;
    let code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code;
}

function sendEmailVerification(email, callback) {
    let code = generateVerificationCode();
    const reqBody = {
        userEmail: email,
        code: code
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
            console.log("Request succeeded with JSON response", data);
            return callback(null);
        })
        .catch(function (error) {
            console.log("Request failed", error);
            return callback(error);
        });
}

function sendMail(email, code) {
    const client = Sib.ApiClient.instance;
    const apiKey = client.authentications['api-key'];
    apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

    const tranEmailApi = new Sib.TransactionalEmailsApi()
    const sender = {
        email: 'vedantjain1008@gmail.com',
        name: 'Vedant',
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
            subject: 'Verification Code',
            htmlContent: `
        Your one time verification code is -
            <h1>${code}</h1>
        This is a one time verification code.
        Thank you for registering at LetUsFarm`
        })
        .then(console.log)
        .catch(console.log);
}

async function checkVerification(email, code, callback) {
    //Checking user
    const findUser = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail=" + email, {
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
    console.log(findUser)
    if (findUser.status == "Fail") {
        return callback(findUser.error);
    }
    const user = findUser.result;
    const userId = user._id;
    
    //Fetching verification
    const findVerification = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getVerificationByUserId?secret=vedant&userId=" + userId, {
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
    if (findVerification.status == "Fail") {
        return callback(findVerification.error);
    }
    const verification = findVerification.result;
    if (verification) {
        const currDate = Date.now();
        if (currDate - verification.createdAt > 600000) {
            sendEmailVerification(email, function (error) {
                if (error) return callback(error);
                else {
                    return callback("Code Expired. We have sent a new verification Code");
                }
            });
        }
        else if (verification.code == code) {
            //updating user's verification status
            const userReqBody = {
                userEmail: email,
            }
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
                    // console.log("send response")
                    return callback(null,true);
                })
                .catch(function (error) {
                    console.log("Request failed", error);
                    return callback(error);
                });
            
            //updating verification's status to SUCCESS
                const verificationReqBody = {
                    verificationId: verification._id,
                    status: "Successs"
                }
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
                            // console.log("send response")
                            return callback(null,true);
                        })
                        .catch(function (error) {
                            console.log("Request failed", error);
                            return callback(error);
                        });
        }
        else {
            //updating verification's status to FAILED
            const verificationReqBody = {
                verificationId: verification._id,
                status: "Failed"
            }
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
                        // console.log("send response")
                        return callback(null,true);
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        return callback(error);
                    });
            return callback("Incorrect Code");
        }
    } else {
        sendEmailVerification(email, function (error) {
            if (error) return callback(error);
            else {
                return callback("We have sent a verification Code");
            }
        })
    }
}

async function signIn(email, password, callback) {
    //finding User
    const findUser = await fetch("https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/getUserByEmail?secret=vedant&userEmail="+email, {
            method: "GET",
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            // console.log('Request succeeded with JSON response', data);
            if (data) return data;
            else return callback("User Not Found");
        }).catch(function (error) {
            console.log('Request failed', error);
            return callback(error);
        });
    if (findUser.status == "Fail") {
        return callback(findUser.error);
    }

    const user = findUser.result;
    if (!(user.isEmailVerified)) {
        return callback(false, user);
    }

    //matching password
    bcrypt.compare(password, user.password, function (error, isMatch) {
        if (error) {
            return callback(error)
        } else if (!isMatch) {
            return callback("Wrong Password")
        } else {

            const accessToken = jwt.sign(
                { "userId": user._id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );
            const refreshToken = jwt.sign(
                { "userId": user._id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
            );

            //Adding refresh Token in database
            const refreshTokenBody = {
                userId: user._id,
                refreshToken: refreshToken
            }
            fetch(
                    "https://ap-south-1.aws.data.mongodb-api.com/app/pr3003-migmt/endpoint/createUserRefreshToken?secret=vedant",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            // 'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: JSON.stringify(refreshTokenBody),
                    }
            )
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        // console.log("send response")
                        return callback(false, user, refreshToken, accessToken);
                    })
                    .catch(function (error) {
                        console.log("Request failed", error);
                        return callback(error);
                    });
        }
    })
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