import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import NextFriday from "../../../../database/Models/nextFriday.model.js";
import { unlink } from "node:fs/promises";
import { MOSQUE_TIME_ZONE, mosqueDateKey } from "../nextFriday.dates.js";

const cleanupLocal = async (file) => {
    if (!file?.path) return;
    try { await unlink(file.path); }
    catch (error) {
        if (error.code !== "ENOENT") console.error("NextFriday local image cleanup failed", error);
    }
};

const cleanupCloud = async (publicId) => {
    if (!publicId) return;
    try { await cloudinary.uploader.destroy(publicId); }
    catch (error) { console.error("NextFriday cloud image cleanup failed", error); }
};

const uploadImage = (file, user) => cloudinary.uploader.upload(file.path, {
    folder: `abuzaid-mosque/${user.userName}/nextFriday`,
    transformation: [{ width: 800, height: 600, crop: "fill", quality: "auto" }]
});

// name is the imam; title is the sermon subject. Preserve existing client fields.
const editableFields = (body) => Object.fromEntries(
    ["title", "name", "description", "date"].filter(key => body[key] !== undefined).map(key => [key, body[key]])
);

export const createNextFriday = asyncHandler(async (req, res) => {
    const file = req.files?.image?.[0] || req.file;
    let uploaded;
    let saved = false;
    try {
        if (file) uploaded = await uploadImage(file, req.user);
        const entry = await NextFriday.create({
            ...editableFields(req.body),
            image: uploaded ? { url: uploaded.secure_url, public_id: uploaded.public_id } : null,
            createdBy: req.user._id
        });
        saved = true;
        return res.status(201).json({ success: true, message: "NextFriday entry created successfully", data: entry });
    } catch (error) {
        if (!saved) await cleanupCloud(uploaded?.public_id);
        throw error;
    } finally {
        await cleanupLocal(file);
    }
});

export const getAllNextFridays = asyncHandler(async (req, res) => {
    const entries = await NextFriday.find({ softDelete: false })
        .populate("createdBy", "userName")
        .sort("-date")
        .lean();
    return res.status(200).json({ success: true, data: entries });
});

// Include today's announcement throughout Friday in the mosque's timezone.
export const getUpcomingFriday = asyncHandler(async (req, res) => {
    const entry = await NextFriday.findOne({
        softDelete: false,
        $expr: { $gte: [
            { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: MOSQUE_TIME_ZONE } },
            mosqueDateKey()
        ] }
    }).sort({ date: 1, _id: 1 }).populate("createdBy", "userName").lean();
    return res.status(200).json({ success: true, data: entry });
});

export const updateNextFriday = asyncHandler(async (req, res) => {
    const file = req.files?.image?.[0] || req.file;
    let uploaded;
    let saved = false;
    try {
        const existing = await NextFriday.findOne({ _id: req.params.id, softDelete: false });
        if (!existing) return res.status(404).json({ success: false, message: "NextFriday entry not found" });
        const updates = editableFields(req.body);
        if (!Object.keys(updates).length && !file) {
            return res.status(400).json({ success: false, message: "Provide a title, name, description, date or image to update" });
        }
        if (file) {
            uploaded = await uploadImage(file, req.user);
            updates.image = { url: uploaded.secure_url, public_id: uploaded.public_id };
        }
        // Reject concurrent updates instead of overwriting another image or deletion.
        const updated = await NextFriday.findOneAndUpdate(
            { _id: existing._id, softDelete: false, __v: existing.__v },
            { $set: updates, $inc: { __v: 1 } },
            { new: true, runValidators: true }
        );
        if (!updated) {
            await cleanupCloud(uploaded?.public_id);
            uploaded = undefined;
            return res.status(409).json({ success: false, message: "Entry changed; refresh and retry" });
        }
        saved = true;
        if (uploaded) await cleanupCloud(existing.image?.public_id);
        return res.status(200).json({ success: true, message: "NextFriday entry updated successfully", data: updated });
    } catch (error) {
        if (!saved) await cleanupCloud(uploaded?.public_id);
        throw error;
    } finally {
        await cleanupLocal(file);
    }
});

export const deleteNextFriday = asyncHandler(async (req, res) => {
    const entry = await NextFriday.findOneAndUpdate(
        { _id: req.params.id, softDelete: false },
        { $set: { softDelete: true }, $inc: { __v: 1 } },
        { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: "NextFriday entry not found" });
    return res.status(200).json({ success: true, message: "NextFriday entry deleted successfully" });
});
