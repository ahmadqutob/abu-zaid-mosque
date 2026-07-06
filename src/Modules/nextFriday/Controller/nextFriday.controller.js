import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import NextFriday from "../../../../database/Models/nextFriday.model.js";
import fs from 'fs';

// Create a new nextFriday entry
export const createNextFriday = asyncHandler(async (req, res, next) => {
    const { title, name, date } = req.body;
    const userId = req.user._id;
    
    // Support files from fields or single file upload
    const imageFile = req.files?.image?.[0] || req.file;

    if (!imageFile) {
        return res.status(400).json({
            success: false,
            message: "Image is required"
        });
    }

    try {
        // Upload image to Cloudinary
        const imageResult = await cloudinary.uploader.upload(imageFile.path, {
            folder: `abuzaid-mosque/${req.user.userName}/nextFriday`,
            transformation: [
                { width: 800, height: 600, crop: "fill", quality: "auto" }
            ]
        });

        const nextFridayData = {
            title,
            name,
            date,
            image: {
                url: imageResult.secure_url,
                public_id: imageResult.public_id
            },
            createdBy: userId
        };

        // Create in database
        const nextFriday = await NextFriday.create(nextFridayData);

        // Clean up local uploaded file
        if (fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }

        res.status(201).json({
            success: true,
            message: "NextFriday entry created successfully",
            data: nextFriday
        });

    } catch (error) {
        // Clean up local file on error
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Get all nextFriday entries (non-deleted)
export const getAllNextFridays = asyncHandler(async (req, res, next) => {
    const nextFridays = await NextFriday.find({ softDelete: false })
        .populate('createdBy', 'userName email')
        .sort('-date')
        .lean();

    res.status(200).json({
        success: true,
        data: nextFridays
    });
});

 
// Update nextFriday entry
export const updateNextFriday = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const imageFile = req.files?.image?.[0] || req.file;
    const updateData = req.body;

    const existingEntry = await NextFriday.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!existingEntry) {
        return res.status(404).json({
            success: false,
            message: "NextFriday entry not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to update this entry"
        });
    }

    try {
        if (imageFile) {
            // Delete old image from Cloudinary
            if (existingEntry.image?.public_id) {
                await cloudinary.uploader.destroy(existingEntry.image.public_id);
            }

            // Upload new image
            const imageResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: `abuzaid-mosque/${req.user.userName}/nextFriday`,
                transformation: [
                    { width: 800, height: 600, crop: "fill", quality: "auto" }
                ]
            });

            updateData.image = {
                url: imageResult.secure_url,
                public_id: imageResult.public_id
            };

            // Clean up local file
            if (fs.existsSync(imageFile.path)) {
                fs.unlinkSync(imageFile.path);
            }
        }

        const updatedEntry = await NextFriday.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'userName email');

        res.status(200).json({
            success: true,
            message: "NextFriday entry updated successfully",
            data: updatedEntry
        });

    } catch (error) {
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Delete nextFriday entry (soft delete)
export const deleteNextFriday = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const entry = await NextFriday.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!entry) {
        return res.status(404).json({
            success: false,
            message: "NextFriday entry not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to delete this entry"
        });
    }

    await NextFriday.findByIdAndUpdate(id, { softDelete: true });

    res.status(200).json({
        success: true,
        message: "NextFriday entry deleted successfully"
    });
});