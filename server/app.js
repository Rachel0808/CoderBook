var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const utilsHelper = require("./helpers/utils.helper");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const MONGODB_URL = process.env.MONGODB_URL;

const passport = require("passport");
require("./helpers/passport.helper");

const multer = require("multer");
const upload = multer();

var indexRouter = require("./routes/index");
const { emailInternalHelper } = require("./helpers/email.helper");

const { AppError, sendResponse } = require("./helpers/utils.helper");

var app = express();

app.use(passport.initialize());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// console.log("dot",process.env.PORT)
// console.log("URL",MONGODB_URL)
mongoose
  .connect(MONGODB_URL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Mongoose connected to ${MONGODB_URL}`);
    emailInternalHelper.createTemplatesIfNotExists();
  })
  .catch((err) => {
    console.log(err);
  });
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.json({ message: "HI there!" });
});
app.use("/api", indexRouter);

app.use((req, res, next) => {
  const err = new AppError(404, "Resources not Found", "404 Not Found");
  err.statusCode = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log("ERROR", err);
  if (err.isOperational) {
    return utilsHelper.sendResponse(
      res,
      err.statusCode ? err.statusCode : 500,
      false,
      null,
      { message: err.message },
      err.errorType
    );
  } else {
    return utilsHelper.sendResponse(
      res,
      err.statusCode ? err.statusCode : 500,
      false,
      null,
      { message: err.message },
      "Internal Server Error"
    );
  }
});

module.exports = app;
