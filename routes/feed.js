const express = require('express');
const db = require('../config/database');

const router = express.Router();


router.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att se flödet.');
    }

    const query = `
        SELECT posts.id, posts.content, posts.createdAt, users.username 
        FROM feed posts 
        JOIN users ON posts.userId = users.id
        WHERE posts.userId = ? OR posts.userId IN (
            SELECT friendId FROM friends WHERE userId = ? AND status = 'accepted'
        ) OR posts.userId IN (
            SELECT userId FROM friends WHERE friendId = ? AND status = 'accepted'
        )
        ORDER BY posts.createdAt DESC;
    `;
    db.execute(query, [req.session.userId, req.session.userId, req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av flöde:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
});


router.post('/create', (req, res) => {
    const { content } = req.body;

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att skapa ett inlägg.');
    }

    if (!content || content.trim() === "") {
        return res.status(400).send('Innehållet i inlägget kan inte vara tomt.');
    }

    const query = 'INSERT INTO feed (userId, content) VALUES (?, ?)';
    db.execute(query, [req.session.userId, content], (err, result) => {
        if (err) {
            console.error('Fel vid skapande av inlägg:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json({ message: 'Inlägg skapat!', postId: result.insertId });
    });
});


router.delete('/:id', (req, res) => {
    const postId = req.params.id;

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att ta bort ett inlägg.');
    }

    const query = 'SELECT * FROM feed WHERE id = ? AND userId = ?';
    db.execute(query, [postId, req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av inlägg:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        if (results.length === 0) {
            return res.status(403).send('Du har inte behörighet att ta bort detta inlägg.');
        }

        const deleteQuery = 'DELETE FROM feed WHERE id = ?';
        db.execute(deleteQuery, [postId], (err, result) => {
            if (err) {
                console.error('Fel vid borttagning av inlägg:', err);
                return res.status(500).send('Serverfel, försök igen senare.');
            }

            res.send('Inlägg borttaget!');
        });
    });
});


module.exports = router;