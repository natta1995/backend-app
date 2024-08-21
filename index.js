const express = require('express');
const app = express();
const port = 1337;



app.get('/', (req, res) => {
  res.send('Starting!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

