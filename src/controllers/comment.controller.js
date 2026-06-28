import Comment from '../models/comment.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const skip = (options.page - 1) * options.limit;

  const comments = await Comment.find({ video: videoId })
    .populate('owner', 'username channelName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(options.limit);

  const totalComments = await Comment.countDocuments({ video: videoId });
  const totalPages = Math.ceil(totalComments / options.limit);

  // Append isLiked status if req.user exists
  const commentsWithLikesInfo = comments.map((comment) => {
    const isLiked = req.user ? comment.likes.includes(req.user._id) : false;
    return {
      ...comment.toObject(),
      likesCount: comment.likes.length,
      isLiked,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments: commentsWithLikesInfo,
        page: options.page,
        limit: options.limit,
        totalComments,
        totalPages,
        hasNextPage: options.page < totalPages,
      },
      'Comments fetched successfully'
    )
  );
});

export const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, 'Comment content is required');
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate(
    'owner',
    'username channelName avatar'
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, 'Comment added successfully'));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  // Authorize: Only the comment owner can delete it
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized to delete this comment');
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});

export const toggleLikeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const isLiked = comment.likes.includes(userId);

  if (isLiked) {
    comment.likes.pull(userId);
  } else {
    comment.likes.push(userId);
  }

  await comment.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked: !isLiked,
        likesCount: comment.likes.length,
      },
      'Comment like toggled'
    )
  );
});
