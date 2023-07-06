var express = require('express');
var router = express.Router();

/* GET users listing. */
module.exports = (pool) => {

  router.get('/', function (req, res, next) {
    // Retrieve the user's name from the session or database
    const name = req.session.user?.name; // Replace this wi th your actual logic to retrieve the user's name

    const params = [];
    let sortBy = req.query.sortby || 'userid';
    let sortDir = req.query.sortorder || 'asc';

    if (req.query.checkUserid && req.query.userid) {
      params.push(`userid = ${req.query.userid}`);
    }
    if (req.query.checkStr && req.query.string) {
      params.push(`string ILIKE '%${req.query.string}%'`);
    }
    if (req.query.checkInt && req.query.integer) {
      params.push(`integer = ${req.query.integer}`);
    }
    if (req.query.checkFloat && req.query.float) {
      params.push(`float = ${req.query.float}`);
    }
    if (req.query.checkDate && req.query.startDate && req.query.endDate) {
      params.push(`date BETWEEN '${req.query.startDate}' AND '${req.query.endDate}'`);
    }
    if (req.query.checkBol && req.query.boolean) {
      params.push(`boolean = '${req.query.boolean}'`);
    }

    let sqlCount = `SELECT COUNT(*) as total FROM users`;
    if (params.length > 0) {
      sqlCount += ` WHERE ${params.join(' AND ')}`;
    }

    pool.query(sqlCount, [], (err, count) => {
      const rows = count.rows[0].total;
      const page = req.query.page || 1;
      const limit = 3;
      const offset = (page - 1) * limit;
      const pages = Math.ceil(rows / limit);
      // Remove duplicate url for sortby and sortorder parameters using urlsearchparams
      const queryParams = new URLSearchParams(req.query);
      queryParams.delete('sortby');
      queryParams.delete('sortorder');
      queryParams.set('page', '1');
      const url = `${req.path}?${queryParams.toString()}`;
      console.log(url)
      let sql = `SELECT * FROM users`;
      if (params.length > 0) {
        sql += ` WHERE ${params.join(' AND ')}`;
      }
      sql += ` ORDER BY ${sortBy} ${sortDir} LIMIT ${limit} OFFSET ${offset};`;

      pool.query(sql, (err, row) => {
        if (err) {
          console.error(err);
        } else {
          res.render('user', {
            title: 'User Profile',
            data: row.rows,
            page: page,
            pages: pages,
            url: url,
            query: req.query,
            sortBy: sortBy,
            sortDir: sortDir,
            name: name
          });
        }
      });
    });
  });

  router.get('/add', (req, res, next) => {
    const name = req.session.user?.name;

    let sql = `SELECT * FROM users`;

    pool.query(sql, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        res.render('adduser', {
          title: 'User Add',
          data: result.rows,
          name: name
        });
      }
    });
  });

  router.post('/add', (req, res) => {
    const { email, name, password, role } = req.body;
    pool.query('INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4)', [email, name, password, role], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        // Handle the error, e.g., render an error page
      } else {
        console.log('User added successfully');
        res.redirect('/users');
      }
    });
  });


  router.get('/edit/:userid', function (req, res, next) {
    const userid = req.params.userid;
    const name = req.session.user?.name;
  
    // Fetch the user data from the database based on the userid
    pool.query('SELECT * FROM users WHERE userid = $1', [userid], (error, result) => {
      if (error) {
        console.error('Error retrieving user data:', error);
        // Handle the error and render an error page
      } else {
        const user = result.rows[0];
        res.render('adduser', { title: 'Edit User', data: user, name: name });
      }
    });
  });

  router.post('/edit/:userid', (req, res, next) => {
    const userId = req.params.userid
    const { email, name, password, role } = req.body

    pool.query(
      'UPDATE users SET email = $1, name = $2, password = $3, role = $4 WHERE userid = $5',
      [email, name, password, role, userId],
      (error, result) => {
        if (error) {
          console.error('Error updating user data:', error);
          // Handle the error and render an error page
        } else {
          // Redirect to the user list page or any other appropriate page
          res.redirect('/users');
        }
      }
    )
  })


  router.get('/delete/:userid', (req, res) => {
    const userid = req.params.userid;

    pool.query('DELETE FROM users WHERE userid = $1', [userid], (err, result) => {
      if (err) {
        console.error('Error deleting user:', err);
        res.sendStatus(500); // Respond with an appropriate status code indicating the failure
      } else {
        console.log('User deleted successfully');
        res.redirect('/users'); // Redirect to the user list page after deletion
      }
    });
  });


  return router;
}
