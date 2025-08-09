const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Register
router.get('/register', (req, res) => res.render('auth/register'));

router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    // Validate role
    const validRoles = ['reader', 'author', 'admin'];
    if (!validRoles.includes(role)) {
      req.flash('error_msg', 'Invalid role selected');
      return res.redirect('/auth/register');
    }

    let user = await User.findOne({ email });
    if (user) {
      req.flash('error_msg', 'User already exists');
      return res.redirect('/auth/register');
    }
    user = new User({
      username,
      email,
      password,
      role
    });
    await user.save();
    req.flash('success_msg', 'Registration successful, please login');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error');
    res.redirect('/auth/register');
  }
});

// Login
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }
    console.log('User role on login:', user.role); // Debug log
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    req.login(user, { session: true }, (err) => {
      if (err) {
        console.error(err);
        req.flash('error_msg', 'Server error');
        return res.redirect('/auth/login');
      }
      res.set('Authorization', `Bearer ${token}`);
      req.flash('success_msg', 'Login successful');
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error');
    res.redirect('/auth/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      req.flash('error_msg', 'Error logging out');
      return res.redirect('/');
    }
    res.set('Authorization', '');
    req.flash('success_msg', 'Logged out successfully');
    res.redirect('/auth/login');
  });
});

module.exports = router;