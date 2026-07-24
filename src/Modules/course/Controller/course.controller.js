import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import Course from "../../../../database/Models/course.model.js";
import User from "../../../../database/Models/user.model.js";


// ─── CREATE ───────────────────────────────────────────────────────────────────

export const createCourse = asyncHandler(async (req, res, next) => {
  const courseData = { ...req.body };

  // Verify the teacher exists in the DB and has an allowed role
  const teacher = await User.findById(courseData.teacherId).select("role deletedAt");
  if (!teacher || teacher.deletedAt) {
    return res.status(400).json({ success: false, message: "Teacher not found. Provide a valid teacher ID." });
  }


  if (req.user.role === "teacher") {
    courseData.teacherId = req.user._id;
  }

  // Free courses: force price to null
  if (courseData.isFree) {
    courseData.price = null;
  }

  if(courseData.currentStudentsCount === courseData.maxStudents){
    courseData.enrollmentStatus = "closed";
  }

  if(courseData.isFree == true){
    courseData.price = null;
  }

 
   
  const course = await Course.create(courseData);
  return res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
});

// ─── GET ALL ──────────────────────────────────────────────────────────────────

/**
 * GET /course/all
 * Public. Supports filtering, full-text search, and pagination.
 * Query params: page, limit, category, level, gender, sessionType,
 *   enrollmentStatus, status, isFree, certificate,
 *   minAgeMax, maxAgeMin, search, sort
 */
export const getAllCourses = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    category,
    level,
    gender,
    sessionType,
    enrollmentStatus,
    status,
    isFree,
    certificate,
    minAgeMax,   // courses where minAge <= this value
    maxAgeMin,   // courses where maxAge >= this value
    search,
    sort = "-createdAt",
  } = req.query;

  const numericPage  = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip         = (numericPage - 1) * numericLimit;

  // ── Build filter ──────────────────────────────────────────────
  const filter = { softDelete: false };

  if (category)        filter.category        = category;
  if (level)           filter.level           = level;
  if (gender)          filter.gender          = gender;
  if (sessionType)     filter.sessionType     = sessionType;
  if (enrollmentStatus) filter.enrollmentStatus = enrollmentStatus;
  if (status)          filter.status          = status;

  if (isFree !== undefined) filter.isFree       = isFree === "true" || isFree === true;
  if (certificate !== undefined) filter.certificate = certificate === "true" || certificate === true;

  // Age-range overlap: course minAge <= requested max AND course maxAge >= requested min
  if (minAgeMax !== undefined) filter.minAge = { $lte: Number(minAgeMax) };
  if (maxAgeMin !== undefined) filter.maxAge = { ...(filter.maxAge || {}), $gte: Number(maxAgeMin) };

  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category:    { $regex: search, $options: "i" } },
    ];
  }

  // ── Execute ───────────────────────────────────────────────────
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate("teacherId", "userName email role")
      .sort(sort)
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    pagination: {
      page:  numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit),
    },
    data: courses,
  });
});

// ─── GET BY ID ────────────────────────────────────────────────────────────────

/**
 * GET /course/:id
 * Public. Returns a single course by MongoDB ObjectId.
 */
export const getCourseById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const course = await Course.findOne({ _id: id, softDelete: false })
    .populate("teacherId", "userName email role");

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  return res.status(200).json({ success: true, data: course });
});

// ─── GET BY SLUG ──────────────────────────────────────────────────────────────

/**
 * GET /course/slug/:slug
 * Public. Returns a single course by its human-readable slug.
 */
export const getCourseBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const course = await Course.findOne({ slug, softDelete: false })
    .populate("teacherId", "userName email role");

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  return res.status(200).json({ success: true, data: course });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  const existingCourse = await Course.findOne({ _id: id, softDelete: false });

  if (!existingCourse) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // ── Teacher ID verification ───────────────────────────────────
  if (updateData.teacherId) {
    const teacher = await User.findById(updateData.teacherId).select("role deletedAt");
    if (!teacher || teacher.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Teacher not found. Provide a valid teacher ID.",
      });
    }
  }


  // ── Price logic ───────────────────────────────────────────────
  const effectivelyFree =
    updateData.isFree !== undefined ? updateData.isFree : existingCourse.isFree;

  if (effectivelyFree) {
    updateData.price = null;
  }
   if(updateData.isFree == false ){
    updateData.price = updateData.price
   }

  // ── Waitlist guard ────────────────────────────────────────────
  // Prevent reducing maxStudents below current enrolled count
  if (
    updateData.maxStudents !== undefined &&
    updateData.maxStudents < existingCourse.currentStudentsCount
  ) {
    return res.status(400).json({
      success: false,
      message: `Cannot set maxStudents (${updateData.maxStudents}) below current enrollment count (${existingCourse.currentStudentsCount})`,
    });
  }

  // ── Enrollment status business rules ───────────────────────────
  const effectiveMaxStudents = updateData.maxStudents !== undefined ? updateData.maxStudents : existingCourse.maxStudents;
  const effectiveStatus = updateData.status !== undefined ? updateData.status : existingCourse.status;
  
  // Rule 1: If full, prevent manually opening enrollment
  if (updateData.enrollmentStatus && ["open", "ongoing"].includes(updateData.enrollmentStatus)) {
    if (existingCourse.currentStudentsCount >= effectiveMaxStudents) {
      return res.status(400).json({
        success: false,
        message: "Cannot open enrollment because maximum student capacity has been reached.",
      });
    }
  }

  // Rule 2: Auto-close enrollment if capacity is full
  if (existingCourse.currentStudentsCount >= effectiveMaxStudents) {
    updateData.enrollmentStatus = "closed";
  }

  // Rule 3: Cancelled or archived courses must have closed enrollment
  if (["cancelled", "archived"].includes(effectiveStatus)) {
    updateData.enrollmentStatus = "closed";
  }

  const updatedCourse = await Course.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("teacherId", "userName email role");

  return res.status(200).json({
    success: true,
    message: "Course updated successfully",
    data: updatedCourse,
  });
});

// ─── DELETE (soft) ────────────────────────────────────────────────────────────

/**
 * DELETE /course/delete/:id
 * Roles: admin, teacher
 * Performs a soft delete by setting softDelete = true.
 */
export const deleteCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const course = await Course.findOne({ _id: id, softDelete: false });

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  await Course.findByIdAndUpdate(id, { softDelete: true });

  return res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
});

// ─── CHANGE STATUS ────────────────────────────────────────────────────────────

/**
 * PATCH /course/:id/status
 * Roles: admin, teacher
 * Quickly toggles course status (draft → active → archived → cancelled).
 */
export const changeCourseStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const course = await Course.findOne({ _id: id, softDelete: false });

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  course.status = status;
  
  // Auto-close enrollment if course is cancelled or archived
  if (["cancelled", "archived"].includes(status)) {
    course.enrollmentStatus = "closed";
  }
  
  await course.save();

  return res.status(200).json({
    success: true,
    message: `Course status updated to "${status}"`,
    data: { _id: course._id, status: course.status },
  });
});

// ─── CHANGE ENROLLMENT STATUS ─────────────────────────────────────────────────

/**
 * PATCH /course/:id/enrollment-status
 * Roles: admin, teacher
 * Updates enrollmentStatus independently (upcoming → open → ongoing → closed).
 * Automatically closes enrollment if currentStudentsCount >= maxStudents.
 */
export const changeEnrollmentStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { enrollmentStatus } = req.body;

  const course = await Course.findOne({ _id: id, softDelete: false });

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // Business rules for enrollment status
  if (["open", "ongoing"].includes(enrollmentStatus)) {
    if (course.currentStudentsCount >= course.maxStudents) {
      return res.status(400).json({
        success: false,
        message: "Cannot open enrollment because maximum student capacity has been reached.",
      });
    }
    if (["cancelled", "archived"].includes(course.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot open enrollment for a ${course.status} course.`,
      });
    }
  }

  course.enrollmentStatus = enrollmentStatus;
  await course.save();

  return res.status(200).json({
    success: true,
    message: `Enrollment status updated to "${enrollmentStatus}"`,
    data: {
      _id:               course._id,
      enrollmentStatus:  course.enrollmentStatus,
      maxStudents:       course.maxStudents,
      currentStudentsCount: course.currentStudentsCount,
      isWaitlistActive:  course.currentStudentsCount >= course.maxStudents,
    },
  });
});
