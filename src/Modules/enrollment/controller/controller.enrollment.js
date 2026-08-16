// enrollment.controller.js
import Registration from "../../../../database/Models/enrollment.model.js";
import Course from "../../../../database/Models/course.model.js";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";

// ── Student applies to a course ────────────────────────────────
export const applyToCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (course.enrollmentStatus === "closed") {
    return res.status(400).json({
      success: false,
      message: "Enrollment is closed for this course",
    });
  }

  if (course.currentStudentsCount >= course.maxStudents) {
    return res.status(400).json({
      success: false,
      message: "This course is already full",
    });
  }

  try {
    const registration = await Registration.create({ studentId, courseId });
    return res.status(201).json({
      success: true,
      message: "Application submitted. Awaiting teacher review.",
      data: registration,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already have an active application for this course",
      });
    }
    throw err;
  }
});

// ── Student views own applications ─────────────────────────────
export const getMyRegistrations = asyncHandler(async (req, res, next) => {
  const registrations = await Registration.find({ studentId: req.user._id })
    .populate("courseId", "name level category startDate endDate enrollmentStatus description")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: registrations });
});


// ── Student cancels a still-pending application ─────────────────
export const cancelRegistration = asyncHandler(async (req, res, next) => {
  const { registrationId } = req.params;

  const registration = await Registration.findOne({
    _id: registrationId,
    studentId: req.user._id,
  });

  if (!registration) {
    return res.status(404).json({ success: false, message: "Registration not found" });
  }

  if (registration.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a registration that is already ${registration.status}`,
    });
  }

  registration.status = "cancelled";
  await registration.save();

  return res.status(200).json({ success: true, message: "Application cancelled", data: registration });
});

// ── Teacher/Admin views applicants for a course ──────────────────
export const getCourseRegistrations = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role === "teacher" &&
    course.teacherId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: "Not authorized for this course" });
  }

  const registrations = await Registration.find({ courseId })
    .populate("studentId", "userName email level")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: registrations });
});

// ── Teacher/Admin approves or rejects an applicant ──────────────
export const evaluateRegistration = asyncHandler(async (req, res, next) => {
  const { registrationId } = req.params;
  const { decision, note } = req.body; // "approved" | "rejected"

  const registration = await Registration.findById(registrationId);
  if (!registration) {
    return res.status(404).json({ success: false, message: "Registration not found" });
  }

  if (registration.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `This registration was already ${registration.status}`,
    });
  }

  const course = await Course.findById(registration.courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // 🔒 Ownership check
  if (
    req.user.role === "teacher" &&
    course.teacherId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: "Not authorized for this course" });
  }

  if (decision === "rejected") {
    registration.status = "rejected";
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    registration.note = note;
    await registration.save();

    return res.status(200).json({
      success: true,
      message: "Application rejected",
      data: registration,
    });
  }

  // decision === "approved" — atomic capacity check + increment
  const updatedCourse = await Course.findOneAndUpdate(
    { _id: course._id, $expr: { $lt: ["$currentStudentsCount", "$maxStudents"] } },
    { $inc: { currentStudentsCount: 1 } },
    { new: true }
  );

  if (!updatedCourse) {
    return res.status(400).json({
      success: false,
      message: "Course is full — cannot approve this application",
    });
  }

  registration.status = "approved";
  registration.reviewedBy = req.user._id;
  registration.reviewedAt = new Date();
  registration.note = note;
  await registration.save();

  // Auto-close enrollment if now full
  if (updatedCourse.currentStudentsCount >= updatedCourse.maxStudents) {
    updatedCourse.enrollmentStatus = "closed";
    await updatedCourse.save();
  }

  return res.status(200).json({
    success: true,
    message: "Student approved and enrolled",
    data: registration,
  });
});