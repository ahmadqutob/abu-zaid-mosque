import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import SuccessStory from "../../../../database/Models/successStory.model.js";
import fs from "fs";

// ─── CREATE SUCCESS STORY ───────────────────────────────────────────────────
/**
 * POST /success-story/create
 * Protected (admin, teacher)
 */
export const createSuccessStory = asyncHandler(async (req, res, next) => {
  const {
    studentName,
    studentMark,
    description,
    courseName,
    teacherName,
    rating,
    featured,
    isApproved,
    studentId,
    courseId,
    teacherId,
  } = req.body;

  const imageFile = req.files?.image?.[0] || req.file;
  let imageData = { url: null, public_id: null };

  try {
    if (imageFile) {
      const imageResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: "abuzaid-mosque/success-stories",
        transformation: [{ width: 800, height: 600, crop: "fill", quality: "auto" }],
      });

      imageData = {
        url: imageResult.secure_url,
        public_id: imageResult.public_id,
      };

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
    }

    const storyData = {
      studentName,
      studentMark: String(studentMark),
      description,
      courseName,
      teacherName,
      image: imageData,
      rating: rating ? Number(rating) : 5,
      featured: featured === "true" || featured === true,
      isApproved: isApproved === undefined ? true : isApproved === "true" || isApproved === true,
      studentId: studentId || null,
      courseId: courseId || null,
      teacherId: teacherId || null,
      createdBy: req.user?._id,
    };

    const story = await SuccessStory.create(storyData);

    return res.status(201).json({
      success: true,
      message: "Success story created successfully",
      data: story,
    });
  } catch (error) {
    if (imageFile && fs.existsSync(imageFile.path)) {
      fs.unlinkSync(imageFile.path);
    }
    throw error;
  }
});

// ─── GET ALL SUCCESS STORIES ─────────────────────────────────────────────────
/**
 * GET /success-story/all
 * Public / Protected
 * Filters: page, limit, featured, courseName, teacherName, search, sort
 */
export const getAllSuccessStories = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    featured,
    courseName,
    teacherName,
    search,
    sort = "-featured -createdAt",
  } = req.query;

  const numericPage = Math.max(1, parseInt(page));
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { softDelete: false, isApproved: true };

  if (featured !== undefined) {
    filter.featured = featured === "true" || featured === true;
  }

  if (courseName) {
    filter.courseName = { $regex: courseName, $options: "i" };
  }

  if (teacherName) {
    filter.teacherName = { $regex: teacherName, $options: "i" };
  }

  if (search) {
    filter.$or = [
      { studentName: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { courseName: { $regex: search, $options: "i" } },
      { teacherName: { $regex: search, $options: "i" } },
    ];
  }

  const total = await SuccessStory.countDocuments(filter);
  const stories = await SuccessStory.find(filter)
    .populate("studentId", "userName email")
    .populate("courseId", "name category level")
    .populate("teacherId", "userName email")
    .populate("createdBy", "userName email role")
    .sort(sort)
    .skip(skip)
    .limit(numericLimit)
    .lean();

  return res.status(200).json({
    success: true,
    total,
    totalPages: Math.ceil(total / numericLimit),
    currentPage: numericPage,
    data: stories,
  });
});

// ─── GET FEATURED SUCCESS STORIES ───────────────────────────────────────────
/**
 * GET /success-story/featured
 * Public - for landing page showcase
 */
export const getFeaturedSuccessStories = asyncHandler(async (req, res, next) => {
  const stories = await SuccessStory.find({
    featured: true,
    isApproved: true,
    softDelete: false,
  })
    .sort("-createdAt")
    .limit(10)
    .lean();

  return res.status(200).json({
    success: true,
    count: stories.length,
    data: stories,
  });
});

// ─── GET SUCCESS STORY BY ID ─────────────────────────────────────────────────
/**
 * GET /success-story/:id
 */
export const getSuccessStoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const story = await SuccessStory.findOne({ _id: id, softDelete: false })
    .populate("studentId", "userName email")
    .populate("courseId", "name category level")
    .populate("teacherId", "userName email")
    .populate("createdBy", "userName email role");

  if (!story) {
    return res.status(404).json({ success: false, message: "Success story not found" });
  }

  return res.status(200).json({
    success: true,
    data: story,
  });
});

// ─── UPDATE SUCCESS STORY ────────────────────────────────────────────────────
/**
 * PUT /success-story/update/:id
 * Protected (admin, teacher)
 */
export const updateSuccessStory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const imageFile = req.files?.image?.[0] || req.file;
  const updateData = { ...req.body };

  const existingStory = await SuccessStory.findOne({ _id: id, softDelete: false });
  if (!existingStory) {
    return res.status(404).json({ success: false, message: "Success story not found" });
  }

  try {
    if (imageFile) {
      // Delete old image from Cloudinary if exists
      if (existingStory.image?.public_id) {
        await cloudinary.uploader.destroy(existingStory.image.public_id).catch(() => {});
      }

      // Upload new image
      const imageResult = await cloudinary.uploader.upload(imageFile.path, {
        folder: "abuzaid-mosque/success-stories",
        transformation: [{ width: 800, height: 600, crop: "fill", quality: "auto" }],
      });

      updateData.image = {
        url: imageResult.secure_url,
        public_id: imageResult.public_id,
      };

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path);
      }
    }

    if (updateData.studentMark !== undefined) {
      updateData.studentMark = String(updateData.studentMark);
    }

    if (updateData.rating !== undefined) {
      updateData.rating = Number(updateData.rating);
    }

    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === "true" || updateData.featured === true;
    }

    const updatedStory = await SuccessStory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("studentId", "userName email")
      .populate("courseId", "name category level")
      .populate("teacherId", "userName email")
      .populate("createdBy", "userName email role");

    return res.status(200).json({
      success: true,
      message: "Success story updated successfully",
      data: updatedStory,
    });
  } catch (error) {
    if (imageFile && fs.existsSync(imageFile.path)) {
      fs.unlinkSync(imageFile.path);
    }
    throw error;
  }
});

// ─── TOGGLE FEATURED STORY ───────────────────────────────────────────────────
/**
 * PATCH /success-story/featured/:id
 * Protected (admin, teacher)
 */
export const toggleFeaturedStory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const story = await SuccessStory.findOne({ _id: id, softDelete: false });
  if (!story) {
    return res.status(404).json({ success: false, message: "Success story not found" });
  }

  story.featured = !story.featured;
  await story.save();

  return res.status(200).json({
    success: true,
    message: `Story ${story.featured ? "marked as featured" : "unfeatured"} successfully`,
    data: story,
  });
});

// ─── DELETE SUCCESS STORY ────────────────────────────────────────────────────
/**
 * DELETE /success-story/delete/:id
 * Protected (admin, teacher)
 */
export const deleteSuccessStory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const story = await SuccessStory.findOne({ _id: id, softDelete: false });
  if (!story) {
    return res.status(404).json({ success: false, message: "Success story not found" });
  }

  story.softDelete = true;
  await story.save();

  return res.status(200).json({
    success: true,
    message: "Success story deleted successfully",
  });
});
