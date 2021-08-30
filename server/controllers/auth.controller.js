const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const authController = {};

authController.loginWithEmail = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return next(new AppError(400, "Invalid Credentials", "Login Error"));

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return next(new AppError(400, "Wrong Password", "Login Error"));

  accessToken = user.generateToken();
  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Login Successfully"
  );
});

authController.loginWithFacebookOrGoogle = catchAsync(
  async (req, res, next) => {
    let profile = req.user;
    profile.email = profile.email.toLowerCase();
    let user = await User.findOne({ email: profile.email });
    const randomPassword = "" + Math.floor(Math.random() * 10000000);
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(randomPassword, salt);

    if (user) {
      if (!user.emailVerified) {
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $set: { emailVerified: true, avatarUrl: profile.avatarUrl },
            $unset: { emailVerified: 1 },
          },
          { new: true }
        );
      } else {
        user = await User.findByIdAndUpdate(
          user._id,
          { avatarUrl: profile.avatarUrl },
          { new: true }
        );
      }
    } else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: newPassword,
        avatarUrl: profile.avatarUrl,
      });
    }

    const accessToken = await user.generateToken();
    return sendResponse(
      res,
      200,
      true,
      { user, accessToken },
      null,
      "Login Successfully"
    );
  }
);

// authController.loginWithFacebookOrGoogle = catchAsync((req, res, next) => {});

module.exports = authController;
