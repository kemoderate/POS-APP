var express = require('express');
var router = express.Router();
const saltRounds = 10;

/* GET users listing. */
module.exports = (pool) => {
  
  router.get('/datatable', async (req, res) => {
    let params = []

    if(req.query.search.value){
        params.push(`name ilike '%${req.query.search.value}%'`)
    }
    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await pool.query(`select count(*) as total from users${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await pool.query(`select * from users${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
    
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
   let sql = 'select * from users';
    
   pool.query(sql, (err, result) => {
    if (err) {
      console.error(err);
    } else {
      res.render('user', {
        title: 'User Profile',
        data: result.rows,
        name: name
      });
    }
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
          name: name,
          renderFrom : 'add'
        });
      }
    });
  });

  router.post('/add', async (req, res) => {
    const { email, name, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    pool.query('INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4)', [email, name, hashedPassword, role], (err, result) => {
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
        res.render('adduser', 
        { title: 'Edit User', 
        data: user, 
        name: name ,
        renderFrom : 'edit'
      });
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

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    pool.query("delete from users where userid = $1", [id], (err) => {
      if (err) {
        console.log("hapus data Goods gagal");
        req.flash("error", err.message);
        return res.redirect(`/`);
      }
      res.redirect("/goods");
    });
  });
  


  return router;
}
