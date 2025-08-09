const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');

// Create Comment
router.post('/create/:blogId', protect, async (req, res) => {
  const { content } = req.body;
  try {
    const comment = new Comment({
      content,
      blog: req.params.blogId,
      user: req.user.id
    });
    await comment.save();
    
    // Add comment to blog's comments array
    await Blog.findByIdAndUpdate(
      req.params.blogId,
      { $push: { comments: comment._id } }
    );

    req.flash('success_msg', 'Comment added');
    res.redirect(`/blogs/${req.params.blogId}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error adding comment');
    res.redirect(`/blogs/${req.params.blogId}`);
  }
});

module.exports = router;