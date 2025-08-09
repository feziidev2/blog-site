const passport = require('passport');

const protect = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  passport.authenticate('jwt', { session: true }, (err, user) => {
    if (err) {
      console.error('Auth error:', err);
      req.flash('error_msg', 'Please log in to access this resource');
      return res.redirect('/auth/login');
    }
    if (!user) {
      req.flash('error_msg', 'Please log in to access this resource');
      return res.redirect('/auth/login');
    }
    req.user = user;
    next();
  })(req, res, next);
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash('error_msg', 'You do not have permission to perform this action');
      return res.redirect('/');
    }
    next();
  };
};

module.exports = { protect, restrictTo };