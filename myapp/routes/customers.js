var express = require('express');
var router = express.Router();

module.exports = (pool) => {

    router.get("/datatable", async (req, res) => {
        let params = [];
        if (req.query.search.value) {
            const searchValue = req.query.search.value;
            params.push(`customerid ILIKE '%${searchValue}%'`);
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
            `select count(*) as total from customers${params.length > 0 ? ` where ${params.join(" or ")}` : ""
            }`
        );
        const data = await pool.query(
            `select * from customers${params.length > 0 ? ` where ${params.join(" or ")}` : ""
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
        pool.query('SELECT * FROM customers', (err, result) => {
            const name = req.session.user?.name;
            if (err) {
                console.error(err);
                // Handle the error, e.g., render an error page
            } else {
                res.render('customers', {
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
        res.render('addcustomers', {
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
            'INSERT INTO customers (name, address, phone) VALUES ($1, $2, $3)',
            [name, address, phone],
            (err, result) => {
                if (err) {
                    console.error('Error inserting customers:', err);
                    // Handle the error, e.g., render an error page
                } else {
                    console.log('Suppliers added successfully');
                    res.redirect('/customers');
                }
            }
        );
    });

    router.get('/edit/:customerid', function (req, res, next) {
        const customersId = req.params.customerid;
        const name = req.session.user?.name;
        pool.query('SELECT * FROM customers WHERE customerid = $1', [customersId], (error, result) => {
            if (error) {
                console.error('Error retrieving customers data:', error);
                // Handle the error and render an error page
            } else {
                const customers = result.rows[0];
                res.render('addcustomers', { title: 'Edit Suppliers', data: customers, name : name, error: req.flash("error"), renderFrom: "edit", });
            }
        });
    });

    router.post('/edit/:customerid', (req, res, next) => {
        const customersId = req.params.customerid;
        const { name, address, phone } = req.body;

        pool.query(
            'UPDATE customers SET name = $1, address = $2, phone = $3 WHERE customerid = $4',
            [name, address, phone, customersId],
            (error, result) => {
                if (error) {
                    console.error('Error updating customers data:', error);
                    // Handle the error and render an error page
                } else {
                    console.log('Suppliers updated successfully');
                    res.redirect('/customers');
                }
            }
        );
    });

    router.get('/delete/:customerid', (req, res) => {
        const customersId = req.params.customerid;
        pool.query('DELETE FROM customers WHERE customerid = $1', [customersId], (err, result) => {
            if (err) {
                console.error('Error deleting customers:', err);
                res.sendStatus(500); // Respond with an appropriate status code indicating the failure
            } else {
                console.log('Suppliers deleted successfully');
                res.redirect('/customers'); // Redirect to the customers list page after deletion
            }
        });
    });

    return router;
}
