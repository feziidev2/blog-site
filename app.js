const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const authRoutes = require('./routes/auth'); // Line 9
const blogRoutes = require('./routes/blog');
const commentRoutes = require('./routes/comment');

// Load environment variables
dotenv.config();

// Validate JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET is not defined in .env file');
  process.exit(1);
}

// Initialize Passport
require('./config/passport');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Session and Flash
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Global variables for flash messages
app.use((req, res, next) => {
  console.log('res.locals.user:', req.user); // Debug log
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.user || null;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/blogs', blogRoutes);
app.use('/comments', commentRoutes);

// Home Route
app.get('/', async (req, res) => {
  try {
    const blogs = await mongoose.model('Blog').find().populate('author');
    res.render('blog/all', { blogs });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error loading blogs');
    res.render('blog/all', { blogs: [] });
  }
});

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));