const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reactionSchema = Schema(
  {
    user: { type: Schema.ObjectId, required: true, ref: "user" },
    targetType: { type: String, required: true, enum: ["Blog", "Review"] },
    targetId: {
      type: Schema.ObjectId,
      required: true,
      refPath: "targetType",
    },
    emoji: {
      type: String,
      required: true,
      enum: ["laugh", "sad", "like", "love", "angry"],
    },
  },
  { timestamp: true }
);

reactionSchema.statics.calculateReaction = async function (
  targetId,
  targetType
) {
  const stats = await this.aggregate([
    {
      $match: { targetId },
    },
    {
      $group: {
        _id: "$targetId",
        laugh: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "laugh"] }, 1, 0],
          },
        },
        sad: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "sad"] }, 1, 0],
          },
        },
        like: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "like"] }, 1, 0],
          },
        },
        love: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "love"] }, 1, 0],
          },
        },
        angry: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "angry"] }, 1, 0],
          },
        },
      },
    },
  ]);
  await mongoose.model(targetType).findByIdAndUpdate(targetId, {
    reactions: {
      laugh: (stats[0] && stats[0].laugh) || 0,
      sad: (stats[0] && stats[0].sad) || 0,
      like: (stats[0] && stats[0].like) || 0,
      love: (stats[0] && stats[0].love) || 0,
      angry: (stats[0] && stats[0].angry) || 0,
    },
  });
};

reactionSchema.post("save", async function () {
  await this.constructor.calculateReaction(this.targetId, this.targetType);
});

reactionSchema.pre(/^findOne/, async function (next) {
  this.doc = await this.findOne();
  next();
});

reactionSchema.post(/^findOneAnd/, async function (next) {
  await this.doc.constructor.calculateReaction(
    this.doc.targetId,
    this.doc.targetType
  );
});

const Reaction = mongoose.model("Reaction", reactionSchema);
module.exports = Reaction;
