require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.DB_PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,  
  user: process.env.DB_USER,        
  password: process.env.DB_PASSWORD,        
  database: process.env.DB_DATABASE
});

db.connect((err) => {
  if (err) {
    console.error('Anslutningsfel till MySQL:', err);
    return;
  }
  console.log('Ansluten till MySQL-databasen!');
});

app.get('/', (req, res) => {
  res.send('Servern är igång!');
});


app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Användarnamn och lösenord är obligatoriska!');
  }

  try {
   
    const hashedPassword = await bcrypt.hash(password, 10);


    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.execute(query, [username, hashedPassword], (err, result) => {
      if (err) {
        console.error('Fel vid registrering:', err);
        return res.status(500).send('Serverfel, försök igen senare.');
      }
      res.send('Användare registrerad!');
    });
  } catch (err) {
    console.error('Fel vid hashning av lösenord:', err);
    res.status(500).send('Serverfel, försök igen senare.');
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Användarnamn och lösenord är obligatoriska!');
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  db.execute(query, [username], async (err, results) => {
    if (err) {
      console.error('Fel vid inloggning:', err);
      return res.status(500).send('Serverfel, försök igen senare.');
    }

    if (results.length === 0) {
      return res.status(401).send('Felaktigt användarnamn eller lösenord.');
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        res.send('Inloggning lyckades!');
      } else {
        res.status(401).send('Felaktigt användarnamn eller lösenord.');
      }
    } catch (err) {
      console.error('Fel vid lösenordsjämförelse:', err);
      res.status(500).send('Serverfel, försök igen senare.');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
