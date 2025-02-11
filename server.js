require("dotenv").config();

const session = require("express-session");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/dbPromise");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 1337;

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:1337", "http://localhost:3000"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: ["http://localhost:1337", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const userRoutes = require("./routes/users");
const friendRoutes = require("./routes/friends");
const feedRoutes = require("./routes/feed");
const messageRouter = require("./routes/messages");

app.use("/users", userRoutes);
app.use("/friends", friendRoutes);
app.use("/feed", feedRoutes);
app.use("/messages", messageRouter);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Servern är igång!");
});

io.on("connection", (socket) => {
  console.log(`🔌 Användare anslöt: ${socket.id}`);

  socket.on("sendMessage", async (data) => {
    console.log("Nytt meddelande:", data);

    const { sender_id, receiver_id, message_text } = data;

    try {
      const [result] = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message_text, status) VALUES (?, ?, ?, 'sent')`,
        [sender_id, receiver_id, message_text]
      );

      const newMessage = {
        id: result.insertId,
        sender_id,
        receiver_id,
        message_text,
        status: "sent",
        created_at: new Date().toISOString(),
      };

      io.emit("receiveMessage", newMessage);
    } catch (err) {
      console.error("Fel vid lagring av meddelande:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Användare med ID ${socket.id} kopplade från.`);
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
