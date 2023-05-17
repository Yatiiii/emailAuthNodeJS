const Sib = require("sib-api-v3-sdk");

function sendMail(email, htmlContent, subject) {
    const client = Sib.ApiClient.instance;
    const apiKey = client.authentications["api-key"];
    apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

    const tranEmailApi = new Sib.TransactionalEmailsApi();
    const sender = {
        email: "yativishnoi8959@gmail.com",
        name: "Admin",
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
            subject: subject,
            htmlContent: htmlContent,
        })
        .then(console.log)
        .catch(console.log);
}

module.exports = {
    sendMail,
}