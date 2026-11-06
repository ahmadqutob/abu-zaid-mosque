import { asyncHandler } from "../../../../Services/ErrorHandler.services.js";
import CoursePost from "../../../../../database/Models/coursePost.model.js";
import Course from "../../../../../database/Models/course.model.js";
import Registration from "../../../../../database/Models/enrollment.model.js";
import { sendEmail } from "../../../../Services/SendEmail.services.js";
import { canManageCourse, canReadCourseContent, isCourseManager } from "../../course.access.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const postEditData = (body) => {
  const allowedFields = ["title", "content", "type", "pinned", "attachments"];
  return Object.fromEntries(
    allowedFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
  );
};

// ─── CREATE COURSE POST ──────────────────────────────────────────────────────
/**
 * POST /course/post/create or POST /course-posts/create
 * Protected (admin, teacher)
 */
export const createCoursePost = asyncHandler(async (req, res, next) => {
  const { courseId, title, content, type, pinned, attachments } = req.body;

  // 1. Verify course exists and is active
  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // Only admins/superadmins and the teacher assigned to this course may post.
  if (!canManageCourse(req.user, course)) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only publish posts for your assigned course",
    });
  }

  // 3. Create course post
  const post = await CoursePost.create({
    courseId,
    authorId: req.user._id,
    title,
    content,
    type: type || "announcement",
    pinned: pinned || false,
    attachments: attachments || [],
  });

  const populatedPost = await CoursePost.findById(post._id)
    .populate("courseId", "name category level")
    .populate("authorId", "userName email role");

  // Notify approved course participants only; legacy course arrays are not an
  // authorization source because they can include unapproved registrations.
  (async () => {
    try {
      const registrations = await Registration.find({ courseId, status: "approved" })
        .populate("studentId", "userName email role deletedAt");
      const emailMap = new Map();

      registrations.forEach((reg) => {
        if (reg.studentId?.email && reg.studentId.role === "student" && !reg.studentId.deletedAt) {
          emailMap.set(reg.studentId.email, reg.studentId.userName || "Student");
        }
      });

      const subject = `New Post in ${course.name}`;

      for (const [email, userName] of emailMap.entries()) {
        const message = `<p>Hello <strong>${escapeHtml(userName)}</strong>,</p><p>A new post <strong>"${escapeHtml(title)}"</strong> has been published in your course <strong>${escapeHtml(course.name)}</strong>. Please check it from your course posts.</p>`;
        sendEmail(email, subject, message).catch((err) => {
          console.error(`Error sending post notification email to ${email}:`, err);
        });
      }
    } catch (err) {
      console.error("Failed to notify enrolled students for new post:", err);
    }
  })();

  return res.status(201).json({
    success: true,
    message: "Course post created successfully",
    data: populatedPost,
  });
});

// ─── GET ALL COURSE POSTS ────────────────────────────────────────────────────
/**
 * GET /course/post/all or GET /course-posts/all
 * Protected (admin, superAdmin, assigned teacher, approved student)
 * Filters: page, limit, courseId, type, pinned, search, sort
 */
export const getCoursePosts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    courseId,
    type,
    pinned,
    search,
    sort = "-pinned -createdAt",
  } = req.query;

  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { softDelete: false };

  // Scope the feed to courses this caller is allowed to read. Normal users
  // are intentionally not given course-workspace access by the router.
  let visibleCourseIds = [];
  if (isCourseManager(req.user)) {
    visibleCourseIds = await Course.find({ softDelete: false }).distinct("_id");
  } else if (req.user.role === "teacher") {
    visibleCourseIds = await Course.find({ teacherId: req.user._id, softDelete: false }).distinct("_id");
  } else if (req.user.role === "student") {
    const registrations = await Registration.find({ studentId: req.user._id, status: "approved" }).select("courseId");
    visibleCourseIds = await Course.find({
      _id: { $in: registrations.map((registration) => registration.courseId) },
      softDelete: false,
    }).distinct("_id");
  }
  filter.courseId = { $in: visibleCourseIds };

  if (courseId) {
    const isVisible = filter.courseId.$in.some((id) => id.toString() === courseId.toString());
    if (!isVisible) {
      return res.status(404).json({ success: false, message: "No course posts found" });
    }
    filter.courseId = courseId;
  }

  if (type) {
    filter.type = type;
  }

  if (pinned !== undefined) {
    filter.pinned = pinned === "true" || pinned === true;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  const total = await CoursePost.countDocuments(filter);
  const posts = await CoursePost.find(filter)
    .populate("courseId", "name category level")
    .populate("authorId", "userName email role")
    .sort(sort)
    .skip(skip)
    .limit(numericLimit)
    .lean();

  return res.status(200).json({
    success: true,
    total,
    totalPages: Math.ceil(total / numericLimit),
    currentPage: numericPage,
    data: posts,
  });
});

// ─── GET COURSE POST BY ID ───────────────────────────────────────────────────
/**
 * GET /course/post/:id or GET /course-posts/:id
 */
export const getCoursePostById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await CoursePost.findOne({ _id: id, softDelete: false })
    .populate("courseId", "name category level teacherId softDelete")
    .populate("authorId", "userName email role");

  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }
  if (!post.courseId || post.courseId.softDelete || !(await canReadCourseContent(req.user, post.courseId))) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  return res.status(200).json({
    success: true,
    data: post,
  });
});

// ─── GET POSTS BY COURSE ID ──────────────────────────────────────────────────
/**
 * GET /course/post/course/:courseId or GET /course-posts/course/:courseId
 */
export const getPostsByCourseId = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (!(await canReadCourseContent(req.user, course))) {
    return res.status(404).json({ success: false, message: "Course posts not found" });
  }

  const posts = await CoursePost.find({ courseId, softDelete: false })
    .populate("courseId", "name category level")
    .populate("authorId", "userName email role")
    .sort("-pinned -createdAt")
    .lean();

  return res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});

// ─── UPDATE COURSE POST ──────────────────────────────────────────────────────
/**
 * PUT /course/post/update/:id or PUT /course-posts/update/:id
 * Protected (admin, teacher)
 */
export const updateCoursePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = postEditData(req.body);

  const post = await CoursePost.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (!canManageCourse(req.user, post.courseId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to update this post",
    });
  }

  const updatedPost = await CoursePost.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("courseId", "name category level")
    .populate("authorId", "userName email role");

  return res.status(200).json({
    success: true,
    message: "Course post updated successfully",
    data: updatedPost,
  });
});

// ─── TOGGLE PIN POST ─────────────────────────────────────────────────────────
/**
 * PATCH /course/post/pin/:id or PATCH /course-posts/pin/:id
 * Protected (admin, teacher)
 */
export const togglePinPost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await CoursePost.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (!canManageCourse(req.user, post.courseId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied: Only the course teacher or admin can pin posts",
    });
  }

  post.pinned = !post.pinned;
  await post.save();

  return res.status(200).json({
    success: true,
    message: `Post ${post.pinned ? "pinned" : "unpinned"} successfully`,
    data: post,
  });
});

// ─── DELETE COURSE POST ──────────────────────────────────────────────────────
/**
 * DELETE /course/post/delete/:id or DELETE /course-posts/delete/:id
 * Protected (admin, teacher)
 */
export const deleteCoursePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await CoursePost.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (!canManageCourse(req.user, post.courseId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You do not have permission to delete this post",
    });
  }

  post.softDelete = true;
  await post.save();

  return res.status(200).json({
    success: true,
    message: "Course post deleted successfully",
  });
});
