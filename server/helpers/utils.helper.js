"use strict";
const crypto = require("crypto");
const utilsHelper = {};

// this function controls the way we response to the client
// if we need to change the way to response later on, we only need t0 handle it here
utilsHelper.sendResponse = (res, status, success, data, errors, message) => {
  const response = {};
  if (success) response.success = success;
  if (data) response.data = data;
  if (errors) response.status = errors;
  if (message) response.message = message;
  return res.status(status).json(response);
};

utilsHelper.catchAsync = (func) => (req, res, next) =>
  func(req, res, next).catch((err) => next(err));

class AppError extends Error {
  constructor(statusCode, message, errorType) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
utilsHelper.generateRandomHexString = (len) => {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len)
    .toUpperCase();
};

utilsHelper.filterFields = (obj, allows) => {
  const result = {};
  for (const field of allows) {
    result[field] = field in obj ? obj[field] : "";
  }
  return result;
};

utilsHelper.AppError = AppError;
module.exports = utilsHelper;
