const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Comment = require("../models/Comment");
const Blog = require("../models/Blog");
const { default: App } = require("../../client/src/App");
const { deleteSingleBlog } = require("./blog.controller");

const CommentController = {};

CommentController.createNewComment = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const blogId = req.params.id;
  const { content } = req.body;

  const blog = Blog.findById(blogId);
  if (!blog)
    return next(
      new AppError(404, "Blog not Found", "create New Comment Error")
    );
  let comment = await Comment.create({
    user: userId,
    blog: blogId,
    content,
  });
  comment = await comment.populate("user").execPopulate();
  return sendResponse(
    res,
    200,
    true,
    comment,
    null,
    "Create new comment successfully"
  );
});

CommentController.getCommentsOfBlog = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const blog = Blog.findById(blogId);
  if (!blog)
    return next(
      new AppError(404, "Blog not Found", "create New Comment Error")
    );

  const totalComment = await Comment.countDocuments({ blog: blogId });
  const totalPages = Math.ceil(totalComment / limit);
  const offset = limit * (page - 1);

  const comments = await Comment.find({ blog: blogId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(res, 200, true, { comments, totalPages }, null, "");
});

CommentController.updateSingleComment = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const commentId = req.params.id;
  const { content } = req.body;

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, user: userId },
    { content },
    { new: true }
  );
  if (!comment)
    return next(
      new AppError(
        400,
        "Comment is not Found or User not authorized",
        "Update Comment Error"
      )
    );
  return sendResponse(res, 200, true, comment, null, "Update successfully");
});

CommentController,
  (deleteSingleComment = catchAsync(async (req, res, next) => {
    const userId = req.userId;
    const commentId = req.params.id;

    const comment = await Comment.findOneAndUpdate({
      _id: commentId,
      user: userId,
    });
    if (!comment)
      return next(
        new AppError(
          400,
          "Comment is not found or User is not authorized",
          "Delete Comment Error"
        )
      );
    return sendResponse(res, 200, true, null, null, "Delete Successfully");
  }));
module.exports = CommentController;
