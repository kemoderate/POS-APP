var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });

// 2023060701621 barcode
/* GET goods listing. */
module.exports = (pool) => {

  router.get('/datatable', async (req, res) => {
    let params = []

    if (req.query.search.value) {
      params.push(`name ILIKE '%${req.query.search.value}%'`)
    }
    const limit = req.query.length
    const offset = req.query.start
    const sortBy = req.query.columns[req.query.order[0].column].data
    const sortMode = req.query.order[0].dir

    const total = await pool.query(`SELECT COUNT(*) AS total FROM goods ${params.length > 0 ? `WHERE ${params.join(' OR ')}` : ''}`)
    const data = await pool.query(`SELECT * FROM goods ${params.length > 0 ? `WHERE ${params.join(' OR ')}` : ''} ORDER BY ${sortBy} ${sortMode} LIMIT ${limit} OFFSET ${offset}`)

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
    const name = req.session.user?.name; // Replace this with your actual logic to retrieve the user's name
    let sql = 'SELECT * FROM goods';

    pool.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        next(err); // Pass the error to the error handler
      } else {
        res.render('goods', {
          title: 'Goods',
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
        next(err); // Pass the error to the error handler
      } else {
        res.render('addgoods', {
          title: 'Goods Add',
          data: {},
          item: result.rows,
          name: name,
          error: req.flash("error"),
        });
      }
    });
  });

  router.post('/add', upload.single('picture'), (req, res) => {
    const { barcode, name, stock, purchaseprice, sellingprice, unit } = req.body;
    let picture = req.file ? req.files.picture : null; // Get the filename of the uploaded picture
    pictureName = `${Date.now()}-${picture.name}`;
    let uploadPath = path.join(
      __dirname,
      "..",
      "public",
      "images",
      "pictures",
      pictureName
    );
    picture.mv(uploadPath, function (err) {
      if (err) return res.status(500).send(err);

    pool.query('INSERT INTO goods (barcode, name, stock, purchaseprice, sellingprice, unit, picture) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
    [barcode, name, stock, purchaseprice, sellingprice, unit, pictureName], (err, result) => {
      if (err) {
        console.error('Error inserting goods:', err);
        res.sendStatus(500); // Respond with an appropriate status code indicating the failure
      } else {
        console.log('Goods added successfully');
        res.redirect('/goods');
      }
    });
    });
  });

  router.get('/edit/:barcode', function (req, res, next) {
    const barcode = req.params.barcode;
    const name = req.session.user?.name;

    // Fetch the goods data from the database based on the barcode
    pool.query('SELECT * FROM goods WHERE barcode = $1', [barcode], (error, result) => {
      if (error) {
        console.error('Error retrieving goods data:', error);
        next(error); // Pass the error to the error handler
      } else {
        const goods = result.rows[0];
        let sql = `SELECT * FROM goods`;

        pool.query(sql, (err, unitResult) => {
          if (err) {
            console.error(err);
            next(err); // Pass the error to the error handler
          } else {
            res.render('addgoods', { title: 'Edit Goods', goods: goods, units: unitResult.rows, name: name });
          }
        });
      }
    });
  });

  router.post('/edit/:barcode', upload.single('picture'), (req, res, next) => {
    const barcode = req.params.barcode;
    const { name, stock, purchaseprice, sellingprice, unit } = req.body;
    const picture = req.file ? req.file.filename : null; // Get the filename of the uploaded picture

    pool.query(
      'UPDATE goods SET name = $1, stock = $2, purchaseprice = $3, sellingprice = $4, unit = $5, picture = $6 WHERE barcode = $7',
      [name, stock, purchaseprice, sellingprice, unit, picture, barcode],
      (error, result) => {
        if (error) {
          console.error('Error updating goods data:', error);
          res.sendStatus(500); // Respond with an appropriate status code indicating the failure
        } else {
          console.log('Goods updated successfully');
          res.redirect('/goods');
        }
      }
    )
  })

  router.get('/delete/:barcode', (req, res) => {
    const barcode = req.params.barcode;

    pool.query('DELETE FROM goods WHERE barcode = $1', [barcode], (err, result) => {
      if (err) {
        console.error('Error deleting goods:', err);
        res.sendStatus(500); // Respond with an appropriate status code indicating the failure
      } else {
        console.log('Goods deleted successfully');
        res.redirect('/goods'); // Redirect to the goods list page after deletion
      }
    });
  });

  return router;
}
