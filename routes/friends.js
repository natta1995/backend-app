const express = require('express');
const db = require('../config/database')

const router = express.Router();


// Send a friend request 

router.post('/request', (req, res) => {
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

    const query = `
        SELECT f.id, u.username, u.name, u.profile_image
        FROM friends f
        JOIN users u ON f.userId = u.id
        WHERE f.friendId = ? AND f.status = "pending"
    `;
    db.execute(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av vänförfrågningar:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
})

// Respond to a friend request (send by someone else )

router.post('/respond', (req, res) => {
    const { requestId, action } = req.body; 

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att hantera vänförfrågningar.');
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    const query = 'UPDATE friends SET status = ? WHERE id = ? AND friendId = ?';
    db.execute(query, [status, requestId, req.session.userId], (err, result) => {
        if (err) {
            console.error('Fel vid hantering av vänförfrågan:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.send(`Vänförfrågan ${action === 'accept' ? 'accepterad' : 'avvisad'}!`);
    });
});

// Get the list of all your friends

router.get('/list', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att se din vänlista.');
    }

    const query = `
        SELECT u.id, u.username, u.name, profile_image
        FROM users u
        JOIN friends f ON (u.id = f.userId OR u.id = f.friendId)
        WHERE (f.userId = ? OR f.friendId = ?) AND f.status = 'accepted' AND u.id != ?;
    `;
    db.execute(query, [req.session.userId, req.session.userId, req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av vänlista:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
});

// Remove a user from your friendlist

router.post('/remove', (req, res) => {
    const { friendId } = req.body;

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att ta bort en vän.');
    }

    const query = 'DELETE FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)';
    db.execute(query, [req.session.userId, friendId, friendId, req.session.userId], (err, result) => {
        if (err) {
            console.error('Fel vid borttagning av vän:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.send('Vän borttagen!');
    });
});


// Get all the friend request YOU sent to other users

router.get('/sent-requests', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att se dina skickade vänförfrågningar.');
    }

    const query = `
        SELECT f.friendId, u.username, u.name, u.profile_image
        FROM friends f
        JOIN users u ON f.friendId = u.id
        WHERE f.userId = ? AND f.status = "pending"
    `;

    db.execute(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av skickade vänförfrågningar:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
});



module.exports = router;