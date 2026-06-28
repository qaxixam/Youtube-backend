import Video from '../models/video.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import fs from 'fs';
import path from 'path';


export const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, category, visibility } = req.body;

  // 1. Text Field Validations
  if (!title || !category) {
    if (req.files?.videoFile?.[0]?.path) fs.unlinkSync(req.files.videoFile[0].path);
    if (req.files?.thumbnailUrl?.[0]?.path) fs.unlinkSync(req.files.thumbnailUrl[0].path);
    
    throw new ApiError(400, 'Title and Category are required');
  }

  // 2. Safe File Presence Verification
  const videoFileArray = req.files?.videoFile;
  const thumbnailFileArray = req.files?.thumbnailUrl;

  if (!videoFileArray || videoFileArray.length === 0) {
    if (thumbnailFileArray?.[0]?.path) fs.unlinkSync(thumbnailFileArray[0].path);
    throw new ApiError(400, 'Video file is required');
  }

  if (!thumbnailFileArray || thumbnailFileArray.length === 0) {
    if (videoFileArray?.[0]?.path) fs.unlinkSync(videoFileArray[0].path);
    throw new ApiError(400, 'Thumbnail is required');
  }

  // 3. Extract safe generated filenames using index [0]
  const videoFilename = videoFileArray[0].filename;
  const thumbnailFilename = thumbnailFileArray[0].filename;

  // 4. Construct the public-facing static web paths
  const videoUrl = `/uploads/videos/${videoFilename}`;
  const thumbnailUrl = `/uploads/images/${thumbnailFilename}`;

  const mockDuration = Math.floor(Math.random() * (600 - 60 + 1)) + 60;

  // 5. Create database entry
  try {
    const video = await Video.create({
      title,
      description: description || '',
      videoUrl,
      thumbnailUrl,
      category,
      visibility: visibility || 'public',
      duration: mockDuration,
      owner: req.user._id, // 💡 MAKE SURE req.user IS POPULATED BY AUTH MIDDLEWARE!
    });

    const createdVideo = await Video.findById(video._id).populate(
      'owner',
      'username channelName avatar'
    );

    return res
      .status(201)
      .json(new ApiResponse(201, createdVideo, 'Video uploaded successfully to local storage'));

  } catch (dbError) {
    // 💡 FIX: Added index [0] so the cleanup code doesn't crash if the database fails
    const localVideoPath = videoFileArray[0]?.path;
    const localThumbnailPath = thumbnailFileArray[0]?.path;

    if (localVideoPath && fs.existsSync(localVideoPath)) fs.unlinkSync(localVideoPath);
    if (localThumbnailPath && fs.existsSync(localThumbnailPath)) fs.unlinkSync(localThumbnailPath);
    
    // This will now print the REAL database error instead of a cleanup crash!
    throw new ApiError(500, `Database registration dropped: ${dbError.message}`);
  }
});
export const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    query,
    category,
    sortBy = 'createdAt',
    sortType = 'desc',
    userId,
  } = req.query;

  const filter = { visibility: 'public' };

  if (query?.trim()) {
    filter.$or = [
      { title: { $regex: query.trim(), $options: 'i' } },
      { description: { $regex: query.trim(), $options: 'i' } },
    ];
  }

  if (category && category !== 'All') {
    filter.category = category;
  }

  if (userId) {
    filter.owner = userId;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sortBy]: sortType === 'desc' ? -1 : 1 },
  };

  const skip = (options.page - 1) * options.limit;

  const videos = await Video.find(filter)
    .populate('owner', 'username channelName avatar')
    .sort(options.sort)
    .skip(skip)
    .limit(options.limit);

  const totalVideos = await Video.countDocuments(filter);
  const totalPages = Math.ceil(totalVideos / options.limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: options.page,
        limit: options.limit,
        totalVideos,
        totalPages,
        hasNextPage: options.page < totalPages,
      },
      'Videos fetched successfully'
    )
  );
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId).populate(
    'owner',
    'username channelName avatar subscribersCount subscribers'
  );

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  // Populate interactive likes state
  const isLiked = req.user ? video.likes.includes(req.user._id) : false;
  const isDisliked = req.user ? video.dislikes.includes(req.user._id) : false;
  const isSubscribed = req.user
    ? video.owner.subscribers.includes(req.user._id)
    : false;

  // Add to watch history if logged in
  if (req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      // Remove duplicates then append
      user.watchHistory.pull(video._id);
      user.watchHistory.push(video._id);
      await user.save({ validateBeforeSave: false });
    }
  }

  const result = {
    ...video.toObject(),
    likesCount: video.likes.length,
    dislikesCount: video.dislikes.length,
    isLiked,
    isDisliked,
    isSubscribed,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Video details fetched successfully'));
});

export const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, category, visibility } = req.body;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized to update this video');
  }

  if (title) video.title = title;
  if (description) video.description = description;
  if (category) video.category = category;
  if (visibility) video.visibility = visibility;

  if (req.file) {
    // Delete old thumbnail if it exists
    const oldThumbnailPath = path.join('public', video.thumbnailUrl.replace(/^\/?/, ''));
    if (fs.existsSync(oldThumbnailPath)) {
      fs.unlinkSync(oldThumbnailPath);
    }
    video.thumbnailUrl = `/uploads/images/${req.file.filename}`;
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, 'Video details updated successfully'));
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized to delete this video');
  }

  // Delete files from public directory
  const videoPath = path.join('public', video.videoUrl.replace(/^\/?/, ''));
  const thumbnailPath = path.join('public', video.thumbnailUrl.replace(/^\/?/, ''));

  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  if (fs.existsSync(thumbnailPath) && !video.thumbnailUrl.includes('default-')) {
    fs.unlinkSync(thumbnailPath);
  }

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Video deleted successfully'));
});

export const toggleLikeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  const isAlreadyLiked = video.likes.includes(userId);
  const isAlreadyDisliked = video.dislikes.includes(userId);

  if (isAlreadyLiked) {
    video.likes.pull(userId);
  } else {
    video.likes.push(userId);
    if (isAlreadyDisliked) {
      video.dislikes.pull(userId);
    }
  }

  await video.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: !isAlreadyLiked,
        isDisliked: isAlreadyLiked ? false : false,
        likesCount: video.likes.length,
        dislikesCount: video.dislikes.length,
      },
      'Like toggled successfully'
    )
  );
});

export const toggleDislikeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  const isAlreadyLiked = video.likes.includes(userId);
  const isAlreadyDisliked = video.dislikes.includes(userId);

  if (isAlreadyDisliked) {
    video.dislikes.pull(userId);
  } else {
    video.dislikes.push(userId);
    if (isAlreadyLiked) {
      video.likes.pull(userId);
    }
  }

  await video.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: false,
        isDisliked: !isAlreadyDisliked,
        likesCount: video.likes.length,
        dislikesCount: video.dislikes.length,
      },
      'Dislike toggled successfully'
    )
  );
});

export const incrementViews = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }

  video.views += 1;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { views: video.views }, 'Views incremented'));
});

export const getSubscribedVideosFeed = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const user = await User.findById(req.user._id);
  const subscribedChannels = user.subscribedTo;

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const skip = (options.page - 1) * options.limit;

  const videos = await Video.find({
    owner: { $in: subscribedChannels },
    visibility: 'public',
  })
    .populate('owner', 'username channelName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(options.limit);

  const totalVideos = await Video.countDocuments({
    owner: { $in: subscribedChannels },
    visibility: 'public',
  });

  const totalPages = Math.ceil(totalVideos / options.limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: options.page,
        limit: options.limit,
        totalVideos,
        totalPages,
        hasNextPage: options.page < totalPages,
      },
      'Subscriptions feed fetched successfully'
    )
  );
});

// Advanced Video Streaming Endpoint (HTTP 206 Partial Content)
export const streamVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video record not found');
  }

  // Resolve absolute path – strip leading slash if any
  const relativePath = video.videoUrl.replace(/^\/?/, '');
  const videoPath = path.resolve('public', relativePath);

  if (!fs.existsSync(videoPath)) {
    throw new ApiError(404, 'Video binary file not found on disk');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Check boundary
    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});
