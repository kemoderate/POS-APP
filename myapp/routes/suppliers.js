var express = require('express');
var router = express.Router();

module.exports = (pool) => {

    router.get("/datatable", async (req, res) => {
        let params = [];
        if (req.query.search.value) {
            const searchValue = req.query.search.value;
            params.push(`supplierid ILIKE '%${searchValue}%'`);
            params.push(`name ILIKE '%${searchValue}%'`);
            params.push(`address ILIKE '%${searchValue}%'`);
            // casting, changing the stock from integer into string
            params.push(`phone ILIKE '%${searchValue}%'`);
        }

        const limit = req.query.length;
        const offset = req.query.start;
        const sortBy = req.query.columns[req.query.order[0].column].data;
        const sortMode = req.query.order[0].dir;

        const total = await pool.query(
            `select count(*) as total from suppliers${params.length > 0 ? ` where ${params.join(" or ")}` : ""
            }`
        );
        const data = await pool.query(
            `select * from suppliers${params.length > 0 ? ` where ${params.join(" or ")}` : ""
            } order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
        );
        const response = {
            draw: Number(req.query.draw),
            recordsTotal: total.rows[0].total,
            recordsFiltered: total.rows[0].total,
            data: data.rows,
        };
        res.json(response);
    });


    router.get('/', function (req, res, next) {
        pool.query('SELECT * FROM suppliers', (err, result) => {
            const name = req.session.user?.name;
            if (err) {
                console.error(err);
                // Handle the error, e.g., render an error page
            } else {
                res.render('suppliers', {
                    title: 'Suppliers Profile',
                    data: result.rows,
                    name : name,
                    error: req.flash("error"),
                });
            }
        });
    });

    router.get('/add', (req, res, next) => {
        const name = req.session.user?.name;
        const data = {}; // Initialize an empty object for data
        res.render('addsuppliers', {
          title: 'Add Suppliers',
          name: name,
          error: req.flash("error"),
          data: data, // Pass the data object to the EJS template
          renderFrom: "add",
        });
      });

    router.post('/add', (req, res) => {
        const { name, address, phone } = req.body;
        pool.query(
            'INSERT INTO suppliers (name, address, phone) VALUES ($1, $2, $3)',
            [name, address, phone],
            (err, result) => {
                if (err) {
                    console.error('Error inserting suppliers:', err);
                    // Handle the error, e.g., render an error page
                } else {
                    console.log('Suppliers added successfully');
                    res.redirect('/suppliers');
                }
            }
        );
    });

    router.get('/edit/:supplierid', function (req, res, next) {
        const suppliersId = req.params.supplierid;
        const name = req.session.user?.name;
        pool.query('SELECT * FROM suppliers WHERE supplierid = $1', [suppliersId], (error, result) => {
            if (error) {
                console.error('Error retrieving suppliers data:', error);
                // Handle the error and render an error page
            } else {
                const suppliers = result.rows[0];
                res.render('addsuppliers', { title: 'Edit Suppliers', data: suppliers, name : name, error: req.flash("error"), renderFrom: "edit", });
            }
        });
    });

    router.post('/edit/:supplierid', (req, res, next) => {
        const suppliersId = req.params.supplierid;
        const { name, address, phone } = req.body;

        pool.query(
            'UPDATE suppliers SET name = $1, address = $2, phone = $3 WHERE supplierid = $4',
            [name, address, phone, suppliersId],
            (error, result) => {
                if (error) {
                    console.error('Error updating suppliers data:', error);
                    // Handle the error and render an error page
                } else {
                    console.log('Suppliers updated successfully');
                    res.redirect('/suppliers');
                }
            }
        );
    });

    router.get('/delete/:supplierid', (req, res) => {
        const suppliersId = req.params.supplierid;
        pool.query('DELETE FROM suppliers WHERE supplierid = $1', [suppliersId], (err, result) => {
            if (err) {
                console.error('Error deleting suppliers:', err);
                res.sendStatus(500); // Respond with an appropriate status code indicating the failure
            } else {
                console.log('Suppliers deleted successfully');
                res.redirect('/suppliers'); // Redirect to the suppliers list page after deletion
            }
        });
    });

    return router;
}
