const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
// const { delete } = require("../app");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const Schema = mongoose.Schema;

const userSchema = Schema(
  {
    name: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    avatarUrl: { type: String, require: false, default: "" },
    password: { type: String, required: true, select: false },
    emailVerificationCode: { type: String, required: false },
    emailVerified: { type: Boolean, required: true, default: false },
    friendCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);
userSchema.plugin(require("./plugins/isDeletedFalse"));

userSchema.methods.toJSON = function () {
  const obj = this._doc;
  delete obj.password;
  delete obj.emailVerificationCode;
  delete obj.emailVerified;
  delete obj.isDeleted;
  return obj;
};

userSchema.methods.generateToken = async function () {
  const accessToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
  return accessToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
