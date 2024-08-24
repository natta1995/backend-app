require('dotenv').config();

const session = require('express-session');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.DB_PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');

app.use('/users', userRoutes);
app.use('/friends', friendRoutes);

app.get('/', (req, res) => {
  res.send('Servern är igång!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
