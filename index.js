require('dotenv').config();

const session = require('express-session');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.DB_PORT;

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true, 
}));

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
const feedRoutes = require('./routes/feed');

app.use('/users', userRoutes);
app.use('/friends', friendRoutes);
app.use('/feed', feedRoutes);

app.get('/', (req, res) => {
  res.send('Servern är igång!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
