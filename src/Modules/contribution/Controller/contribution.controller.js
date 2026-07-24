import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import Contribution from "../../../../database/Models/contribution.model.js";
import fs from 'fs';

// Create a new contribution
export const createContribution = asyncHandler(async (req, res, next) => {
    const { name, description, condition, quantity, location, notes } = req.body;
    const userId = req.user._id;
    
    const imageFile = req.files?.image?.[0] || req.file;

    try {
        const contributionData = {
            name,
            description,
            condition,
            quantity,
            location,
            notes,
            createdBy: userId
        };

        // Upload image to Cloudinary if provided
        if (imageFile) {
            const imageResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: `abuzaid-mosque/${req.user.userName}/contributions`,
                transformation: [
                    { width: 800, height: 600, crop: "fill", quality: "auto" }
                ]
            });

            contributionData.image = {
                url: imageResult.secure_url,
                public_id: imageResult.public_id
            };

            // Clean up local uploaded file
            if (fs.existsSync(imageFile.path)) {
                fs.unlinkSync(imageFile.path);
            }
        }

        // Create in database
        const contribution = await Contribution.create(contributionData);

        res.status(201).json({
            success: true,
            message: "Contribution created successfully",
            data: contribution
        });

    } catch (error) {
        // Clean up local file on error if it was uploaded
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Get all contributions (non-deleted)
export const getAllContributions = asyncHandler(async (req, res, next) => {
    const contributions = await Contribution.find({ softDelete: false })
        .populate('createdBy', 'userName email')
        .sort('-createdAt')
        .lean();

    res.status(200).json({
        success: true,
        data: contributions
    });
});

// Update contribution
export const updateContribution = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const imageFile = req.files?.image?.[0] || req.file;
    const updateData = req.body;

    const existingContribution = await Contribution.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!existingContribution) {
        return res.status(404).json({
            success: false,
            message: "Contribution not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to update this contribution"
        });
    }

    try {
        if (imageFile) {
            // Delete old image from Cloudinary if it exists
            if (existingContribution.image?.public_id) {
                await cloudinary.uploader.destroy(existingContribution.image.public_id);
            }

            // Upload new image
            const imageResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: `abuzaid-mosque/${req.user.userName}/contributions`,
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

        const updatedContribution = await Contribution.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'userName email');

        res.status(200).json({
            success: true,
            message: "Contribution updated successfully",
            data: updatedContribution
        });

    } catch (error) {
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Delete contribution (soft delete)
export const deleteContribution = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const contribution = await Contribution.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!contribution) {
        return res.status(404).json({
            success: false,
            message: "Contribution not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to delete this contribution"
        });
    }

    await Contribution.findByIdAndUpdate(id, { softDelete: true });

    res.status(200).json({
        success: true,
        message: "Contribution deleted successfully"
    });
});
