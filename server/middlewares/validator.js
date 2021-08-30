const utilsHelper = require("../helpers/utils.helper");
const mongoose = require("mongoose");

const { validatoonResult } = require("express-validator");
const validators = {};

validators.validate = (validationArray) => async (req, res, next) => {
  await Promise.all(validationArray.map((validation) => validation.run(req)));
  const errors = validatoonResult(req);
  if (errors.isEmpty()) return next();

  const extractedErrors = [];
  errors
    .array()
    .map((errors) => extractedErrors.push({ [errors.param]: error.msg }));
  return utilsHelper.sendResponse(
    res,
    422,
    false,
    null,
    extractedErrors,
    "Validation Error"
  );
};

validators.checkObjectId = (paramId) => {
  if (!mongoose.Types.ObjectId.isValid(paramId)) {
    throw new Error("Invalid ObjectId");
  }
  return true;
};
module.exports = validators;
