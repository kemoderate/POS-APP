var express = require('express');
var router = express.Router();

/* GET users listing. */
module.exports = (pool) => {
  
  router.get('/datatable', async (req, res) => {
    let params = []

    if(req.query.search.value){
        params.push(`string ilike '%${req.query.search.value}%'`)
    }
    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await pool.query(`select count(*) as total from units${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await pool.query(`select * from units${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
    
    const response = {
        "draw": Number(req.query.draw),
        "recordsTotal": total.rows[0].total,
        "recordsFiltered": total.rows[0].total,
        "data": data.rows
      }
    res.json(response)
})


  router.get('/', function (req, res, next) {
    // Retrieve the user's name from the session or database
    const name = req.session.user?.name; // Replace this wi th your actual logic to retrieve the user's name
   let sql = 'select * from units';
    
   pool.query(sql, (err, result) => {
    if (err) {
      console.error(err);
    } else {
      res.render('units', {
        title: 'User Profile',
        data: result.rows,
        name: name
      });
    }
  });
});

  router.get('/add', (req, res, next) => {
    const name = req.session.user?.name;

    let sql = `SELECT * FROM units`;

    pool.query(sql, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        res.render('addunits', {
          title: 'User Add',
          data: result.rows,
          name: name
        });
      }
    });
  });

  router.post('/add', (req, res) => {
    const { unit, name, note } = req.body;
    pool.query('INSERT INTO units (unit, name, note) VALUES ($1, $2, $3)', [unit, name, note], (err, result) => {
      if (err) {
        console.error('Error inserting unit:', err);
        // Handle the error, e.g., render an error page
      } else {
        console.log('Unit added successfully');
        res.redirect('/units');
      }
    });
  });


  router.get('/edit/:userid', function (req, res, next) {
    const unitId = req.params.unit;
    const name = req.session.user?.name;
  
    // Fetch the user data from the database based on the userid
    pool.query('SELECT * FROM units WHERE unit = $1', [unitId], (error, result) => {
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
    const unitId = req.params.unit
    const { unit, name, note, } = req.body

    pool.query(
      'UPDATE units SET unit = $1, name = $2, note = $3 WHERE unit = $4',
      [unit, name, note, unitId],
      (error, result) => {
        if (error) {
          console.error('Error updating user data:', error);
          // Handle the error and render an error page
        } else {
          // Redirect to the user list page or any other appropriate page
          res.redirect('/units');
        }
      }
    )
  })


  router.get('/delete/:userid', (req, res) => {
    const userid = req.params.userid;

    pool.query('DELETE FROM units WHERE userid = $1', [userid], (err, result) => {
      if (err) {
        console.error('Error deleting user:', err);
        res.sendStatus(500); // Respond with an appropriate status code indicating the failure
      } else {
        console.log('User deleted successfully');
        res.redirect('/units'); // Redirect to the user list page after deletion
      }
    });
  });


  return router;
}
