var express = require('express');
var router = express.Router();
const isLoggedIn = require("../helpers/util");
var moment = require("moment");

/* GET users listing. */
module.exports = (pool) => {

  router.get('/datatable', async (req, res) => {
    let params = [];
  
    if (req.query.search.value) {
      params.push(`string ilike '%${req.query.search.value}%'`);
    }
    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;
  
    // Perform a join to fetch the operator's name
    const query = `
      SELECT purchases.*, users.name AS operatorname
      FROM purchases
      LEFT JOIN users ON purchases.operator = users.userid
      ${params.length > 0 ? `WHERE ${params.join(' OR ')}` : ''}
      ORDER BY ${sortBy} ${sortMode}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  
    try {
      const total = await pool.query(`SELECT COUNT(*) AS total FROM purchases ${params.length > 0 ? `WHERE ${params.join(' OR ')}` : ''}`);
      const data = await pool.query(query);
  
      const response = {
        "draw": Number(req.query.draw),
        "recordsTotal": total.rows[0].total,
        "recordsFiltered": total.rows[0].total,
        "data": data.rows.map((row) => ({
          ...row,
          operator: row.operatorname, // Replace the operator id with the operator name
        })),
      };
      res.json(response);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Error fetching data from the database." });
    }
  });
  


  router.get('/', isLoggedIn,  function (req, res, next) {
    const stockAlert = req.session.stockAlert;
    const name = req.session.user?.name;
    const { userid } = req.session.user;
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


  router.get("/add", (req, res) => {
    const { userid } = req.session.user;
    const stockAlert = req.session.stockAlert;
    const name = req.session.user?.name;
  
    pool.query(
      "INSERT INTO purchases (invoice, totalsum, operator) VALUES (purchasesinvoice(), 0, $1) RETURNING *",
      [userid],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        const invoiceNumber = data.rows[0].invoice;
        res.redirect(`/purchases/${invoiceNumber}`);
      }
    );
  });
  
  router.get("/:invoice", (req, res) => {
    const { userid } = req.session.user;
    const { invoice } = req.params;
    const name = req.session.user?.name;
  
    pool.query(
      "SELECT * FROM purchases WHERE invoice = $1",
      [invoice],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        pool.query(
          "SELECT * FROM users WHERE userid = $1",
          [userid],
          (err, items) => {
            if (err) {
              console.log(err);
            }
            pool.query("SELECT * FROM goods", (err, datagoods) => {
              if (err) {
                console.log(err);
              }
              pool.query("SELECT * FROM suppliers", (err, datasupply) => {
                if (err) {
                  console.log(err);
                }
                res.render("addpurchases", {
                  data: item.rows[0],
                  dataa: items.rows[0],
                  moment,
                  datagood: datagoods.rows,
                  datasupply: datasupply.rows,
                  user: req.session.user,
                  name : name
                });
              });
            });
          }
        );
      }
    );
  });

router.get("/get/:barcode", (req,res) => {
  const {barcode} = req.params;
  pool.query("select * from goods where barcode = $1",
[barcode],
(err,item) => {
  if(err){
    console.log(err);
  }
  res.json(item.rows);
}
  )
})


  

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

  router.post("/add/items", (req, res) => {
    const purchasePrice = parseFloat(
      req.body.purchasepricegoods.replace(/[^0-9.-]+/g, "")
    );
    const totalprice = parseFloat(
      req.body.totalprice.replace(/[^0-9.-]+/g, "")
    );
    pool.query(
      "insert into purchaseitems (invoice, itemcode, quantity, purchaseprice, totalprice) values ($1, $2, $3, $4, $5) returning *",
      [
        req.body.invoice,
        req.body.barcode,
        req.body.qtygoods,
        purchasePrice,
        totalprice,
      ],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        res
          .status(200)
          .json({ message: "Data berhasil dimasukkan ke database." });
      }
    );
  });

  router.post("/add/purchases", (req, res) => {
    const invoice = req.body.invoice;
    const formattedValue = req.body.totalsum.replace(/[^0-9.,-]/g, ""); // Menghapus karakter selain angka, koma, dan tanda minus
    const totalsum = parseFloat(formattedValue.replace(",", "")); // Menghapus koma sebagai pemisah ribuan

    const { supply } = req.body;
    const { userid } = req.session.user;
    pool.query(
      "update purchases set totalsum = $1, supplier = $2, operator = $3 WHERE invoice = $4",
      [totalsum, supply, userid, invoice],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        pool.query("SELECT * FROM goods", (err, goodsData) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .json({ message: "Terjadi kesalahan pada server." });
          }
          // Menyimpan data stok ke dalam session
          const stockAlert = goodsData.rows.filter((item) => item.stock < 5);
          req.session.stockAlert = stockAlert;
          res.redirect("/purchases");
        });
      }
    );
  });

  router.get("/edit/:invoice", isLoggedIn, (req, res) => {
    const { invoice } = req.params;
    const { userid } = req.session.user;
    const stockAlert = req.session.stockAlert;
    const name = req.session.user?.name;
    pool.query(
      "select * from purchases where invoice = $1",
      [invoice],
      (err, item) => {
        pool.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            pool.query("select * from goods", (err, datagoods) => {
              pool.query("select * from suppliers", (err, datasupply) => {
                pool.query("select * from purchaseitems", (err, itempurchase) => {
                  res.render("addpurchases", {
                    data: item.rows[0],
                    dataa: items.rows[0],
                    moment,
                    datagood: datagoods.rows,
                    datasupply: datasupply.rows,
                    itemspurchase: itempurchase.rows[0],
                    user: req.session.user,
                    stockAlert,
                    name : name
                  });
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/get/edit/item/:invoice", (req, res) => {
    const { invoice } = req.params;
    pool.query(
      "SELECT purchaseitems.*, goods.name FROM purchaseitems LEFT JOIN goods ON purchaseitems.itemcode = goods.barcode WHERE purchaseitems.invoice = $1 ORDER BY purchaseitems.id",
      [invoice],
      (err, itempurchase) => {
        if (err) {
          console.log(err);
        }
        res.json(itempurchase.rows);
      }
    );
  });

  router.get("/deleteitems/:id", (req, res) => {
    const { id } = req.params;
    pool.query(
      "SELECT invoice FROM purchaseitems WHERE id = $1",
      [id],
      (err, result) => {
        if (err) {
          console.log(err);
        }

        const invoice = result.rows[0].invoice;
        pool.query(
          "delete from purchaseitems where id = $1",
          [id],
          (err, itempurchase) => {
            if (err) {
              console.log(err);
            }
            pool.query("SELECT * FROM goods", (err, datagoods) => {
              if (err) {
                console.log(err);
                return res
                  .status(500)
                  .json({ message: "Terjadi kesalahan pada server." });
              }

              // Menyimpan data stok ke dalam session
              const stockAlert = datagoods.rows.filter(
                (item) => item.stock < 5
              );
              req.session.stockAlert = stockAlert;
              res.redirect(`/purchase/edit/${invoice}`);
            });
          }
        );
      }
    );
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    pool.query("delete from purchaseitems where invoice = $1", [id], (err) => {
      if (err) {
        console.log("hapus data purchase item gagal");
      }
      pool.query("delete from purchases where invoice = $1", [id], (err) => {
        if (err) {
          console.log("hapus data purchase gagal");
        }
        pool.query("SELECT * FROM goods", (err, goodsData) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .json({ message: "Terjadi kesalahan pada server." });
          }

          // Menyimpan data stok ke dalam session
          const stockAlert = goodsData.rows.filter((item) => item.stock < 5);
          req.session.stockAlert = stockAlert;
          res.redirect("/purchases");
        });
      });
    });
  });

  return router;
};


