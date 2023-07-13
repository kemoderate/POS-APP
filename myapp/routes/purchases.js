var express = require('express');
var router = express.Router();
const isLoggedIn = require("../helpers/util");
var moment = require("moment");

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

    const total = await pool.query(`select count(*) as total from purchases${params.length > 0 ? ` where ${params.join(' or ')}` : ''}`)
    const data = await pool.query(`select * from purchases${params.length > 0 ? ` where ${params.join(' or ')}` : ''} order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `)
    
    const response = {
        "draw": Number(req.query.draw),
        "recordsTotal": total.rows[0].total,
        "recordsFiltered": total.rows[0].total,
        "data": data.rows
      }
    res.json(response)
})



router.get('/', isLoggedIn, function (req, res, next) {
  const stockAlert = req.session.stockAlert;
  const name = req.session.user?.name;
  pool.query("SELECT * FROM purchases", (err, data) => {
    if (err) {
      console.log(err);
    }
    res.render('purchases', {
      data: data.rows,
      user: req.session.user,
      stockAlert,
      error: req.flash("error"),
      name: name
    });
  });
});


router.get("/add", isLoggedIn, (req, res) => {
  const stockAlert = req.session.stockAlert;
  const name = req.session.user?.name;
  pool.query("select * from units", (err, data) => {
  res.render("addpurchases", {
    data: {},
    dataunit : data.rows,
    renderFrom: "add",
    user: req.session.user,
    stockAlert,
    error: req.flash("error"),
    name: name,
    moment,
  });
});
});

router.post("/add", (req, res) => {
  const { invoice, time, totalsum, supplierid, operator } = req.body;
  pool.query(
    "INSERT INTO purchases (invoice, time, totalsum, supplierid, operator) VALUES ($1, $2, $3, $4, $5)",
    [invoice, time, totalsum, supplierid, operator],
    (err, data) => {
      if (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("/purchases/add");
      }
      res.redirect("/purchases");
    }
  );
});

router.get("/edit/:invoice", isLoggedIn, (req, res) => {
  const invoiceId = req.params.invoice;
  const stockAlert = req.session.stockAlert;
  const name = req.session.user?.name;
  pool.query("SELECT * FROM purchases WHERE invoice = $1", [invoiceId], (err, items) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/purchases");
    }
    res.render("addpurchases", {
      data: items.rows[0],
      renderFrom: "edit",
      user: req.session.user,
      stockAlert,
      error: req.flash("error"),
      name: name,
      moment,
    });
  });
});

router.post("/edit/:invoice", (req, res) => {
  const invoiceId = req.params.invoice;
  const { invoice, time, totalsum, supplierid, operator } = req.body;
  pool.query(
    "UPDATE purchases SET invoice = $1, time = $2, totalsum = $3, supplierid = $4, operator = $5 WHERE invoice = $6",
    [invoice, time, totalsum, supplierid, operator, invoiceId],
    (err, data) => {
      if (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect(`/purchases/edit/${invoiceId}`);
      }
      res.redirect("/purchases");
    }
  );
});

router.get("/delete/:invoice", (req, res) => {
  const invoice = req.params.invoice;
  pool.query("DELETE FROM purchases WHERE invoice = $1", [invoice], (err) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/purchases");
    }
    res.redirect("/purchases");
  });
});

return router;
};

