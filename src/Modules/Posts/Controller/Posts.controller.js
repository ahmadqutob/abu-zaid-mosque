// import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
// import cloudinary from "../../../config/cloudinary.config.js";
// import Post from "../../../../database/Models/post.model.js";
// import fs from 'fs';
 

// export const createPost = asyncHandler(async (req, res, next) => {
//     const { title , content , exceprt , tags , featured , published   }= req.body ;
//     const userId = req.user._id;
//     const { mainImage, subImage } = req.files;
//     const postData = req.body;
//      // Normalize tags to always be an array
//     if (postData?.tags) {
//         if (Array.isArray(postData.tags)) {
//           postData.tags = postData.tags.map(t => t.trim()).filter(Boolean); //removes empty tags, null, undefined
//         } else if (typeof postData.tags === "string") {
//           postData.tags = postData.tags.split(",").map(t => t.trim()).filter(Boolean);//removes empty tags, null, undefined
//         } else {
//           postData.tags = [String(postData.tags).trim()].filter(Boolean);//removes empty tags, null, undefined
//         }
//       }
      

//     // Check if main image is provided
//     if (!mainImage || mainImage.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "Main image is required for the post"
//         });
//     }

//     try {
//         // Upload main image to Cloudinary
//         console.log({UPLOAD_mainImage : mainImage});

//         const mainImageResult = await cloudinary.uploader.upload(mainImage[0].path, {
//             folder: `Stadium_Rental/${req.user.userName}/posts/mainImageFolder`,
//             transformation: [
//                 { width: 800, height: 600, crop: "fill", quality: "auto" }
//             ]
//         });

//         postData.mainImage = {
//             url: mainImageResult.secure_url,
//             public_id: mainImageResult.public_id
//         };

//         // Upload sub images to Cloudinary if they exist
//         if (subImage && subImage.length > 0) {
//             const subImagePromises = subImage.map(img =>
//                 cloudinary.uploader.upload(img.path, {
//                     folder: `Stadium_Rental/${req.user.userName}/posts/subImageFolder`,
//                     transformation: [
//                         { width: 600, height: 400, crop: "fill", quality: "auto" }
//                     ]
//                 })
//             );

//             const subImageResults = await Promise.all(subImagePromises);

//             postData.subImages = subImageResults.map(result => ({
//                 url: result.secure_url,
//                 public_id: result.public_id
//             }));
//         }

//         // Generate unique slug from title
//         if (postData.title) {
//             const baseSlug = String(postData.title)
//                 .toLowerCase()
//                 .trim()
//                 .replace(/[^a-z0-9\s-]/g, '')
//                 .replace(/\s+/g, '-')
//                 .replace(/-+/g, '-');

//             let uniqueSlug = baseSlug || `post-${Date.now()}`;
//             let suffix = 0;
//             while (await Post.findOne({ slug: uniqueSlug })) {
//                 suffix += 1;
//                 uniqueSlug = `${baseSlug}-${suffix}`;
//             }
//             postData.slug = uniqueSlug;
//         }

//         // Add author to post data
//         postData.author = userId;

//         // Create the post in database
//           const post = await Post.create(postData);

//         // // Clean up uploaded files from local storage
//         // delete the uploaded image files from the local folder
//         if (mainImage) {
//             fs.unlinkSync(mainImage[0].path);
//         }
//         if (subImage) {
//             subImage.forEach(img => fs.unlinkSync(img.path));
//         }

//         res.status(201).json({
//             success: true,
//             message: "Post created successfully",
//             data: post
//         });

//     } catch (error) {
//         // Clean up uploaded files if there's an error
//         if (mainImage) {
//             fs.unlinkSync(mainImage[0].path);
//         }
//         if (subImage) {
//             subImage.forEach(img => fs.unlinkSync(img.path));
//         }
//         throw error;
//     }
// });


 

// // Get all posts with filtering and pagination
// export const getAllPosts = asyncHandler(async (req, res, next) => {
//     const {
//         page = 1,
//         limit = 10,
//          featured,
//         published = true,
//         author,
//         search,
//         sort = '-createdAt'
//     } = req.query;

//     const numericPage = Math.max(1, parseInt(page));
//     const numericLimit = Math.min(50, Math.max(1, parseInt(limit)));
//     const skip = (numericPage - 1) * numericLimit;

//     // Build filter object
//     const filter = { softDelete: false };
//      if (featured !== undefined) filter.featured = featured === 'false';
//     if (published !== undefined) filter.published = published === 'true';
//     if (author) filter.author = author;

//     // Add search functionality
//     if (search) {
//         filter.$or = [ //or ->if any one of the conditions inside is true. will return doc
//             { title: { $regex: search, $options: 'i' } },//Search in the title field using regex.
//             { content: { $regex: search, $options: 'i' } },
//             { excerpt: { $regex: search, $options: 'i' } },//Search in the excerpt field using regex.
//             { tags: { $in: [new RegExp(search, 'i')] } }
//             //{title : 'foorball' }
//         ];
//     }

//     // Execute queries in parallel
//     const [posts, total] = await Promise.all([
//         Post.find(filter)
//             .populate('author', 'userName email')
//             .sort(sort)
//             .skip(skip)
//             .limit(numericLimit)
//             .lean(),
//         Post.countDocuments(filter)
//     ]);

//     res.status(200).json({
//         success: true,
//         pagination: {
//             page: numericPage,
//             limit: numericLimit,
//             total,
//             pages: Math.ceil(total / numericLimit)
//         },
//         data: posts
//     });
// });

// // Get single post by ID
// export const getPostById = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;

//     const post = await Post.findOne({ 
//         _id: id, 
//         softDelete: false 
//     }).populate('author', 'userName email');

//     if (!post) {
//         return res.status(404).json({
//             success: false,
//             message: "Post not found"
//         });
//     }

//     // Increment view count
//     await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

//     res.status(200).json({
//         success: true,
//         data: post
//     });
// });

// // Update post
// export const updatePost = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;
//     const userId = req.user._id;
//     const { mainImage, subImage } = req.files;
//     const updateData = req.body;

//     // Find the post
//     const existingPost = await Post.findOne({ 
//         _id: id, 
//         softDelete: false 
//     });

//     if (!existingPost) {
//         return res.status(404).json({
//             success: false,
//             message: "Post not found"
//         });
//     }

//     // Check if user is   admin
//    // const isAuthor = String(existingPost.author) === String(userId);
//     const isAdmin = req.user.role === "admin";
    
//     // if ( !isAdmin) {
//     if ( !isAdmin) {
//             return res.status(403).json({
//             success: false,
//             message: "Access denied: You don't have permission to update this post"
//         });
//     }

//     try {
//         // Handle main image update
//         if (mainImage && mainImage.length > 0) {
//             // Delete old main image from Cloudinary
//             if (existingPost.mainImage?.public_id) {
//                 await cloudinary.uploader.destroy(existingPost.mainImage.public_id);
//             }

//             // Upload new main image
//             const mainImageResult = await cloudinary.uploader.upload(mainImage[0].path, {
//                 folder: `Stadium_Rental/${req.user.userName}/posts/mainImageFolder`,
//                 transformation: [
//                     { width: 800, height: 600, crop: "fill", quality: "auto" }
//                 ]
//             });

//             updateData.mainImage = {
//                 url: mainImageResult.secure_url,
//                 public_id: mainImageResult.public_id
//             };

//             // Clean up local file
//             fs.unlinkSync(mainImage[0].path);
//         }

//         // Handle sub images update
//         if (subImage && subImage.length > 0) {
//             // Delete old sub images from Cloudinary
//             if (existingPost.subImages && existingPost.subImages.length > 0) {
//                 const deletePromises = existingPost.subImages.map(img => 
//                     cloudinary.uploader.destroy(img.public_id)
//                 );
//                 await Promise.all(deletePromises);
//             }

//             // Upload new sub images
//             const subImagePromises = subImage.map(img => 
//                 cloudinary.uploader.upload(img.path, {
//                     folder:`Stadium_Rental/${req.user.userName}/posts/subImageFolder`,
//                     transformation: [
//                         { width: 600, height: 400, crop: "fill", quality: "auto" }
//                     ]
//                 })
//             );
//             const subImageResults = await Promise.all(subImagePromises);
//             updateData.subImages = subImageResults.map(result => ({
//                 url: result.secure_url,
//                 public_id: result.public_id
//             }));

//             // Clean up local files
//             subImage.forEach(img => fs.unlinkSync(img.path));
//         }

//         // Update the post
//         const updatedPost = await Post.findByIdAndUpdate(
//             id,
//             updateData,
//             { new: true, runValidators: true }
//         ).populate('author', 'userName email');

//         res.status(200).json({
//             success: true,
//             message: "Post updated successfully",
//             data: updatedPost
//         });

//     } catch (error) {
//         // Clean up uploaded files if there's an error
//         if (mainImage) {
//             fs.unlinkSync(mainImage[0].path);
//         }
//         if (subImage) {
//             subImage.forEach(img => fs.unlinkSync(img.path));
//         }
//         throw error;
//     }
// });

// // Get posts by tag with filtering and pagination
// export const getPostsByTag = asyncHandler(async (req, res, next) => {
//     const {
//         tag,
//         page = 1,
//         limit = 10,
//         featured,
//         published = true,
//         author,
//         sort = '-createdAt'
//     } = req.query;

//     const numericPage = Math.max(1, parseInt(page));
//     const numericLimit = Math.min(50, Math.max(1, parseInt(limit)));
//     const skip = (numericPage - 1) * numericLimit;

//     // Build filter object
//     const filter = { 
//         softDelete: false,
//         tags: { $in: [new RegExp(tag, 'i')] } // Case-insensitive tag matching
//     };
    
//     if (featured !== undefined) filter.featured = featured === 'true';
//     if (published !== undefined) filter.published = published === 'true';
//     if (author) filter.author = author;

//     // Execute queries in parallel
//     const [posts, total] = await Promise.all([
//         Post.find(filter)
//             .populate('author', 'userName email')
//             .sort(sort)
//             .skip(skip)
//             .limit(numericLimit)
//             .lean(),
//         Post.countDocuments(filter)
//     ]);

//     // Check if no posts found
//     if (posts.length === 0) {
//         return res.status(404).json({
//             success: false,
//             message: `No posts found for tag: ${tag}`,
//             pagination: {
//                 page: numericPage,
//                 limit: numericLimit,
//                 total: 0,
//                 pages: 0
//             },
//             data: []
//         });
//     }

//     res.status(200).json({
//         success: true,
//         message: `Posts found for tag: ${tag}`,
//         pagination: {
//             page: numericPage,
//             limit: numericLimit,
//             total,
//             pages: Math.ceil(total / numericLimit)
//         },
//         data: posts
//     });
// });

// // Delete post (soft delete)
// export const deletePost = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;
//     const userId = req.user._id;

//     const post = await Post.findOne({ 
//         _id: id, 
//         softDelete: false 
//     });

//     if (!post) {
//         return res.status(404).json({
//             success: false,
//             message: "Post not found"
//         });
//     }

//     // Check if user is the author or admin
//     const isAuthor = String(post.author) === String(userId);
//     const isAdmin = req.user.role === "admin";
    
//     if (!isAuthor && !isAdmin) {
//         return res.status(403).json({
//             success: false,
//             message: "Access denied: You don't have permission to delete this post"
//         });
//     }

//     // Soft delete the post
//     await Post.findByIdAndUpdate(id, { softDelete: true });

//     res.status(200).json({
//         success: true,
//         message: "Post deleted successfully"
//     });
// });

 