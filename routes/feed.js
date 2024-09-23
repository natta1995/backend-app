const express = require('express');
const db = require('../config/database');

const router = express.Router();


router.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att se flödet.');
    }

    const query = `
        SELECT posts.id, posts.content, posts.createdAt, users.username, users.profile_image 
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

    // Skapa inlägget först
    const insertQuery = 'INSERT INTO feed (userId, content) VALUES (?, ?)';
    db.execute(insertQuery, [req.session.userId, content], (err, result) => {
        if (err) {
            console.error('Fel vid skapande av inlägg:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        const postId = result.insertId;

        // Hämta det skapade inlägget med användarnamn
        const fetchQuery = `
            SELECT feed.id, feed.content, feed.createdAt, users.username 
            FROM feed 
            JOIN users ON feed.userId = users.id 
            WHERE feed.id = ?
        `;
        db.execute(fetchQuery, [postId], (err, postResults) => {
            if (err) {
                console.error('Fel vid hämtning av inlägg:', err);
                return res.status(500).send('Serverfel, försök igen senare.');
            }

            // Returnera hela det skapade inlägget
            res.json(postResults[0]);
        });
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

router.get('/:feedId/comments', (req, res) => {
    const feedId = req.params.feedId;

    const query = 'SELECT comments.*, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE post_id = ? ORDER BY comments.created_at DESC';
    db.execute(query, [feedId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av kommentarer:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        res.json(results);
    });
});

router.post('/:feedId/comments', (req, res) => {
    const { content } = req.body;
    const feedId = req.params.feedId;

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att kommentera.');
    }

    if (!content || content.trim() === "") {
        return res.status(400).send('Kommentaren kan inte vara tom.');
    }

    const insertQuery = 'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)';
    db.execute(insertQuery, [feedId, req.session.userId, content], (err, result) => {
        if (err) {
            console.error('Fel vid skapande av kommentar:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        const commentId = result.insertId;

        
        const fetchQuery = `
            SELECT comments.id, comments.content, comments.created_at AS createdAt, users.username
            FROM comments 
            JOIN users ON comments.user_id = users.id 
            WHERE comments.id = ?
        `;
        db.execute(fetchQuery, [commentId], (err, commentResults) => {
            if (err) {
                console.error('Fel vid hämtning av kommentar:', err);
                return res.status(500).send('Serverfel, försök igen senare.');
            }

           
            res.json(commentResults[0]);
        });
    });
});


router.delete('/comments/:commentId', (req, res) => {
    const commentId = req.params.commentId;

    if (!req.session.userId) {
        return res.status(401).send('Du måste vara inloggad för att ta bort en kommentar.');
    }

    // Kontrollera att användaren äger kommentaren
    const query = 'SELECT * FROM comments WHERE id = ? AND user_id = ?';
    db.execute(query, [commentId, req.session.userId], (err, results) => {
        if (err) {
            console.error('Fel vid hämtning av kommentar:', err);
            return res.status(500).send('Serverfel, försök igen senare.');
        }

        // Om kommentaren inte finns eller användaren inte äger den
        if (results.length === 0) {
            return res.status(403).send('Du har inte behörighet att ta bort denna kommentar.');
        }

        // Ta bort kommentaren om användaren äger den
        const deleteQuery = 'DELETE FROM comments WHERE id = ?';
        db.execute(deleteQuery, [commentId], (err, result) => {
            if (err) {
                console.error('Fel vid borttagning av kommentar:', err);
                return res.status(500).send('Serverfel, försök igen senare.');
            }

            res.send('Kommentar borttagen!');
        });
    });
});



module.exports = router;