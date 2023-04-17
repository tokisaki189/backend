const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const con = require("./connect");
const cookieParser = require("cookie-parser");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const PORT = process.env.PORT || 3002;
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "flightapp.bot@gmail.com",
    pass: "lkfqlkzcaasjnmcw",
  },
});
app.use(cookieParser());
app.use(express.static("server"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);
app.listen(PORT, function () {
  console.log(`Server is running on localhost:${PORT}`);
});
con.connect(function (err) {});
app.get("/showuser", function (req, res) {
  con.query("SELECT * FROM users", function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/cities", function (req, res) {
  con.query("SELECT * FROM cities", function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.post("/flightsearch", function (req, res) {
  let departure = req.body.departure;
  let arrival = req.body.arrival;
  let querysearch = `SELECT *, f.flight_id, f.planes,  c1.city_name as departure_city, c2.city_name as arrival_city
FROM flights f
JOIN cities c1 ON f.departure_city_id = c1.city_id
JOIN cities c2 ON f.arrival_city_id = c2.city_id
WHERE c1.city_name = ? AND c2.city_name = ? ORDER BY departure_date ASC;`;
  con.query(querysearch, [departure, arrival], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.post("/sort/:id", function (req, res) {
  let departure = req.body.departure;
  let arrival = req.body.arrival;
  let querysearch = `SELECT *, f.flight_id, f.planes,  c1.city_name as departure_city, c2.city_name as arrival_city
FROM flights f
JOIN cities c1 ON f.departure_city_id = c1.city_id
JOIN cities c2 ON f.arrival_city_id = c2.city_id
WHERE c1.city_name = ? AND c2.city_name = ? ORDER BY departure_date ASC;`;
  con.query(querysearch, [departure, arrival], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/flights", function (req, res) {
  let query =
    "SELECT *, flights.flight_id, departure_city.city_name AS departure_city, arrival_city.city_name AS arrival_city FROM flights JOIN cities AS departure_city ON flights.departure_city_id = departure_city.city_id JOIN cities AS arrival_city ON flights.arrival_city_id = arrival_city.city_id ORDER BY date_added DESC;";
  con.query(query, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

app.post(
  "/api/register",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("firstname")
      .notEmpty()
      .withMessage("Please enter a first name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("First name cannot contain special characters"),
    body("lastname")
      .not()
      .isEmpty()
      .withMessage("Please enter a last name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("Last name cannot contain special characters"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("username")
      .isLength({ min: 6 })
      .withMessage("Username must be at least 6 characters long")
      .matches(/^[^!@#$%^&*()_+\-=\[\]{}\\|;':",.\/<>?\s]+$/)
      .withMessage("Username cannot contain special characters"),
  ],
  function (req, res) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      let errorArray = result.array().map((error) => error.msg);
      res.json({ message: errorArray });
    } else {
      let newEmail = req.body.email;
      let newFirstName = req.body.firstname;
      let newLastName = req.body.lastname;
      let newPassword = req.body.password;
      let newUserName = req.body.username;
      let queryInsert =
        "INSERT INTO users (username, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)";
      let queryCompare = `SELECT * FROM users WHERE username= ? OR email = ?`;
      con.query(
        queryCompare,
        [newUserName, newEmail],
        (error, results, fields) => {
          if (error) throw error;
          if (results.length > 0) {
            results.forEach((result) => {
              if (result.username === newUserName) {
                res.json({
                  message: [`Username ${newUserName} already exists`],
                });
              } else if (result.email === newEmail) {
                res.json({
                  message: [`Email ${newEmail} has already ben registered`],
                });
              }
            });
          } else {
            res.json({ message: ["Sucessfully created account"] });
            con.query(
              queryInsert,
              [newUserName, newFirstName, newLastName, newEmail, newPassword],
              function (err, results) {
                if (err) throw err;
              }
            );
            let mailOptions = {
              from: "wflightapp.bot@gmail.com",
              to: newEmail,
              subject: "Successfully created a new account",
              text: "Thank you for joining us",
            };
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log("Email sent: " + info.response);
              }
            });
          }
        }
      );
    }
  }
);

app.post("/addflight", function (req, res) {
  let plane = req.body.plane;
  let departureCity = req.body.departureCity;
  let arrivalCity = req.body.arrivalCity;
  let departureDate = req.body.departureDate;
  let arrivalDate = req.body.arrivalDate;
  let departureTime = req.body.departureTime;
  let arrivalTime = req.body.arrivalTime;
  let normalSeat = req.body.normalSeat;
  let normalPrice = req.body.normalPrice;
  let businessSeat = req.body.businessSeat;
  let businessPrice = req.body.businessPrice;
  if (
    !plane ||
    !departureCity ||
    !arrivalCity ||
    !departureDate ||
    !arrivalDate ||
    !departureTime ||
    !arrivalTime ||
    !normalSeat ||
    !normalPrice ||
    !businessSeat ||
    !businessPrice
  ) {
    // At least one variable is empty
    res.send("One or more parameters are empty");
  } else {
    con.query(
      "SELECT * FROM cities where city_name = ?",
      [departureCity],
      function (err, result) {
        if (err) throw err;
        const departureCityID = result[0].city_id;
        con.query(
          "SELECT * FROM cities where city_name = ?",
          [arrivalCity],
          function (err, result) {
            if (err) throw err;
            const arrivalCityID = result[0].city_id;
            let query = `
  INSERT INTO flights (
    planes,
    departure_city_id,
    arrival_city_id,
    departure_time,
    normal_seat,
    business_seat,
    normal_seat_price,
    business_seat_price,
    departure_date,
    arrival_date,
    arrival_time
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
            con.query(
              query,
              [
                plane,
                departureCityID,
                arrivalCityID,
                departureTime,
                normalSeat,
                businessSeat,
                normalPrice,
                businessPrice,
                departureDate,
                arrivalDate,
                arrivalTime,
              ],
              function (err, result) {
                if (err) throw err;
              }
            );
          }
        );
      }
    );
  }
});
app.get("/flight/:id", function (req, res) {
  console.log(req.params.id);
  let flightId = req.params.id;
  let query =
    "SELECT *, flights.flight_id, departure_city.city_name AS departure_city, arrival_city.city_name AS arrival_city FROM flights JOIN cities AS departure_city ON flights.departure_city_id = departure_city.city_id JOIN cities AS arrival_city ON flights.arrival_city_id = arrival_city.city_id WHERE flights.flight_id = ? ORDER BY date_added DESC;";
  con.query(query, [flightId], function (err, result) {
    if (err) throw err;
    res.send(result);
    console.log(result);
  });
});
app.get("/findEmail/:email", function (req, res) {
  let email = req.params.email;
  let query = `SELECT * FROM users WHERE email=?`;
  con.query(query, [email], function (err, result) {
    console.log(result[0].password);
    if (result.length > 0) {
      res.json({ message: "Check you email for password" });
      let mailOptions = {
        from: "flightapp.bot@gmail.com",
        to: email,
        subject: "Your password is here",
        html: `Be sure to remember your password next time, your password is: 
          <h1>${result[0].password}</h1>`,
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent to: " + email);
        }
      });
    } else {
      res.json({ message: "No such email is registered" });
    }
  });
});
app.delete("/deleteflight/:id", function (req, res, next) {
  console.log(req.params.id);
  let flightid = req.params.id;
  let orderquery = "DELETE FROM orders WHERE flight_id = ?;";
  let flightquery = "DELETE FROM flights WHERE flight_id = ?;";
  con.query(orderquery, [flightid], function (error, result) {
    if (error) throw error;
    con.query(flightquery, [flightid], function (error, result) {
      if (error) throw error;
      console.log("done xoa");
    });
  });
});
app.post("/api/login", function (req, res) {
  let loginCompare = `SELECT * FROM users WHERE username =? AND password =?`;
  let username = req.body.username;
  let password = req.body.password;
  con.query(loginCompare, [username, password], (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) {
      results.forEach((result) => {
        let token = jwt.sign(
          {
            id: result.id,
            isAdmin: result.isAdmin,
            exp: Math.floor(Date.now() / 1000) + 100000,
          },
          "secretkey"
        );
        res.json({
          notification: `Khop thong tin, dang login`,
          token: token,
          isLogin: true,
        });
      });
    } else {
      res.json({
        notification: "Khong khop thong tin, vui long thu lai",
        isLogin: false,
      });
    }
  });
});

app.get(
  "/check",
  function (req, res, next) {
    try {
      let token = req.cookies.token;
      let result = jwt.verify(token, "secretkey");
      if (result) {
        next();
      }
    } catch (errors) {
      return res.json({ message: "chua login" });
    }
  },
  (req, res, next) => {
    res.json({ message: "da login", isLogin: true });
  }
);

app.get("/userprofile/:id", (req, res, next) => {
  let query = "SELECT * FROM users WHERE id = ?";
  con.query(query, [req.params.id], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});
app.get("/orderflight/:id", (req, res, next) => {
  let query =
    "SELECT *, flights.flight_id, departure_city.city_name AS departure_city, arrival_city.city_name AS arrival_city FROM flights JOIN cities AS departure_city ON flights.departure_city_id = departure_city.city_id JOIN cities AS arrival_city ON flights.arrival_city_id = arrival_city.city_id WHERE flights.flight_id = ?;";
  con.query(query, [req.params.id], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});
app.post("/order/:id", (req, res, next) => {
  let flightID = req.params.id;
  let normalSeat = req.body.normalSeatOrder;
  let businessSeat = req.body.businessSeatOrder;
  let total = req.body.totalPaid;
  let userID = req.body.userId;
  let normalSeatLeft;
  let businessSeatLeft;
  let flightQuery =
    "SELECT *, flights.flight_id, departure_city.city_name AS departure_city, arrival_city.city_name AS arrival_city FROM flights JOIN cities AS departure_city ON flights.departure_city_id = departure_city.city_id JOIN cities AS arrival_city ON flights.arrival_city_id = arrival_city.city_id WHERE flights.flight_id = ?;";
  con.query(flightQuery, [req.params.id], (err, result) => {
    if (err) throw err;
    // console.log(result);
    normalSeatLeft = result[0].normal_seat;
    businessSeatLeft = result[0].business_seat;
    console.log(normalSeat > normalSeatLeft);
    let query =
      "INSERT INTO `orders`( `user_id`, `flight_id`, `business_seat_order`, `normal_seat_order`, `total_price`) VALUES (?, ?, ?, ?, ?)";
    if (!userID) {
      res.json({ message: "You need to login to order" });
    } else if (normalSeat > normalSeatLeft) {
      res.json({ message: "too many normal seats, illegal request" });
    } else if (businessSeat > businessSeatLeft) {
      res.json({ message: "too many business seats, illegal request" });
    } else if (normalSeat + businessSeat <= 0) {
      res.json({ message: "You must at least choose one seat to order" });
    } else {
      con.query(
        query,
        [userID, flightID, businessSeat, normalSeat, total],
        function (err, result) {
          if (err) throw err;
          console.log(normalSeat + " " + normalSeatLeft);
          res.json({ message: "orders completed" });
        }
      );
    }
  });
});
app.get("/orderlist", function (req, res) {
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id;";
  con.query(query, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/pending", function (req, res) {
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Pending';";
  con.query(query, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/approved", function (req, res) {
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Approved';";
  con.query(query, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/denied", function (req, res) {
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Denied';";
  con.query(query, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

app.get("/myorder/:id", function (req, res) {
  let userId = req.params.id;
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE user_id = ?;";
  con.query(query, [userId], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.put("/approve/:id", function (req, res) {
  let userId = req.body.userId;
  let orderId = req.body.orderId;
  let flightId = req.body.flightId;
  let normalSeatOrdered = req.body.normalSeat;
  let businessSeatOrdered = req.body.businessSeat;
  let queryUser = "SELECT email FROM users WHERE id = ?";
  con.query(queryUser, [userId], function (err, result) {
    if (err) throw err;
    let email = result[0].email;
    let query = "UPDATE orders SET approved = 'Approved' WHERE order_id = ?;";
    con.query(query, [orderId], function (err, result) {
      if (err) throw err;
      let querySubtract =
        "UPDATE flights SET normal_seat = normal_seat - ?, business_seat = business_seat - ? WHERE flight_id = ?";
      con.query(
        querySubtract,
        [normalSeatOrdered, businessSeatOrdered, flightId],
        function () {
          if (err) throw err;
        }
      );
      let mailOptions = {
        from: "flightapp.bot@gmail.com",
        to: email,
        subject: "Your order is approved!",
        text: "Thank you for trusting us",
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent to: " + email);
        }
      });
    });
  });
});
app.put("/deny/:id", function (req, res) {
  let userId = req.body.userId;
  let orderId = req.body.orderId;
  let queryUser = "SELECT email FROM users WHERE id = ?";
  con.query(queryUser, [userId], function (err, result) {
    if (err) throw err;
    console.log(result);
    let email = result[0].email;
    console.log(email);
    let query = "UPDATE orders SET approved = 'denied' WHERE order_id = ?;";
    con.query(query, [orderId], function (err, result) {
      if (err) throw err;
      console.log("denied");
      let mailOptions = {
        from: "flightapp.bot@gmail.com",
        to: email,
        subject: "Your order is denied!",
        text: "We're sorry for this inconvenience",
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent to: " + email);
        }
      });
    });
  });
});

app.get("/orderlist/:id", function (req, res) {
  let userId = req.params.id;
  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time, o.order_date FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE user_id=? ORDER BY o.order_date DESC; ";
  con.query(query, [userId], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/pending/:id", function (req, res) {
  let userId = req.params.id;

  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Pending' AND user_id=? ;";
  con.query(query, [userId], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/approved/:id", function (req, res) {
  let userId = req.params.id;

  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Approved' AND user_id=?;";
  con.query(query, [userId], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/denied/:id", function (req, res) {
  let userId = req.params.id;

  let query =
    "SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id WHERE approved = 'Denied' AND user_id=?;";
  con.query(query, [userId], function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

app.get("/statistic/today", function (req, res) {
  const today = new Date().toISOString().split("T")[0];
  const query = `
  SELECT SUM(total_price) AS total_price_sum
  FROM orders
  WHERE approved = 'Approved' AND DATE(order_date) = ?`;

  con.query(query, [today], (error, results) => {
    if (error) throw error;
    const sumTotalPrice = results[0].total_price_sum;
    res.json({ result: sumTotalPrice });
  });
});
app.get("/statistic/total", function (req, res) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const query = `
  SELECT DAY(order_date) AS day,
         SUM(total_price) AS total_price_sum
  FROM orders
  WHERE approved = 'Approved' AND MONTH(order_date) = ? AND YEAR(order_date) = ?
  GROUP BY DAY(order_date)
`;

  con.query(query, [currentMonth, currentYear], (error, results) => {
    if (error) throw error;
    const sumsByDay = results.map((row) => ({
      day: row.day,
      total_price_sum: row.total_price_sum,
    }));
    res.send(sumsByDay);
  });
});
app.get("/statistic/thismonth", function (req, res) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const query = `SELECT SUM(total_price) AS sum_total_price FROM orders WHERE MONTH(order_date) = ? AND YEAR(order_date) = ?`;

  con.query(query, [currentMonth, currentYear], (error, results) => {
    if (error) throw error;
    const sumTotalPrice = results[0].sum_total_price;
    res.send({ result: sumTotalPrice });
  });
});
app.get("/statistics/year", function (req, res) {
  const query = `SELECT MONTH(order_date) AS month, SUM(total_price) AS sum_total_price FROM orders WHERE YEAR(order_date) = YEAR(CURDATE()) GROUP BY MONTH(order_date) `;
  con.query(query, (err, results) => {
    if (err) throw err;
    // console.log(results);
    const sumsByMonth = results.map((row) => ({
      month: row.month,
      total_price_sum: row.sum_total_price,
    }));
    res.send(sumsByMonth);
  });
});
app.get("/alluser", function (req, res) {
  let query = `SELECT * FROM users ORDER BY date_joined DESC`;
  con.query(query, (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/deleteOrder/:id", function (req, res) {
  let id = req.params.id;
  console.log(id);
  let query = `DELETE FROM orders WHERE order_id = ?;`;
  con.query(query, [id], function (err, result) {
    if (err) throw err;
  });
});
app.get("/orderEdit/:id", function (req, res) {
  let id = req.params.id;
  let query = `SELECT o.order_id, o.user_id, o.business_seat_order, o.normal_seat_order, o.total_price, o.approved, f.flight_id, f.planes, f.departure_city_id, f.arrival_city_id, f.departure_time, f.normal_seat, f.business_seat, f.normal_seat_price, f.business_seat_price, f.departure_date, f.arrival_date, f.arrival_time, dep.city_name AS departure_city_name, arr.city_name AS arrival_city_name FROM orders o INNER JOIN flights f ON o.flight_id = f.flight_id INNER JOIN cities dep ON f.departure_city_id = dep.city_id INNER JOIN cities arr ON f.arrival_city_id = arr.city_id WHERE o.order_id=?;`;
  con.query(query, [id], (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
app.put("/editOrder/:id", function (req, res) {
  let orderId = req.params.id;
  let businessSeat = req.body.businessSeat;
  let normalSeat = req.body.normalSeat;
  let totalPrice = req.body.totalPrice;
  let queryDelete = `DELETE FROM orders WHERE order_id =?`;
  let query = `UPDATE orders SET business_seat_order = ?, normal_seat_order = ?, total_price = ? WHERE order_id = ?`;
  if (totalPrice === 0) {
    con.query(queryDelete, [orderId], (err, result) => {
      if (err) throw err;
    });
  } else {
    con.query(
      query,
      [businessSeat, normalSeat, totalPrice, orderId],
      (err, result) => {
        if (err) throw err;
      }
    );
  }
});
app.put(
  "/updateProfile/:id",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("firstname")
      .notEmpty()
      .withMessage("Please enter a first name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("First name cannot contain special characters"),
    body("lastname")
      .not()
      .isEmpty()
      .withMessage("Please enter a last name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("Last name cannot contain special characters"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("username")
      .isLength({ min: 6 })
      .withMessage("Username must be at least 6 characters long")
      .matches(/^[^!@#$%^&*()_+\-=\[\]{}\\|;':",.\/<>?\s]+$/)
      .withMessage("Username cannot contain special characters"),
  ],
  function (req, res) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      let errorArray = result.array().map((error) => error.msg);
      res.json({ message: errorArray });
    } else {
      let newEmail = req.body.email;
      let newFirstName = req.body.firstname;
      let newLastName = req.body.lastname;
      let newPassword = req.body.password;
      let newUserName = req.body.username;
      // let role = req.body.role;
      let userId = req.params.id;
      let query = `UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, password = ? WHERE id = ?`;
      res.json({ message: ["Sucessfully updated account"] });
      con.query(
        query,
        [newUserName, newFirstName, newLastName, newEmail, newPassword, userId],
        function (err, results) {
          if (err) throw err;
        }
      );
    }
  }
);

app.post(
  "/addaccount",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("firstname")
      .notEmpty()
      .withMessage("Please enter a first name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("First name cannot contain special characters"),
    body("lastname")
      .not()
      .isEmpty()
      .withMessage("Please enter a last name")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("Last name cannot contain special characters"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("username")
      .isLength({ min: 6 })
      .withMessage("Username must be at least 6 characters long")
      .matches(/^[^!@#$%^&*()_+\-=\[\]{}\\|;':",.\/<>?\s]+$/)
      .withMessage("Username cannot contain special characters"),
  ],
  function (req, res) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      let errorArray = result.array().map((error) => error.msg);
      res.json({ message: errorArray });
    } else {
      let newEmail = req.body.email;
      let newFirstName = req.body.firstname;
      let newLastName = req.body.lastname;
      let newPassword = req.body.password;
      let newUserName = req.body.username;
      let role = req.body.role;
      let isAdmin = 0;
      if (role === "admin") {
        isAdmin = 1;
      }
      let queryInsert =
        "INSERT INTO users (username, first_name, last_name, email, password, isAdmin) VALUES (?, ?, ?, ?, ?, ?)";
      let queryCompare = `SELECT * FROM users WHERE username= ? OR email = ?`;
      con.query(
        queryCompare,
        [newUserName, newEmail],
        (error, results, fields) => {
          if (error) throw error;
          if (results.length > 0) {
            results.forEach((result) => {
              if (result.username === newUserName) {
                res.json({
                  message: [`Username ${newUserName} already exists`],
                });
              } else if (result.email === newEmail) {
                res.json({
                  message: [`Email ${newEmail} has already ben registered`],
                });
              }
            });
          } else {
            res.json({ message: ["Sucessfully created account"] });
            con.query(
              queryInsert,
              [
                newUserName,
                newFirstName,
                newLastName,
                newEmail,
                newPassword,
                isAdmin,
              ],
              function (err, results) {
                if (err) throw err;
              }
            );
            let mailOptions = {
              from: "wflightapp.bot@gmail.com",
              to: newEmail,
              subject: "Successfully created a new account",
              text: "Thank you for joining us",
            };
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log("Email sent: " + info.response);
              }
            });
          }
        }
      );
    }
  }
);
app.delete("/deleteaccount/:id", function (req, res, next) {
  let userId = req.params.id;
  let orderquery = "DELETE FROM orders WHERE user_id = ?;";
  let userquery = "DELETE FROM users WHERE id = ?;";
  con.query(orderquery, [userId], function (error, result) {
    if (error) throw error;
    con.query(userquery, [userId], function (error, result) {
      if (error) throw error;
      console.log("done xoa");
    });
  });
});
app.put("/changerole/:id", function (req, res) {
  console.log(req.params.id);
  let userID = req.params.id;
  let query = `UPDATE users SET isAdmin = NOT isAdmin WHERE id = ?`;
  con.query(query, [userID], function (err, result) {
    if (err) throw err;
  });
});
