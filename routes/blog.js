const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Create Blog
router.get('/create', protect, restrictTo('author', 'admin'), (req, res) => {
  res.render('blog/create');
});

router.post('/create', protect, restrictTo('author', 'admin'), upload.single('image'), async (req, res) => {
  const { title, description, content } = req.body;
  try {
    let imagePath;
    if (req.file) {
      const imageName = `${Date.now()}-${req.file.originalname}`;
      imagePath = path.join('uploads', imageName);
      fs.writeFileSync(path.join(__dirname, '../public', imagePath), req.file.buffer);
    }
    const blog = new Blog({
      title,
      description,
      content,
      image: imagePath,
      author: req.user.id
    });
    await blog.save();
    req.flash('success_msg', 'Blog created successfully');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error creating blog');
    res.redirect('/blogs/create');
  }
});

// Get Single Blog
router.get('/:id', async (req, res) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.flash('error_msg', 'Invalid blog ID');
      return res.redirect('/');
    }

    const blog = await Blog.findById(req.params.id)
      .populate('author')
      .populate({
        path: 'comments',
        populate: { path: 'user' }
      });
    
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }
    
    res.render('blog/show', { blog });
  } catch (err) {
    console.error('Error loading blog:', err);
    req.flash('error_msg', 'Error loading blog');
    res.redirect('/');
  }
});

// Edit Blog - GET
router.get('/edit/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.flash('error_msg', 'Invalid blog ID');
      return res.redirect('/');
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }

    // Check if user is author or admin
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/');
    }

    res.render('blog/edit', { blog });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading blog');
    res.redirect('/');
  }
});

// Edit Blog - POST
router.post('/edit/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }

    // Check if user is author or admin
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/');
    }

    const { title, description, content } = req.body;
    let imagePath = blog.image; // Keep existing image by default

    // Handle new image upload
    if (req.file) {
      // Delete old image if it exists
      if (blog.image) {
        const oldImagePath = path.join(__dirname, '../public', blog.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Save new image
      const imageName = `${Date.now()}-${req.file.originalname}`;
      imagePath = path.join('uploads', imageName);
      fs.writeFileSync(path.join(__dirname, '../public', imagePath), req.file.buffer);
    }

    blog.title = title;
    blog.description = description;
    blog.content = content;
    blog.image = imagePath;

    await blog.save();
    req.flash('success_msg', 'Blog updated successfully');
    res.redirect(`/blogs/${blog._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating blog');
    res.redirect(`/blogs/edit/${req.params.id}`);
  }
});

// Like Blog
router.post('/like/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }

    // Remove user from dislikes if present
    if (blog.dislikes.includes(req.user.id)) {
      blog.dislikes = blog.dislikes.filter(id => id.toString() !== req.user.id.toString());
    }

    // Toggle like
    if (blog.likes.includes(req.user.id)) {
      blog.likes = blog.likes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      blog.likes.push(req.user.id);
    }

    await blog.save();
    res.redirect(`/blogs/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating like');
    res.redirect(`/blogs/${req.params.id}`);
  }
});

// Dislike Blog
router.post('/dislike/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }

    // Remove user from likes if present
    if (blog.likes.includes(req.user.id)) {
      blog.likes = blog.likes.filter(id => id.toString() !== req.user.id.toString());
    }

    // Toggle dislike
    if (blog.dislikes.includes(req.user.id)) {
      blog.dislikes = blog.dislikes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      blog.dislikes.push(req.user.id);
    }

    await blog.save();
    res.redirect(`/blogs/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error updating dislike');
    res.redirect(`/blogs/${req.params.id}`);
  }
});

// Delete Blog
router.post('/delete/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.flash('error_msg', 'Invalid blog ID');
      return res.redirect('/');
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash('error_msg', 'Blog not found');
      return res.redirect('/');
    }

    // Check if user is author or admin
    if (blog.author.toString() !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/');
    }

    // Delete the blog image if it exists
    if (blog.image) {
      const imagePath = path.join(__dirname, '../public', blog.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Blog deleted successfully');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error deleting blog');
    res.redirect('/');
  }
});

module.exports = router;