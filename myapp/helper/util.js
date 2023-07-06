

export function requireAuth(req, res, next) {
    if (req.session.authenticated) {
      next(); // User is authenticated, continue to the next middleware/route handler
    } else {
      res.redirect('/login'); // User is not authenticated, redirect to the login page
    }
  }