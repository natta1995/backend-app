const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,  
    user: process.env.DB_USER,        
    password: process.env.DB_PASSWORD,        
    database: process.env.DB_DATABASE
  });

  db.connect((err) => {
    if (err) {
      console.error('Anslutningsfel till MySQL-databasen!:', err);
      return;
    }
    console.log('Ansluten till MySQL-databasen!');
  });

  module.exports = db;