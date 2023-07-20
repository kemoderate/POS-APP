var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const saltRounds = 10;



module.exports = (pool) => {
  function isLoggedIn(req, res, next) {
    if (req.session.authenticated) {
      next(); // User is authenticated, continue to the next middleware/route handler
    } else {
      res.redirect('/login'); // User is not authenticated, redirect to the login page
    }
  } 

  router.get('/login', function (req, res, next) {
    if (req.session.authenticated) {
      res.render('index', { title: 'index' });
    } else {
      res.render('login', { title: 'Dashboard', showLoginForm: true });
    }
  });

  router.post('/login', function (req, res, next) {
    const { email, password } = req.body;
    pool.query('SELECT * FROM users WHERE email = $1', [email], (error, result) => {
      if (error) {
        console.error('Error executing query', error);
        res.render('login', { title: 'Dashboard', showLoginForm: true, error: 'An error occurred. Please try again later.' });
      } else {
        if (result.rowCount === 1) {
          const user = result.rows[0];
          bcrypt.compare(password, user.password, (bcryptError, bcryptResult) => {
            if (bcryptError) {
              console.error('Error comparing passwords', bcryptError);
              res.render('login', { title: 'Dashboard', showLoginForm: true, error: 'An error occurred. Please try again later.' });
            } else {
              if (bcryptResult) {
                req.session.authenticated = true;
                req.session.user = user
                res.redirect('/');
              } else {
                res.render('login', { title: 'Dashboard', showLoginForm: true, error: 'Invalid email or password' });
              }
            }
          });
        } else {
          res.render('login', { title: 'Dashboard', showLoginForm: true, error: 'Invalid email or password' });
        }
      }
    });
  });

  router.get('/', isLoggedIn, (req, res) => {
    if (req.session.authenticated) {
      const userid = req.session.user;
      const name = req.session.user.name;
        res.render('index', { title: 'Dashboard', name: name });
    } else {
        res.render('index', { title: 'Dashboard', showLoginForm: true });
    }
});

  // Logout route
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session', err);
        return res.sendStatus(500);
      }
      res.redirect('/login');
    });
  });


  router.get('/register', function (req, res, next) {
    res.render('register', { title: 'Register' });
  });

  router.post('/register', async (req, res) => {
    const { email, name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
    try {
      await pool.query('INSERT INTO users (userid, email, name, password, role) VALUES ($1, $2, $3, $4, $5)', [userid, email, name, hashedPassword, 'operator' || 'admin']);
      res.redirect('/');
    } catch (error) {
      console.error('Error inserting user:', error);
      res.render('register', { title: 'Register', error: 'Error registering user' });
    }
  });

  return router;
}

// module.exports = router;
