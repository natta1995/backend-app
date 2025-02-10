const express = require('express');
const router = express.Router();
//const db = require('../config/database');
const pool = require('../config/dbPromise'); // Använd den Promise-baserade anslutningen

router.get('/chat/:user1/:user2', async (req, res) => {
    const { user1, user2 } = req.params;

    try {
        const [messages] = await pool.query(
            `SELECT id, sender_id, receiver_id, message_text, status, created_at 
             FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) 
             OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at ASC`,  
            [user1, user2, user2, user1]
        );
        
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




router.post('/send', async (req, res) => {
    const { sender_id, receiver_id, message_text } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, message_text, status) VALUES (?, ?, ?, 'sent')`,
            [sender_id, receiver_id, message_text]
        );
        res.status(201).json({ message: 'Meddelande skickat!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });

    }
})

module.exports = router;