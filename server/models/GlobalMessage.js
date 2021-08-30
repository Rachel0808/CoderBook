const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const globalMsgSchema = Schema(
  {
    user: { type: Schema.ObjectId, required: true, ref: "User" },
    body: { type: String, required: true },
  },
  { timestamp: true }
);
const GlobalMsgSchema = mongoose.model("GlobalMessage", globalMsgSchema);
module.exports = GlobalMsgSchema;
