const mongoose = require("mongoose");
const Template = require("../models/Template");
const Mailgun = require("mailgun-js");
const mailgun = new mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});
const emailHelper = {};
const emailInternalHelper = {};

emailInternalHelper.createTemplatesIfNotExists = async () => {
  try {
    let template = await Template.findOne({ template_key: "verify_email" });
    if (!template) {
      await Template.create({
        name: "Verify Email Template",
        template_key: "verify_email",
        description: "This template is used when user register a new email",
        from: "Puma Social <Puma_Social@mg",
        subject: "Welcome to PumaSocial!",
        variables: ["name", "code"],
        html: `Hi<strong>%name%</strong>,
        <br/> <br/>
        Thank you for you registration.
        <br/> <br/>
        Please confirm your email address by clicking on the link below.
        <br/> <br/>
        %code%
        <br/> <br/>
        If you face any difficulty during the signup, please reach out to out to me: janeracheaul@gmail.com
        <br/> <br/> 
        `,
      });
      console.log("Created verify_email template");
    }
  } catch (error) {
    console.log(error);
  }
};

emailHelper.renderEmailTemplate = async (
  template_key,
  variablesObj,
  toEmail
) => {
  const template = await Template.findOne({ template_key });
  if (!template) {
    return { error: "Invalid Template Key" };
  }
  const data = {
    from: template.from,
    to: toEmail,
    subject: template.subject,
    html: template.html,
  };
  for (let index = 0; index < template.variables.length; index++) {
    let key = template.variables[index];
    if (!variablesObj[key]) {
      return {
        error: `Invalid variable key: Missing ${template.variables[index]}`,
      };
    }
    let re = new RegExp(`%${key}%`, "g");
    data.suggest = data.subject.replace(re, variablesObj[key]);
    data.html = data.html.replace(re, variablesObj[key]);
  }
  return data;
};

emailHelper.send = (data) => {
  mailgun.messages().send(data, function (error, info) {
    if (error) {
      console.log(error);
    }
    console.log(info);
  });
};

module.exports = { emailHelper, emailInternalHelper };
