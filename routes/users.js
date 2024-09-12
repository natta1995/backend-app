const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const router = express.Router();


router.get('/userslist', (req, res) => {
    const query = 'SELECT id, username, name FROM users';
    db.execute(query, (err, results) => {
      if (err) {
        console.error('Fel vid hämtning av användare:', err);
        return res.status(500).send('Serverfel, försök igen senare.');
      }
  
      res.json(results);
    });
  });
  

router.post('/register', async (req, res) => {
    const { username, password, name, age, email } = req.body;
  
    if (!username || !password || !name || !age || !email) {
      return res.status(400).send('Du har glömt att fylla i någon av följande: Användarnamn, lösenord, namn, ålder eller email');
    }
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const query = 'INSERT INTO users (username, password, name, age, email) VALUES (?, ?, ?, ?, ?)';
      db.execute(query, [username, hashedPassword, name, age, email], (err, result) => {
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
  

router.post('/login', (req, res) => {
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
          req.session.userId = user.id; 
          req.session.username = user.username;
          res.redirect('/users/feed'); 
        } else {
          res.status(401).send('Felaktigt användarnamn eller lösenord.');
        }
      } catch (err) {
        console.error('Fel vid lösenordsjämförelse:', err);
        res.status(500).send('Serverfel, försök igen senare.');
      }
    });
  });


router.get('/profile/:username', (req, res) => {
    const { username } = req.params;
  
    if (!req.session.userId) {
      return res.status(401).send('Du måste vara inloggad för att se denna sida.');
    }
  
    const query = 'SELECT id, username, name, email, age, workplace, school, bio FROM users WHERE username = ?';
    db.execute(query, [username], (err, results) => {
      if (err) {
        console.error('Fel vid hämtning av profil:', err);
        return res.status(500).send('Serverfel, försök igen senare.');
      }
  
      if (results.length === 0) {
        return res.status(404).send('Användare hittades inte.');
      }
  
      const user = results[0];
  
      const isOwner = req.session.userId === user.id;
  
      //res.render('profile', { user, isOwner });
      res.json({ user, isOwner });
  
    });
  });



router.get('/profile', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send('Du måste vara inloggad för att se din profil.');
    }
  
    const query = 'SELECT id, username, name, email, age, workplace, school, bio FROM users WHERE id = ?';
    db.execute(query, [req.session.userId], (err, results) => {
      if (err) {
        console.error('Fel vid hämtning av profil:', err);
        return res.status(500).send('Serverfel, försök igen senare.');
      }
  
      if (results.length === 0) {
        return res.status(404).send('Profilen hittades inte.');
      }
  
      res.json(results[0]);  
    });
  });


router.post('/profile', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send('Du måste vara inloggad för att uppdatera din profil.');
    }
  
    const { name, email, age, workplace, school, bio } = req.body;
    const query = 'UPDATE users SET name = ?, email = ?, age = ?, workplace = ?, school = ?, bio = ? WHERE id = ?';
    
    db.execute(query, [name, email, age, workplace, school, bio, req.session.userId], (err, result) => {
      if (err) {
        console.error('Fel vid uppdatering av profil:', err);
        return res.status(500).send('Serverfel, försök igen senare.');
      }
  
      res.send('Profil uppdaterad!');
    });
  });


router.get('/feed', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send('Du måste vara inloggad för att se denna sida.');
    }
  
    res.send(`Välkommen till flödessidan, användare ${req.session.username}!`);
  });


  module.exports = router;