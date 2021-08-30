const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");
const User = require("../models/User");

const blogController = {};

blogController.getBlogs = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parse(limit) || 10;

  const totalBlogs = await Blog.countDocuments({
    ...filter,
    isDeleted: false,
  });

  const totalPages = Math.ceil(totalBlogs / limit);
  const offset = limit * (page - 1);

  const blogs = await Blog.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("author");

  return sendResponse(res, 200, true, { blogs, totalPages }, null, "");
});
blogController.getSingleBlog = catchAsync(async (req, res, next) => {
  let blog = await (await Blog.findById(req.params.id)).populated("author");
  if (!blog)
    return next(new AppError(404, "Blog not Found", "Get Single Blog Error"));
  blog = blog.toJSON();
  blog.review = await Comment.find({ blog: blog._id }).populate("user");
  return sendResponse(res, 200, true, blog, null, null);
});

blogController.createNewBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const { title, content } = req.body;
  let { images } = req.body;
  const blog = await Blog.create({
    title,
    content,
    author,
    images,
  });
  return sendResponse(
    res,
    200,
    true,
    blog,
    null,
    "Create New Blog Successfully"
  );
});

blogController.updateSingleBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const blogId = req.params.id;
  const { title, content } = req.body;

  const blog = await Blog.findOneAndUpdate(
    { _id: blogId, author: author },
    { title, content },
    { new: true }
  );
  if (!blog)
    return next(
      new AppError(
        400,
        "Blog not Found or User is not authorized",
        "Update Blog Error"
      )
    );
  return sendResponse(res, 200, true, blog, null, "Update Blog Successfully");
});

blogController.deleteSingleBlog = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const blogId = req.params.id;

  const blog = await Blog.findOneAndUpdate(
    { _id: blogId, author: author },
    { isDeleted: true },
    { new: true }
  );
  if (!blog)
    return next(
      new AppError(
        400,
        "Blog not Found or User not authorized",
        "Delete Blog Error"
      )
    );
  return sendResponse(res, 200, true, null, null, "Delete Blog Successfully");
});

module.exports = blogController;
