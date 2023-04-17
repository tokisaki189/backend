const mysql = require("mysql2");

// const con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "flightapp",
// });
// module.exports = con;

const con = mysql.createConnection({
  host: "sql12.freemysqlhosting.net",
  user: "sql12612201",
  password: "YVB1WDxLY8",
  database: "sql12612201",
});
module.exports = con;
