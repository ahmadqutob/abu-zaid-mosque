import Registration from "../../../database/Models/enrollment.model.js";

export const isCourseManager = (user) =>
  user?.role === "admin" || user?.role === "superAdmin";

export const isAssignedTeacher = (user, course) => {
  const teacherId = course?.teacherId?._id ?? course?.teacherId;
  return user?.role === "teacher" && teacherId?.toString() === user._id.toString();
};

export const canManageCourse = (user, course) =>
  isCourseManager(user) || isAssignedTeacher(user, course);

export const isCourseStarted = (course, now = new Date()) =>
  course?.enrollmentStatus === "ongoing" ||
  (course?.startDate && new Date(course.startDate) <= now);

// Before the start, an active course is public only while enrollment is open.
export const isPublicCourse = (course, now = new Date()) =>
  Boolean(
    course &&
      course.softDelete !== true &&
      course.status === "active" &&
      course.enrollmentStatus === "open" &&
      !isCourseStarted(course, now)
  );

export const hasApprovedEnrollment = async (studentId, courseId) => {
  if (!studentId || !courseId) return false;
  return Boolean(
    await Registration.exists({
      studentId,
      courseId,
      status: "approved",
    })
  );
};

// Public pre-start courses can be viewed by anyone. Once a course starts,
// only approved students and staff assigned to that course can view it.
export const canViewCourse = async (user, course, now = new Date()) => {
  if (isCourseManager(user) || isAssignedTeacher(user, course)) return true;
  if (isPublicCourse(course, now)) return true;
  if (user?.role !== "student") return false;
  return hasApprovedEnrollment(user._id, course._id);
};

// Posts and other course workspace content are private even while the course
// listing is public. Students need an approved registration to read them.
export const canReadCourseContent = async (user, course) => {
  if (!course || course.softDelete === true) return false;
  if (isCourseManager(user) || isAssignedTeacher(user, course)) return true;
  if (user?.role !== "student") return false;
  return hasApprovedEnrollment(user._id, course._id);
};

export const publicCourseFilter = (now = new Date()) => ({
  status: "active",
  enrollmentStatus: "open",
  startDate: { $gt: now },
  softDelete: false,
});
