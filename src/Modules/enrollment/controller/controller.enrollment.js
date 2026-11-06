import mongoose from "mongoose";
import Registration from "../../../../database/Models/enrollment.model.js";
import Course from "../../../../database/Models/course.model.js";
import Student from "../../../../database/Models/student.model.js";
import User from "../../../../database/Models/user.model.js";
import { sendEmail } from "../../../Services/SendEmail.services.js";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import { isCourseStarted, isPublicCourse } from "../../course/course.access.js";

const STATUS_MESSAGES = {
  pending: "Your application is waiting for review.",
  approved: "Your application was approved and you are enrolled.",
  rejected: "Your application was not approved.",
  cancelled: "You cancelled this application.",
};

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const emailCourseUpdate = async ({ to, userName, courseName, status, note }) => {
  if (!to) return;

  const safeName = escapeHtml(userName || "there");
  const safeCourseName = escapeHtml(courseName);
  const safeNote = note ? `<p>Reviewer note: ${escapeHtml(note)}</p>` : "";
  try {
    await sendEmail(
      to,
      `Course application update: ${courseName}`,
      `<p>Hello ${safeName},</p><p>Your application for <strong>${safeCourseName}</strong> is now <strong>${status}</strong>.</p>${safeNote}`
    );
  } catch (error) {
    // A notification problem must not undo a saved application or review.
    console.error("Failed to send course application notification:", error);
  }
};

const registrationResponse = (registration) => ({
  ...registration.toObject(),
  statusMessage: STATUS_MESSAGES[registration.status],
});

// A student may apply only when enrollment is open, the course is active and
// capacity remains. Eligibility uses the gender and level data currently stored.
export const applyToCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const [course, applicant, studentProfile] = await Promise.all([
    Course.findOne({ _id: courseId, softDelete: false }),
    User.findOne({ _id: studentId, deletedAt: null }).select("userName email gender role"),
    Student.findOne({ userId: studentId }).select("level status"),
  ]);

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }
  if (!applicant || applicant.role !== "student") {
    return res.status(403).json({ success: false, message: "A valid student account is required" });
  }
  if (course.status !== "active") {
    return res.status(400).json({ success: false, message: "Applications are available only for active courses" });
  }
  if (course.enrollmentStatus !== "open") {
    return res.status(400).json({ success: false, message: "Applications are available only while enrollment is open" });
  }
  if (isCourseStarted(course)) {
    return res.status(400).json({ success: false, message: "Applications are closed because this course has started" });
  }
  if (course.gender !== "mixed" && course.gender !== applicant.gender) {
    return res.status(400).json({ success: false, message: "You do not meet this course's gender eligibility" });
  }
  if (studentProfile?.status === "suspended" || studentProfile?.status === "inactive") {
    return res.status(403).json({ success: false, message: "Your student account is not eligible to apply" });
  }
  if (studentProfile?.level && studentProfile.level !== course.level) {
    return res.status(400).json({
      success: false,
      message: `This course is for ${course.level} level students; your profile is ${studentProfile.level}`,
    });
  }

  // Age cannot be checked until a date of birth or age is collected for students.
  if (course.currentStudentsCount >= course.maxStudents) {
    return res.status(400).json({ success: false, message: "This course is full and is not accepting applications" });
  }

  // Return the existing active application on retries instead of creating a
  // confusing duplicate response. The unique index below handles concurrent requests.
  const existing = await Registration.findOne({
    studentId,
    courseId,
    status: { $in: ["pending", "approved"] },
  });
  if (existing) {
    return res.status(200).json({
      success: true,
      alreadyApplied: true,
      message: "You already have an active application for this course",
      data: registrationResponse(existing),
    });
  }

  let registration;
  try {
    registration = await Registration.create({ studentId, courseId });
  } catch (error) {
    // A simultaneous retry can win after the lookup above; return that same
    // registration so clients can safely retry network failures.
    if (error.code !== 11000) throw error;
    const racedRegistration = await Registration.findOne({
      studentId,
      courseId,
      status: { $in: ["pending", "approved"] },
    });
    if (!racedRegistration) throw error;
    return res.status(200).json({
      success: true,
      alreadyApplied: true,
      message: "You already have an active application for this course",
      data: registrationResponse(racedRegistration),
    });
  }

  // Email is best-effort; sendEmail reports failures without undoing an application.
  try {
    await emailCourseUpdate({
      to: applicant.email,
      userName: applicant.userName,
      courseName: course.name,
      status: "pending",
    });
    const teacher = await User.findById(course.teacherId).select("email userName");
    if (teacher?.email) {
      await sendEmail(
        teacher.email,
        `New course application: ${course.name}`,
        `<p>Hello ${escapeHtml(teacher.userName || "Teacher")},</p><p>${escapeHtml(applicant.userName)} applied to <strong>${escapeHtml(course.name)}</strong>. Please review the application in the course dashboard.</p>`
      );
    }
  } catch (error) {
    // Keep notifications best-effort even when the mail service is unavailable.
    console.error("Failed to notify course participants:", error);
  }

  return res.status(201).json({
    success: true,
    message: "Application submitted and awaiting review. You can follow its status at GET /enrollment/me.",
    data: registrationResponse(registration),
  });
});

// Students see the current decision, reviewer note, review time, and a readable status.
export const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ studentId: req.user._id })
    .populate("courseId", "name level category startDate endDate enrollmentStatus status description softDelete")
    .populate("reviewedBy", "userName")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: registrations.map((registration) => {
      const data = registrationResponse(registration);
      const visibleCourse = data.courseId && (
        registration.status === "approved" && data.courseId.softDelete !== true ||
        isPublicCourse(data.courseId)
      );

      // Keep application status visible while hiding a started/private course
      // from rejected, pending, or cancelled applicants.
      if (!visibleCourse) data.courseId = null;
      else delete data.courseId.softDelete;
      return data;
    }),
  });
});

// Students can withdraw only a pending application; approved enrollment must be
// handled by staff so course capacity remains accurate.


// Only the assigned teacher or an admin can view a course's applicants.
export const getCourseRegistrations = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findOne({ _id: courseId, softDelete: false });
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }
  if (req.user.role === "teacher" && course.teacherId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized for this course" });
  }

  const registrations = await Registration.find({ courseId })
    .populate("studentId", "userName email")
    .populate("reviewedBy", "userName")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: registrations.map(registrationResponse) });
});

// Review the application and update the application record and available seat
// in one transaction so neither can be committed without the other.
export const evaluateRegistration = asyncHandler(async (req, res) => {
  const { registrationId } = req.params;
  const { decision, note } = req.body;
  const session = await mongoose.startSession();
  let outcome;

  try {
    await session.withTransaction(async () => {
      const registration = await Registration.findById(registrationId).session(session);
      if (!registration) {
        outcome = { status: 404, message: "Registration not found" };
        return;
      }
      if (registration.status !== "pending") {
        outcome = { status: 400, message: `This registration is already ${registration.status}` };
        return;
      }

      const course = await Course.findOne({ _id: registration.courseId, softDelete: false }).session(session);
      if (!course) {
        outcome = { status: 404, message: "Course not found" };
        return;
      }
      if (req.user.role === "teacher" && course.teacherId.toString() !== req.user._id.toString()) {
        outcome = { status: 403, message: "Not authorized for this course" };
        return;
      }

      if (decision === "approved") {
        // Conditional increment prevents concurrent approvals from exceeding capacity.
        const updatedCourse = await Course.findOneAndUpdate(
          {
            _id: course._id,
            status: "active",
            enrollmentStatus: "open",
            softDelete: false,
            $expr: { $lt: ["$currentStudentsCount", "$maxStudents"] },
          },
          { $inc: { currentStudentsCount: 1 } },
          { new: true, session }
        );
        if (!updatedCourse) {
          outcome = {
            status: 400,
            message: "This course is no longer open or has reached capacity; the application remains pending",
          };
          return;
        }

        if (updatedCourse.currentStudentsCount >= updatedCourse.maxStudents) {
          updatedCourse.enrollmentStatus = "closed";
          await updatedCourse.save({ session });
        }
      }

      registration.status = decision;
      registration.reviewedBy = req.user._id;
      registration.reviewedAt = new Date();
      registration.note = note || null;
      await registration.save({ session });
      outcome = { status: 200, registration, course };
    });
  } finally {
    await session.endSession();
  }

  if (outcome?.message) {
    return res.status(outcome.status).json({ success: false, message: outcome.message });
  }

  try {
    const applicant = await User.findById(outcome.registration.studentId).select("userName email");
    await emailCourseUpdate({
      to: applicant?.email,
      userName: applicant?.userName,
      courseName: outcome.course.name,
      status: decision,
      note,
    });
  } catch (error) {
    console.error("Failed to notify student about course application review:", error);
  }

  return res.status(200).json({
    success: true,
    message: decision === "approved" ? "Student approved and enrolled" : "Application rejected",
    data: registrationResponse(outcome.registration),
  });
});
