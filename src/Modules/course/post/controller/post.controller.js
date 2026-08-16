import { asyncHandler } from "../../../../Services/ErrorHandler.services.js";
import CoursePost from "../../../../../database/Models/coursePost.model.js";
import Course from "../../../../../database/Models/course.model.js";
import Registration from "../../../../../database/Models/enrollment.model.js";
import Student from "../../../../../database/Models/student.model.js";
import { sendEmail } from "../../../../Services/SendEmail.services.js";

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

  // 2. Teacher ownership check
  if (
    req.user.role === "teacher" &&
    course.teacherId.toString() !== req.user._id.toString()
  ) {
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

  // 4. Send email notification asynchronously to all enrolled students
  (async () => {
    try {
      const [registrations, students] = await Promise.all([
        Registration.find({ courseId, status: "approved" }).populate("studentId", "userName email"),
        Student.find({ coursesEnrolled: { $in: [courseId, courseId.toString()] } }).populate("userId", "userName email"),
      ]);

      const emailMap = new Map();

      registrations.forEach((reg) => {
        if (reg.studentId && reg.studentId.email) {
          emailMap.set(reg.studentId.email, reg.studentId.userName || "Student");
        }
      });

      students.forEach((st) => {
        if (st.userId && st.userId.email) {
          emailMap.set(st.userId.email, st.userId.userName || "Student");
        }
      });

      const subject = `New Post in ${course.name}`;

      for (const [email, userName] of emailMap.entries()) {
        const message = `<p>Hello <strong>${userName}</strong>,</p><p>A new post <strong>"${title}"</strong> has been published in your course <strong>${course.name}</strong>. Please check it from your course posts.</p>`;
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
 * Protected (admin, teacher, student, user)
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

  if (courseId) {
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
    .populate("courseId", "name category level teacherId")
    .populate("authorId", "userName email role");

  if (!post) {
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
  const updateData = { ...req.body };

  const post = await CoursePost.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  // Authorization Check: Admin, Author, or Assigned Course Teacher
  const isAuthor = post.authorId.toString() === req.user._id.toString();
  const isTeacher =
    req.user.role === "teacher" &&
    post.courseId?.teacherId?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

  if (!isAuthor && !isTeacher && !isAdmin) {
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

  const isTeacher =
    req.user.role === "teacher" &&
    post.courseId?.teacherId?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

  if (!isTeacher && !isAdmin) {
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

  const isAuthor = post.authorId.toString() === req.user._id.toString();
  const isTeacher =
    req.user.role === "teacher" &&
    post.courseId?.teacherId?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

  if (!isAuthor && !isTeacher && !isAdmin) {
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
