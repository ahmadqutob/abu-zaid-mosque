import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import Teacher from "../../../../database/Models/teacher.model.js";
import User from "../../../../database/Models/user.model.js";
import Course from "../../../../database/Models/course.model.js";
import fs from "fs";

// ─── CREATE TEACHER PROFILE ──────────────────────────────────────────────────
/**
 * POST /our-teacher/create
 * Protected (admin, superAdmin)
 */
export const createTeacherProfile = asyncHandler(async (req, res, next) => {
  const { userId, specialization, qualification, bio, experienceYears } = req.body;

  // 1. Verify user exists
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    return res.status(404).json({ success: false, message: "User account not found" });
  }

  // 2. Check if teacher profile already exists for this user
  const existingTeacher = await Teacher.findOne({ userId, deletedAt: null });
  if (existingTeacher) {
    return res.status(400).json({
      success: false,
      message: "Teacher profile already exists for this user",
    });
  }

  // 3. Handle image upload if provided
  const imageFile = req.files?.image?.[0] || req.file;
  let imageData = { url: null, public_id: null };

  try {
    if (imageFile) {
      const imageResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: "abuzaid-mosque/teachers",
        transformation: [{ width: 800, height: 800, crop: "fill", quality: "auto" }],
      });

      imageData = {
        url: imageResult.secure_url,
        public_id: imageResult.public_id,
      };

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
    }

    // 4. Update user role to 'teacher' if currently user or student
    if (user.role !== "teacher" && user.role !== "admin" && user.role !== "superAdmin") {
      user.role = "teacher";
      await user.save();
    }

    // 5. Create teacher profile
    const teacher = await Teacher.create({
      userId,
      specialization: specialization || "",
      qualification: qualification || "",
      bio: bio || "",
      experienceYears: experienceYears ? Number(experienceYears) : 0,
      image: imageData,
      createdBy: req.user?._id,
    });

    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate("userId", "userName email phone gender role")
      .populate("createdBy", "userName email role");

    return res.status(201).json({
      success: true,
      message: "Teacher profile created successfully",
      data: populatedTeacher,
    });
  } catch (error) {
    if (imageFile && fs.existsSync(imageFile.path)) {
      fs.unlinkSync(imageFile.path);
    }
    throw error;
  }
});

// ─── GET ALL TEACHERS ────────────────────────────────────────────────────────
/**
 * GET /our-teacher/all
 * Public / Protected
 * Filters: page, limit, specialization, search, sort
 */
export const getAllTeachers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    specialization,
    search,
    sort = "-createdAt",
  } = req.query;

  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { deletedAt: null };

  if (specialization) {
    filter.specialization = { $regex: specialization, $options: "i" };
  }

  // If search query is provided, find matching User IDs first
  if (search) {
    const matchingUsers = await User.find({
      deletedAt: null,
      $or: [
        { userName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    const matchingUserIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { userId: { $in: matchingUserIds } },
      { specialization: { $regex: search, $options: "i" } },
      { qualification: { $regex: search, $options: "i" } },
      { bio: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Teacher.countDocuments(filter);
  const teachers = await Teacher.find(filter)
    .populate("userId", "userName email phone gender role")
    .populate("createdBy", "userName email role")
    .sort(sort)
    .skip(skip)
    .limit(numericLimit)
    .lean();

  // Attach active courses taught by each teacher
  const teacherUserIds = teachers.map((t) => t.userId?._id).filter(Boolean);
  const courses = await Course.find({
    teacherId: { $in: teacherUserIds },
    softDelete: false,
  }).select("name category level teacherId");

  const teachersWithCourses = teachers.map((teacher) => {
    const teacherCourses = courses.filter(
      (c) => c.teacherId.toString() === teacher.userId?._id?.toString()
    );
    return {
      ...teacher,
      courses: teacherCourses,
    };
  });

  return res.status(200).json({
    success: true,
    total,
    totalPages: Math.ceil(total / numericLimit),
    currentPage: numericPage,
    data: teachersWithCourses,
  });
});

// ─── GET LOGGED IN TEACHER PROFILE ──────────────────────────────────────────
/**
 * GET /our-teacher/me
 * Protected (teacher, admin)
 */
export const getMyTeacherProfile = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findOne({ userId: req.user._id, deletedAt: null })
    .populate("userId", "userName email phone gender role")
    .populate("createdBy", "userName email role")
    .lean();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher profile not found for the current user",
    });
  }

  const courses = await Course.find({ teacherId: req.user._id, softDelete: false }).select(
    "name category level enrollmentStatus maxStudents currentStudentsCount"
  );

  return res.status(200).json({
    success: true,
    data: {
      ...teacher,
      courses,
    },
  });
});

// ─── GET TEACHER BY ID ───────────────────────────────────────────────────────
/**
 * GET /our-teacher/:id
 * Accepts Teacher profile ID OR User ID
 */
export const getTeacherById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let teacher = await Teacher.findOne({
    $or: [{ _id: id }, { userId: id }],
    deletedAt: null,
  })
    .populate("userId", "userName email phone gender role")
    .populate("createdBy", "userName email role")
    .lean();

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found" });
  }

  const courses = await Course.find({
    teacherId: teacher.userId._id,
    softDelete: false,
  }).select("name category level enrollmentStatus maxStudents currentStudentsCount");

  return res.status(200).json({
    success: true,
    data: {
      ...teacher,
      courses,
    },
  });
});

// ─── UPDATE TEACHER PROFILE ──────────────────────────────────────────────────
/**
 * PUT /our-teacher/update/:id
 * Protected (admin, teacher)
 */
export const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const imageFile = req.files?.image?.[0] || req.file;
  const updateData = { ...req.body };

  const existingTeacher = await Teacher.findOne({
    $or: [{ _id: id }, { userId: id }],
    deletedAt: null,
  });

  if (!existingTeacher) {
    return res.status(404).json({ success: false, message: "Teacher profile not found" });
  }

  // Authorization check: Admin or the teacher owner
  const isOwner = existingTeacher.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only update your own teacher profile",
    });
  }

  try {
    if (imageFile) {
      if (existingTeacher.image?.public_id) {
        await cloudinary.uploader.destroy(existingTeacher.image.public_id).catch(() => {});
      }

      const imageResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: "abuzaid-mosque/teachers",
        transformation: [{ width: 800, height: 800, crop: "fill", quality: "auto" }],
      });

      updateData.image = {
        url: imageResult.secure_url,
        public_id: imageResult.public_id,
      };

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
    }

    if (updateData.experienceYears !== undefined) {
      updateData.experienceYears = Number(updateData.experienceYears);
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(existingTeacher._id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("userId", "userName email phone gender role")
      .populate("createdBy", "userName email role");

    return res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    if (imageFile && fs.existsSync(imageFile.path)) {
      fs.unlinkSync(imageFile.path);
    }
    throw error;
  }
});

// ─── DELETE TEACHER PROFILE ──────────────────────────────────────────────────
/**
 * DELETE /our-teacher/delete/:id
 * Protected (admin, superAdmin)
 */
export const deleteTeacher = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const teacher = await Teacher.findOne({
    $or: [{ _id: id }, { userId: id }],
    deletedAt: null,
  });

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher profile not found" });
  }

  teacher.deletedAt = new Date();
  await teacher.save();

  return res.status(200).json({
    success: true,
    message: "Teacher profile deleted successfully",
  });
});
