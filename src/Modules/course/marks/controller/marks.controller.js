import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import Mark from "../../../../database/Models/marks.model.js";
import Course from "../../../../database/Models/course.model.js";
import User from "../../../../database/Models/user.model.js";
import { sendEmail } from "../../../Services/SendEmail.services.js";

// ─── CREATE MARK ─────────────────────────────────────────────────────────────
/**
 * POST /course/marks/create or POST /marks/create
 * Protected (admin, teacher)
 */
export const createMark = asyncHandler(async (req, res, next) => {
  const { courseId, studentId, title, type, score, maxScore, feedback } = req.body;

  // 1. Verify course exists and is not soft deleted
  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // 2. Authorization: Teacher can only add marks for their own course
  if (
    req.user.role === "teacher" &&
    course.teacherId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only record marks for your assigned course",
    });
  }

  // 3. Verify student exists
  const student = await User.findOne({ _id: studentId, deletedAt: null });
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  // 4. Validate score logic
  if (Number(score) > Number(maxScore)) {
    return res.status(400).json({
      success: false,
      message: "Score cannot exceed maxScore",
    });
  }

  // 5. Create Mark record
  const mark = await Mark.create({
    courseId,
    studentId,
    title,
    type: type || "quiz",
    score,
    maxScore,
    feedback: feedback || "",
    gradedBy: req.user._id,
  });

  const populatedMark = await Mark.findById(mark._id)
    .populate("courseId", "name category level")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role");

  // 6. Notify student via email
  if (student.email) {
    const subject = `New Mark Added - ${course.name}`;
    const message = `<p>Hello <strong>${student.userName || "Student"}</strong>,</p><p>You have a new mark added for the course <strong>${course.name}</strong>. Please check it from your course marks.</p>`;

    sendEmail(student.email, subject, message).catch((err) => {
      console.error("Error sending mark notification email:", err);
    });
  }

  return res.status(201).json({
    success: true,
    message: "Mark recorded successfully",
    data: populatedMark,
  });
});

// ─── GET ALL MARKS ────────────────────────────────────────────────────────────
/**
 * GET /course/marks/all or GET /marks/all
 * Protected (admin, teacher, student, user)
 * Supports query parameters: page, limit, courseId, studentId, type, search, sort
 */
export const getAllMarks = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    courseId,
    studentId,
    type,
    search,
    sort = "-createdAt",
  } = req.query;

  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { softDelete: false };

  // Role Scoping
  if (req.user.role === "student" || req.user.role === "user") {
    // Students can only view their own marks
    filter.studentId = req.user._id;
  } else if (req.user.role === "teacher") {
    // Teachers can only view marks for courses they teach
    const teacherCourses = await Course.find({ teacherId: req.user._id, softDelete: false }).select("_id");
    const teacherCourseIds = teacherCourses.map((c) => c._id);
    filter.courseId = { $in: teacherCourseIds };
  }

  // Additional Filters
  if (courseId) {
    if (filter.courseId && filter.courseId.$in) {
      // Ensure requested courseId belongs to teacher
      const isTeacherCourse = filter.courseId.$in.some(
        (id) => id.toString() === courseId.toString()
      );
      if (!isTeacherCourse) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You do not teach this course",
        });
      }
    }
    filter.courseId = courseId;
  }

  if (studentId && req.user.role !== "student" && req.user.role !== "user") {
    filter.studentId = studentId;
  }

  if (type) {
    filter.type = type;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { feedback: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Mark.countDocuments(filter);
  const marks = await Mark.find(filter)
    .populate("courseId", "name category level")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role")
    .sort(sort)
    .skip(skip)
    .limit(numericLimit)
    .lean();

  return res.status(200).json({
    success: true,
    total,
    totalPages: Math.ceil(total / numericLimit),
    currentPage: numericPage,
    data: marks,
  });
});

// ─── GET MARK BY ID ──────────────────────────────────────────────────────────
/**
 * GET /course/marks/:id or GET /marks/:id
 */
export const getMarkById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const mark = await Mark.findOne({ _id: id, softDelete: false })
    .populate("courseId", "name category level teacherId")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role");

  if (!mark) {
    return res.status(404).json({ success: false, message: "Mark not found" });
  }

  // Permission Check
  if (req.user.role === "student" || req.user.role === "user") {
    if (mark.studentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
  } else if (req.user.role === "teacher") {
    if (mark.courseId.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
  }

  return res.status(200).json({
    success: true,
    data: mark,
  });
});

// ─── GET MARKS BY COURSE ─────────────────────────────────────────────────────
/**
 * GET /course/marks/course/:courseId or GET /marks/course/:courseId
 */
export const getMarksByCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  const filter = { courseId, softDelete: false };

  if (req.user.role === "student" || req.user.role === "user") {
    filter.studentId = req.user._id;
  } else if (req.user.role === "teacher") {
    if (course.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not the assigned teacher for this course",
      });
    }
  }

  const marks = await Mark.find(filter)
    .populate("courseId", "name category level")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role")
    .sort("-createdAt")
    .lean();

  return res.status(200).json({
    success: true,
    count: marks.length,
    data: marks,
  });
});

// ─── GET MARKS BY STUDENT ────────────────────────────────────────────────────
/**
 * GET /course/marks/student/:studentId or GET /marks/student/:studentId
 */
export const getMarksByStudent = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  if (
    (req.user.role === "student" || req.user.role === "user") &&
    req.user._id.toString() !== studentId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only view your own marks",
    });
  }

  const filter = { studentId, softDelete: false };

  if (req.user.role === "teacher") {
    const teacherCourses = await Course.find({ teacherId: req.user._id, softDelete: false }).select("_id");
    const teacherCourseIds = teacherCourses.map((c) => c._id);
    filter.courseId = { $in: teacherCourseIds };
  }

  const marks = await Mark.find(filter)
    .populate("courseId", "name category level")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role")
    .sort("-createdAt")
    .lean();

  return res.status(200).json({
    success: true,
    count: marks.length,
    data: marks,
  });
});

// ─── UPDATE MARK ─────────────────────────────────────────────────────────────
/**
 * PUT /course/marks/update/:id or PUT /marks/update/:id
 * Protected (admin, teacher)
 */
export const updateMark = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  const existingMark = await Mark.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!existingMark) {
    return res.status(404).json({ success: false, message: "Mark not found" });
  }

  // Teacher check
  if (
    req.user.role === "teacher" &&
    existingMark.courseId.teacherId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only update marks for your course",
    });
  }

  // Check score vs maxScore
  const finalScore = updateData.score !== undefined ? updateData.score : existingMark.score;
  const finalMaxScore = updateData.maxScore !== undefined ? updateData.maxScore : existingMark.maxScore;

  if (Number(finalScore) > Number(finalMaxScore)) {
    return res.status(400).json({
      success: false,
      message: "Score cannot exceed maxScore",
    });
  }

  updateData.gradedBy = req.user._id;

  const updatedMark = await Mark.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("courseId", "name category level")
    .populate("studentId", "userName email")
    .populate("gradedBy", "userName email role");

  return res.status(200).json({
    success: true,
    message: "Mark updated successfully",
    data: updatedMark,
  });
});

// ─── DELETE MARK ─────────────────────────────────────────────────────────────
/**
 * DELETE /course/marks/delete/:id or DELETE /marks/delete/:id
 * Protected (admin, teacher)
 */
export const deleteMark = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const mark = await Mark.findOne({ _id: id, softDelete: false }).populate("courseId");
  if (!mark) {
    return res.status(404).json({ success: false, message: "Mark not found" });
  }

  if (
    req.user.role === "teacher" &&
    mark.courseId.teacherId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only delete marks for your course",
    });
  }

  mark.softDelete = true;
  await mark.save();

  return res.status(200).json({
    success: true,
    message: "Mark deleted successfully",
  });
});
