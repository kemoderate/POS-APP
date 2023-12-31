var express = require('express');
var router = express.Router();
const isLoggedIn = require("../helpers/util");

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


router.get('/', isLoggedIn, function (req, res, next) {
  const stockAlert = req.session.stockAlert;
  const name = req.session.user?.name;
  pool.query("SELECT * FROM units", (err, data) => {
    if (err) {
      console.log(err);
    }
    res.render('units', {
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
  res.render("addunits", {
    data: {},
    renderFrom: "add",
    user: req.session.user,
    stockAlert,
    error: req.flash("error"),
    name: name,
  });
});

router.post("/add", (req, res) => {
  const { unit, name, note } = req.body;
  pool.query(
    "INSERT INTO units (unit, name, note) VALUES ($1, $2, $3)",
    [unit, name, note],
    (err, data) => {
      if (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect("/units/add");
      }
      res.redirect("/units");
    }
  );
});

router.get("/edit/:unit", isLoggedIn, (req, res) => {
  const unitId = req.params.unit;
  const stockAlert = req.session.stockAlert;
  const name = req.session.user?.name;
  pool.query("SELECT * FROM units WHERE unit = $1", [unitId], (err, items) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/units");
    }
    res.render("addunits", {
      data: items.rows[0],
      renderFrom: "edit",
      user: req.session.user,
      stockAlert,
      error: req.flash("error"),
      name: name,
    });
  });
});

router.post("/edit/:unit", (req, res) => {
  const unitId = req.params.unit;
  const { unit, name, note } = req.body;
  pool.query(
    "UPDATE units SET unit = $1, name = $2, note = $3 WHERE unit = $4",
    [unit, name, note, unitId],
    (err, data) => {
      if (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect(`/units/edit/${unitId}`);
      }
      res.redirect("/units");
    }
  );
});

router.get("/delete/:id", (req, res) => {
  const id = req.params.id;
  pool.query("DELETE FROM units WHERE unit = $1", [id], (err) => {
    if (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/units");
    }
    res.redirect("/units");
  });
});

return router;
};

