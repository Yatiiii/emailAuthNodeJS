let accountsServices = require('../services/accountsServices');

const verifyProfileCompletion = async (req, res, next) => {
    const { userId } = req;
    const user = await accountsServices.getUserById(userId);
    if (!user) {
        res.redirect('/accounts/register');
        return;
    }
    if (user.isProfileComplete) {
        next();
    } else {
        res.redirect('/users/profileCompletion');
        return;
    }
}

module.exports = verifyProfileCompletion