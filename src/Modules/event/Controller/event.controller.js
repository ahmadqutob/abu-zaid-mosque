import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import Event from "../../../../database/Models/event.model.js";
import fs from 'fs';

// Create a new event
export const createEvent = asyncHandler(async (req, res, next) => {
    const { title, description, startDate, endDate, location, category, status, age } = req.body;
    const userId = req.user._id;
    
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
            folder: `abuzaid-mosque/${req.user.userName}/events`,
            transformation: [
                { width: 800, height: 600, crop: "fill", quality: "auto" }
            ]
        });

        const eventData = {
            title,
            description,
            startDate,
            endDate,
            location,
            category,
            status,
            age,
            image: {
                url: imageResult.secure_url,
                public_id: imageResult.public_id
            },
            createdBy: userId
        };

        // Create in database
        const event = await Event.create(eventData);

        // Clean up local uploaded file
        if (fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            data: event
        });

    } catch (error) {
        // Clean up local file on error
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Get all events (non-deleted)
export const getAllEvents = asyncHandler(async (req, res, next) => {
    const events = await Event.find({ softDelete: false })
        .populate('createdBy', 'userName email')
        .sort('-startDate')
        .lean();

    res.status(200).json({
        success: true,
        data: events
    });
});

// Update event
export const updateEvent = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const imageFile = req.files?.image?.[0] || req.file;
    const updateData = req.body;

    const existingEvent = await Event.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!existingEvent) {
        return res.status(404).json({
            success: false,
            message: "Event not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to update this event"
        });
    }

    try {
        if (imageFile) {
            // Delete old image from Cloudinary
            if (existingEvent.image?.public_id) {
                await cloudinary.uploader.destroy(existingEvent.image.public_id);
            }

            // Upload new image
            const imageResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: `abuzaid-mosque/${req.user.userName}/events`,
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

        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'userName email');

        res.status(200).json({
            success: true,
            message: "Event updated successfully",
            data: updatedEvent
        });

    } catch (error) {
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        throw error;
    }
});

// Delete event (soft delete)
export const deleteEvent = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const event = await Event.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!event) {
        return res.status(404).json({
            success: false,
            message: "Event not found"
        });
    }

    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";
    
    if (!isAdmin && !isTeacher) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to delete this event"
        });
    }

    await Event.findByIdAndUpdate(id, { softDelete: true });

    res.status(200).json({
        success: true,
        message: "Event deleted successfully"
    });
});
