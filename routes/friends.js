const express = require('express');
const db = require('../config/database')

const router = express.Router();


router.post('/friends/request', (req, res) => {
    const { friendId } = req.body;
  
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att skicka en vänförfrågan.');
    }
  
    const query = 'INSERT INTO friends (userId, friendId, status) VALUES (?, ?, "pending")';
    db.execute(query, [req.session.userId, friendId], (err, result) => {
        if (err) {
            console.error('Fel vid skapande av vänförfrågan:', err);
            console.log('Friend ID:', friendId);
            console.log('Request Body:', req.body);
  
            return res.status(500).send('Serverfel, försök igen senare.');
        }
  
        res.send('Vänförfrågan skickad!');
    });
  });


router.get('/requests', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att se dina vänförfrågningar.');
    }

    const query = 'SELECT * FROM friends WHERE friendId = ? AND status = "pending"';
    db.execute(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av vänförfrågningar:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
});


module.exports = router;