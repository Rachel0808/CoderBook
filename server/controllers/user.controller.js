const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Friendship = require("../models/Friendship");
const Conversation = require("../models/Conversation");
const { emailHelper } = require("../helpers/email.helper");
const utilsHelper = require("../helpers/utils.helper");
// const { default: App } = require("../../client/src/App");
// const { parse } = require("dotenv");
const FRONTEND_URL = process.env.FRONTEND_URL;
const userController = {};

userController.register = catchAsync(async (req, res, next) => {
  let { name, email, password, avatarUrl } = req.body;
  let user = await User.findOne({ email });
  if (user)
    return next(new AppError(409, "User Already Exists", "Registration Error"));

  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);
  const emailVerificationCode = utilsHelper.generateRandomHexString(20);
  user = await User.create({
    name,
    email,
    password,
    avatarUrl,
    emailVerificationCode,
    emailVerified: false,
  });

  const accessToken = await user.generateToken();

  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Create user successfully"
  );
});

userController.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  let user = await User.findOne({
    emailVerificationCode: code,
  });
  if (!user) {
    return next(
      new AppError(400, "Invalid Verification Code", "Verify Email Error")
    );
  }
  user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: { emailVerified: true },
      $unset: { emailVerificationCode: 1 },
    },
    { new: true }
  );
  const accessToken = await user.generateToken();
  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    " Create User successfully"
  );
});

userController.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const allows = ["name", "password", "avatarUrl"];
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(404, "Account not Found", "Update Profile Error"));
  }

  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });
  await user.save();
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Update Profile Successfully"
  );
});

userController.getUsers = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const currentUserId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalUsers = await User.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalUsers / limit);
  const offset = limit * (page - 1);

  let users = await User.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = await Friendship.findOne(
      {
        $or: [
          { from: currentUserId, to: user._id },
          { from: user._id, to: currentUserId },
        ],
      },
      "-_id status updatedAt"
    );
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    ""
  );
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user)
    return next(
      new AppError(400, "User is not Found", "Get Current User Error")
    );
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get current user successfully"
  );
});

userController.sendFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const toUserId = req.params.id;
  const user = await User.findById(toUserId);
  if (!user) {
    return next(
      new AppError(400, "User is not Found", "Send Friend Request Error")
    );
  }
  let friendship = await Friendship.findOne({
    $or: [
      { from: toUserId, to: userId },
      { from: userId, to: toUserId },
    ],
  });
  if (!friendship) {
    await Friendship.create({
      from: userId,
      to: toUserId,
      status: "requesting",
    });
    return sendResponse(res, 200, true, null, null, "Request has been sent");
  } else {
    switch (friendship.status) {
      case "requesting":
        if (friendship.from.equals(userId)) {
          return next(
            new AppError(
              400,
              "You have already sent a request to this user",
              "Add Friend Error"
            )
          );
        } else {
          return next(
            new AppError(
              400,
              "You have received a request from this User",
              "Add friend Error"
            )
          );
        }
        break;
      case "accepted":
        return next(
          new AppError(400, "Users are already friend", "Add Friend Error")
        );
        break;
      case "removed":
      case "decline":
      case "cancel":
        friendship.from = userId;
        friendship.to = toUserId;
        friendship.status = "requesting";
        await friendship.save();
        return sendResponse(
          res,
          200,
          true,
          null,
          null,
          "Request has been sent"
        );
        break;
      default:
        break;
    }
  }
});

userController.acceptFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const fromUserId = req.params.id;
  let friendship = await Friendship.findOne({
    from: fromUserId,
    to: userId,
    status: "requesting",
  });
  if (!friendship)
    return next(
      new AppError(404, "Friend Request is not found", "Accept Request Error")
    );
  friendship.status = "accepted";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Friend request has been accepted"
  );
});

userController.declineFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const fromUserId = req.params.id;
  let friendship = await Friendship.findOne({
    from: fromUserId,
    to: userId,
    status: "requesting",
  });
  if (!friendship)
    return next(
      new AppError(404, "Request is not found", "Decline Request Error")
    );
  friendship.status = "decline";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Friend request has been declined"
  );
});

userController.getFriendList = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  let friendList = await Friendship.find({
    $or: [{ from: userId }, { to: userId }],
    status: "accepted",
  });
  const friendId = friendList.map((friendship) => {
    if (friendship.from._id.equals(userId)) return friendship.to;
    return friendship.from;
  });
  const totalFriends = await User.countDocuments({
    ...filter,
    isDeleted: false,
    _id: { $in: friendId },
  });
  const totalPages = Math.ceil(totalFriends / limit);
  const offset = limit * (page - 1);
  let users = await User.find({ ...filter, _id: { $in: friendId } })
    .sort({
      ...sortBy,
      createdAt: -1,
    })
    .skip(offset)
    .limit(limit);
  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = friendList.find((friendship) => {
      if (friendship.from.equals(user._id) || friendship.to.equals(user._id)) {
        return { status: friendship.status };
      }
      return false;
    });
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    null
  );
});

userController.getSentFriendRequestList = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  let requestList = await Friendship.find({
    from: userId,
    status: "requesting",
  });
  const recipientsIDs = requestList.map((friendship) => {
    if (friendship.from._id.equals(userId)) return friendship.to;
    return friendship.from;
  });
  const totalRequests = await User.countDocuments({
    ...filter,
    isDeleted: false,
    _id: { $in: recipientsIDs },
  });
  const totalPages = Math.ceil(totalRequests / limit);
  const offset = limit * (page - 1);

  let users = await User.find({ ...filter, _id: { $in: recipientsIDs } })
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = requestList.find((friendship) => {
      if (friendship.from.equals(user._id) || friendship.to.equals(user._id)) {
        return { status: friendship.status };
      }
      return false;
    });
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    null
  );
});

userController.getReceivedFriendRequestList = catchAsync(
  async (req, res, next) => {
    let { page, limit, sortBy, ...filter } = { ...req.query };
    const userId = req.userId;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let requestList = await Friendship.find({
      to: userId,
      status: "requesting",
    });

    const requesterIDs = requestList.map((friendship) => {
      if (friendship.from._id.equals(userId)) return friendship.to;
      return friendship.from;
    });

    const totalRequests = await User.countDocuments({
      ...filter,
      isDeleted: false,
      _id: { $in: requesterIDs },
    });
    const totalPages = Math.ceil(totalRequests / limit);
    const offset = limit * (page - 1);

    let users = await User.find({ ...filter, _id: { $in: requesterIDs } })
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const promises = users.map(async (user) => {
      let temp = user.toJSON();
      temp.friendship = requestList.find((friendship) => {
        if (
          friendship.from.equals(user._id) ||
          friendship.to.equals(user._id)
        ) {
          return { status: friendship.status };
        }
        return false;
      });
      return temp;
    });
    const usersWithFriendship = await Promise.all(promises);

    return sendResponse(
      res,
      200,
      true,
      { users: usersWithFriendship, totalPages },
      null,
      null
    );
  }
);

userController.cancelFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const toUserId = req.params.id;
  let friendship = await Friendship.findOne({
    from: userId,
    to: toUserId,
    status: "requesting",
  });
  if (!friendship)
    return next(
      new AppError(404, "Request is not Found", "Cancel request Error")
    );

  friendship.status = "cancel";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Friend request has been cancelled"
  );
});

userController.removeFriendship = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const toBeRemovedUserId = req.params.id;
  let friendship = await Friendship.findOne({
    $or: [
      { from: userId, to: toBeRemovedUserId },
      { from: toBeRemovedUserId, to: userId },
    ],
    status: "accepted",
  });
  if (!friendship)
    return next(
      new AppError(404, "Friend is not Found", "Remove Friend Error")
    );
  friendship.status = "removed";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Friendship has been removed"
  );
});

userController.getConversationList = catchAsync(async (req, res, next) => {
  let { page, limit, name } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  name = name || "";

  let conversationList = await Conversation.find({
    users: userId,
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "users",
      math: { name: { $regex: name, $options: "i" } },
      select: "name avatarUrL",
    });

  let filteredCov = conversationList.map((conv) => {
    let toUser = [...conv.users];
    const index = toUser.findIndex((user) => user._id.equals(userId));
    if (index !== -1) toUser.splice(index, 1);

    if (toUser.length === 1) {
      let temp = conv.toJSON();
      delete temp.users;
      temp.to = toUser[0];
      temp.type = "CONVERSATION_TYPE.PRIVATE";
      return temp;
    }
    return false;
  });
  filteredCov = filteredCov.filter((conv) => conv !== false);
  const totalConversations = filteredCov.length;
  const totalPages = Math.ceil(totalConversations / limit);
  const offset = limit & (page - 1);
  filteredCov = filteredCov.slice(offset, offset + limit);

  return sendResponse(
    res,
    200,
    true,
    { conversations: filteredCov, totalPages },
    null,
    null
  );
});

module.exports = userController;
