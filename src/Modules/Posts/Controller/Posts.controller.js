import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import cloudinary from "../../../config/cloudinary.config.js";
import Post from "../../../../database/Models/post.model.js";
import fs from 'fs';

// Helper for safe local file unlinking
const safeUnlink = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error("Failed to delete local temp file:", filePath, err.message);
        }
    }
};

// Helper for generating slug supporting Arabic and English
const generateSlug = (title) => {
    if (!title) return `post-${Date.now()}`;
    const cleaned = title
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF\s-]/g, '') // Keep English, Arabic, numbers, spaces, dashes
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    return cleaned || `post-${Date.now()}`;
};

// Helper to normalize tags array
const normalizeTags = (tagsInput) => {
    if (!tagsInput) return [];
    if (Array.isArray(tagsInput)) {
        return tagsInput.map(t => String(t).trim()).filter(Boolean);
    }
    if (typeof tagsInput === "string") {
        return tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    }
    return [String(tagsInput).trim()].filter(Boolean);
};

// Create a Mosque Post
export const createPost = asyncHandler(async (req, res, next) => {
    const { title, content, category, isPinned, published } = req.body;
    const userId = req.user._id;
    const files = req.files || {};
    const mainImage = files.mainImage;
    const subImage = files.subImage;

    // Check if main image is provided
    if (!mainImage || mainImage.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Main image is required for the post"
        });
    }

    try {
        const username = req.user.userName || 'admin';
        
        // Upload main image to Cloudinary
        const mainImageResult = await cloudinary.uploader.upload(mainImage[0].path, {
            folder: `Mosque/posts/${username}/mainImages`,
            transformation: [
                { width: 800, height: 600, crop: "fill", quality: "auto" }
            ]
        });

        const mainImageData = {
            url: mainImageResult.secure_url,
            public_id: mainImageResult.public_id
        };

        // Upload sub images to Cloudinary if provided
        let subImagesData = [];
        if (subImage && subImage.length > 0) {
            const subImagePromises = subImage.map(img =>
                cloudinary.uploader.upload(img.path, {
                    folder: `Mosque/posts/${username}/subImages`,
                    transformation: [
                        { width: 600, height: 400, crop: "fill", quality: "auto" }
                    ]
                })
            );

            const subImageResults = await Promise.all(subImagePromises);
            subImagesData = subImageResults.map(result => ({
                url: result.secure_url,
                public_id: result.public_id
            }));
        }

        // Generate unique slug
        const baseSlug = generateSlug(title);
        let uniqueSlug = baseSlug;
        let suffix = 0;
        while (await Post.findOne({ slug: uniqueSlug })) {
            suffix += 1;
            uniqueSlug = `${baseSlug}-${suffix}`;
        }

        // Prepare post payload
        const postPayload = {
            title,
            slug: uniqueSlug,
            content,
            mainImage: mainImageData,
            subImages: subImagesData,
            author: userId,
            isPinned: isPinned === 'true' || isPinned === true,
            published: published !== undefined ? (published === 'true' || published === true) : true,
        };

        // Create post in DB
        const post = await Post.create(postPayload);

        // Clean up temporary local files
        safeUnlink(mainImage[0].path);
        if (subImage) {
            subImage.forEach(img => safeUnlink(img.path));
        }

        res.status(201).json({
            success: true,
            message: "Mosque post created successfully",
            data: post
        });

    } catch (error) {
        // Clean up temporary local files on error
        if (mainImage) safeUnlink(mainImage[0].path);
        if (subImage) subImage.forEach(img => safeUnlink(img.path));
        throw error;
    }
});

// Get all posts with filtering, searching, and pagination
export const getAllPosts = asyncHandler(async (req, res, next) => {
    const {
        page = 1,
        limit = 10,
        category,
        isPinned,
        featured,
        published = 'true',
        author,
        search,
        sort = '-createdAt'
    } = req.query;

    const numericPage = Math.max(1, parseInt(page));
    const numericLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (numericPage - 1) * numericLimit;

    // Build filter object
    const filter = { softDelete: false };
    
    if (category) filter.category = category;
    if (isPinned !== undefined) filter.isPinned = isPinned === 'true';
    if (featured !== undefined) filter.featured = featured === 'true';
    if (published !== undefined) filter.published = published === 'true';
    if (author) filter.author = author;

    // Search query across title, content, excerpt, and tags
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { excerpt: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    // Sort order: Pinned posts float to top first
    const sortOption = `-isPinned ${sort}`;

    // Execute queries in parallel
    const [posts, total] = await Promise.all([
        Post.find(filter)
            .populate('author', 'userName email role')
            .populate('comments.user', 'userName')
            .sort(sortOption)
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Post.countDocuments(filter)
    ]);

    res.status(200).json( {
        success: true,
        pagination: {
            page: numericPage,
            limit: numericLimit,
            total,
            pages: Math.ceil(total / numericLimit)
        },
        data: posts
    });
});

// Get single post by ID
export const getPostById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const post = await Post.findOne({ 
        _id: id, 
        softDelete: false 
    })
    .populate('author', 'userName email role')
    .populate('comments.user', 'userName');

    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    // Increment view count asynchronously
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json({
        success: true,
        data: post
    });
});

// Get posts by category
export const getPostsByCategory = asyncHandler(async (req, res, next) => {
    const { category } = req.params;
    const {
        page = 1,
        limit = 10,
        sort = '-createdAt'
    } = req.query;

    const numericPage = Math.max(1, parseInt(page));
    const numericLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (numericPage - 1) * numericLimit;

    const filter = {
        category,
        published: true,
        softDelete: false
    };

    const [posts, total] = await Promise.all([
        Post.find(filter)
            .populate('author', 'userName email role')
            .sort(`-isPinned ${sort}`)
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Post.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        category,
        pagination: {
            page: numericPage,
            limit: numericLimit,
            total,
            pages: Math.ceil(total / numericLimit)
        },
        data: posts
    });
});

// Get posts by tag
export const getPostsByTag = asyncHandler(async (req, res, next) => {
    const {
        tag,
        page = 1,
        limit = 10,
        sort = '-createdAt'
    } = req.query;

    const numericPage = Math.max(1, parseInt(page));
    const numericLimit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (numericPage - 1) * numericLimit;

    const filter = { 
        softDelete: false,
        published: true,
        tags: { $in: [new RegExp(tag, 'i')] }
    };

    const [posts, total] = await Promise.all([
        Post.find(filter)
            .populate('author', 'userName email role')
            .sort(`-isPinned ${sort}`)
            .skip(skip)
            .limit(numericLimit)
            .lean(),
        Post.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        tag,
        pagination: {
            page: numericPage,
            limit: numericLimit,
            total,
            pages: Math.ceil(total / numericLimit)
        },
        data: posts
    });
});

// Update a post
export const updatePost = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const files = req.files || {};
    const mainImage = files.mainImage;
    const subImage = files.subImage;
    const updateData = { ...req.body };

    // Find existing post
    const existingPost = await Post.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!existingPost) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    // Permission check: Author or Admin/SuperAdmin
    const isAuthor = String(existingPost.author) === String(userId);
    const isAdmin = userRole === "admin" || userRole === "superAdmin";

    if (!isAuthor && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to update this post"
        });
    }

    try {
        const username = req.user.userName || 'admin';

        // Normalize tags if provided
        if (updateData.tags !== undefined) {
            updateData.tags = normalizeTags(updateData.tags);
        }

        // Handle main image update
        if (mainImage && mainImage.length > 0) {
            // Delete old main image from Cloudinary
            if (existingPost.mainImage?.public_id) {
                await cloudinary.uploader.destroy(existingPost.mainImage.public_id);
            }

            // Upload new main image
            const mainImageResult = await cloudinary.uploader.upload(mainImage[0].path, {
                folder: `Mosque/posts/${username}/mainImages`,
                transformation: [
                    { width: 800, height: 600, crop: "fill", quality: "auto" }
                ]
            });

            updateData.mainImage = {
                url: mainImageResult.secure_url,
                public_id: mainImageResult.public_id
            };

            safeUnlink(mainImage[0].path);
        }

        // Handle sub images update
        if (subImage && subImage.length > 0) {
            // Delete old sub images from Cloudinary
            if (existingPost.subImages && existingPost.subImages.length > 0) {
                const deletePromises = existingPost.subImages.map(img => 
                    cloudinary.uploader.destroy(img.public_id)
                );
                await Promise.all(deletePromises);
            }

            // Upload new sub images
            const subImagePromises = subImage.map(img => 
                cloudinary.uploader.upload(img.path, {
                    folder: `Mosque/posts/${username}/subImages`,
                    transformation: [
                        { width: 600, height: 400, crop: "fill", quality: "auto" }
                    ]
                })
            );
            const subImageResults = await Promise.all(subImagePromises);
            updateData.subImages = subImageResults.map(result => ({
                url: result.secure_url,
                public_id: result.public_id
            }));

            subImage.forEach(img => safeUnlink(img.path));
        }

        // Regenerate slug if title changes
        if (updateData.title && updateData.title !== existingPost.title) {
            const baseSlug = generateSlug(updateData.title);
            let uniqueSlug = baseSlug;
            let suffix = 0;
            while (await Post.findOne({ slug: uniqueSlug, _id: { $ne: id } })) {
                suffix += 1;
                uniqueSlug = `${baseSlug}-${suffix}`;
            }
            updateData.slug = uniqueSlug;
        }

        // Update post in DB
        const updatedPost = await Post.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'userName email role');

        res.status(200).json({
            success: true,
            message: "Post updated successfully",
            data: updatedPost
        });

    } catch (error) {
        if (mainImage) safeUnlink(mainImage[0].path);
        if (subImage) subImage.forEach(img => safeUnlink(img.path));
        throw error;
    }
});

// Delete post (soft delete)
export const deletePost = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const post = await Post.findOne({ 
        _id: id, 
        softDelete: false 
    });

    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    const isAuthor = String(post.author) === String(userId);
    const isAdmin = userRole === "admin" || userRole === "superAdmin";

    if (!isAuthor && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to delete this post"
        });
    }

    await Post.findByIdAndUpdate(id, { softDelete: true });

    res.status(200).json({
        success: true,
        message: "Post deleted successfully"
    });
});

// Toggle Like / Unlike on a post
export const toggleLikePost = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, softDelete: false });
    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    const alreadyLiked = post.likes.includes(userId);
    let updatedPost;

    if (alreadyLiked) {
        // Unlike post
        updatedPost = await Post.findByIdAndUpdate(
            id,
            {
                $pull: { likes: userId },
                $inc: { likesCount: -1 }
            },
            { new: true }
        );
    } else {
        // Like post
        updatedPost = await Post.findByIdAndUpdate(
            id,
            {
                $addToSet: { likes: userId },
                $inc: { likesCount: 1 }
            },
            { new: true }
        );
    }

    res.status(200).json({
        success: true,
        message: alreadyLiked ? "Post unliked" : "Post liked",
        likesCount: Math.max(0, updatedPost.likesCount)
    });
});

// Add a comment to a post
export const addComment = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: id, softDelete: false });
    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    if (!post.allowComments) {
        return res.status(400).json({
            success: false,
            message: "Comments are disabled for this post"
        });
    }

    const commentData = {
        user: userId,
        content: content.trim(),
        createdAt: new Date()
    };

    const updatedPost = await Post.findByIdAndUpdate(
        id,
        {
            $push: { comments: commentData },
            $inc: { commentsCount: 1 }
        },
        { new: true }
    )
    .populate('author', 'userName email')
    .populate('comments.user', 'userName');

    res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: updatedPost.comments[updatedPost.comments.length - 1]
    });
});

// Delete a comment from a post
export const deleteComment = asyncHandler(async (req, res, next) => {
    const { id, commentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const post = await Post.findOne({ _id: id, softDelete: false });
    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
        return res.status(404).json({
            success: false,
            message: "Comment not found"
        });
    }

    const isCommentOwner = String(comment.user) === String(userId);
    const isPostOwner = String(post.author) === String(userId);
    const isAdmin = userRole === "admin" || userRole === "superAdmin";

    if (!isCommentOwner && !isPostOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Access denied: You don't have permission to delete this comment"
        });
    }

    await Post.findByIdAndUpdate(
        id,
        {
            $pull: { comments: { _id: commentId } },
            $inc: { commentsCount: -1 }
        }
    );

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully"
    });
});

// Pin / Unpin a mosque post (Admin / SuperAdmin)
export const togglePinPost = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const post = await Post.findOne({ _id: id, softDelete: false });
    if (!post) {
        return res.status(404).json({
            success: false,
            message: "Post not found"
        });
    }

    const updatedPost = await Post.findByIdAndUpdate(
        id,
        { isPinned: !post.isPinned },
        { new: true }
    );

    res.status(200).json({
        success: true,
        message: updatedPost.isPinned ? "Post pinned to top of feed" : "Post unpinned",
        isPinned: updatedPost.isPinned
    });
});