function verificationMailContent(code) {
    let content = `
    Your one time verification code is -
        <h1>${code}</h1>
    This is a one time verification code.
    Thank you for registering at LetUsFarm`
    return content;
}

function thesisSubmissionContent(mentor, thesis) {
    const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; // Months start at 0!
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        const formattedToday = dd + '/' + mm + '/' + yyyy;
    let content = `Your thesis has been submitted by <b>${mentor}</b> on <u>${formattedToday}</u> on the topic <i>"${thesis}"</i>.`
    return content;
}

module.exports = {
    verificationMailContent,
    thesisSubmissionContent
}