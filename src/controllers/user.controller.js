import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

// Cookie options helper
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching JWT expiration
};

// Token generator
const generateToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, channelName } = req.body;

  if (!username || !email || !password || !channelName) {
    throw new ApiError(400, 'All fields are required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with username or email already exists');
  }

  // Get uploaded files paths if they exist
  let avatarPath = '/uploads/default-avatar.svg';
  let bannerPath = '/uploads/default-banner.svg';

  if (req.files) {
    if (req.files.avatar && req.files.avatar.length > 0) {
      avatarPath = `/uploads/images/${req.files.avatar[0].filename}`;
    }
    if (req.files.banner && req.files.banner.length > 0) {
      bannerPath = `/uploads/images/${req.files.banner[0].filename}`;
    }
  }

  const user = await User.create({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password,
    channelName,
    avatar: avatarPath,
    banner: bannerPath,
  });

  // Remove password from response
  const createdUser = await User.findById(user._id).select('-password');

  if (!createdUser) {
    throw new ApiError(500, 'User registration failed');
  }

  const token = generateToken(user._id);

  return res
    .status(201)
    .cookie('accessToken', token, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, token },
        'User registered successfully'
      )
    );
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!(email || username) || !password) {
    throw new ApiError(400, 'Username/Email and Password are required');
  }

  const user = await User.findOne({
    $or: [
      { email: email?.toLowerCase().trim() },
      { username: username?.toLowerCase().trim() },
    ],
  }).select('+password'); // select password explicitly

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  const token = generateToken(user._id);
  const loggedInUser = await User.findById(user._id).select('-password');

  return res
    .status(200)
    .cookie('accessToken', token, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, token },
        'User logged in successfully'
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie('accessToken', { ...cookieOptions, maxAge: 0 })
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user profile fetched'));
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, 'Username parameter is missing');
  }

  const channel = await User.findOne({ username: username.toLowerCase() });

  if (!channel) {
    throw new ApiError(404, 'Channel not found');
  }

  // Determine if logged-in user is subscribed
  const isSubscribed = req.user
    ? channel.subscribers.includes(req.user._id)
    : false;

  const profileData = {
    _id: channel._id,
    username: channel.username,
    channelName: channel.channelName,
    avatar: channel.avatar,
    banner: channel.banner,
    subscribersCount: channel.subscribersCount,
    isSubscribed,
    createdAt: channel.createdAt,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, profileData, 'User channel profile fetched'));
});

export const toggleSubscribe = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  if (channelId === userId.toString()) {
    throw new ApiError(400, 'You cannot subscribe to your own channel');
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, 'Channel not found');
  }

  const currentUser = await User.findById(userId);

  const isSubscribed = channel.subscribers.includes(userId);

  if (isSubscribed) {
    // Unsubscribe
    channel.subscribers.pull(userId);
    currentUser.subscribedTo.pull(channelId);
  } else {
    // Subscribe
    channel.subscribers.push(userId);
    currentUser.subscribedTo.push(channelId);
  }

  await channel.save({ validateBeforeSave: false });
  await currentUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSubscribed: !isSubscribed },
        isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully'
      )
    );
});

export const getSubscribedChannels = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'subscribedTo',
    'username channelName avatar'
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.subscribedTo,
        'Subscribed channels list fetched'
      )
    );
});

export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'watchHistory',
    populate: {
      path: 'owner',
      select: 'username channelName avatar',
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.watchHistory.reverse(), // Reverse to show latest watched first
        'Watch history fetched successfully'
      )
    );
});
