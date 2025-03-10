const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/database");
const upload = require("../config/multerConfig");

const router = express.Router();

router.get("/userslist", (req, res) => {
  const query = "SELECT id, username, name, profile_image FROM users";
  db.execute(query, (err, results) => {
    if (err) {
      console.error("Fel vid hämtning av användare:", err);
      return res.status(500).send("Serverfel, försök igen senare.");
    }

    res.json(results);
  });
});

// Funktion för att validera lösenordcd

const validatePassword = (password) => {
  // Minst 8 tecken, en stor bokstav, en liten bokstav, en siffra och ett specialtecken
  const passwordRegex = /^(?=.*[a-zåäö])(?=.*[A-ZÅÄÖ])(?=.*\d)(?=.*[@$!%*?&])[A-Za-zÅÄÖåäö\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

router.post("/register", async (req, res) => {
  const { username, password, name, age, email } = req.body;

  if (!username || !password || !name || !age || !email) {
    return res
      .status(400)
      .send(
        "Du har glömt att fylla i någon av följande: Användarnamn, lösenord, namn, ålder eller email"
      );
  }

  if (!validatePassword(password)) {
    return res
      .status(400)
      .send(
        "Lösenordet måste vara minst 8 tecken långt och innehålla minst en stor bokstav, en liten bokstav, en siffra och ett specialtecken."
      );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query =
      "INSERT INTO users (username, password, name, age, email) VALUES (?, ?, ?, ?, ?)";
    db.execute(
      query,
      [username, hashedPassword, name, age, email],
      (err, result) => {
        if (err) {
          console.error("Fel vid registrering:", err);
          return res.status(500).send("Serverfel, försök igen senare.");
        }
        res.send("Användare registrerad!");
      }
    );
  } catch (err) {
    console.error("Fel vid hashning av lösenord:", err);
    res.status(500).send("Serverfel, försök igen senare.");
  }
});


router.delete("/delete/account", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send("Du måste ange ett användar-ID för att ta bort ett konto.");
  }

  try {
    // Ta bort relationer från vänner-tabellen där användaren är "friendId"
    const deleteFriendsAsFriendQuery = "DELETE FROM friends WHERE friendId = ?";
    db.execute(deleteFriendsAsFriendQuery, [userId], (err, result) => {
      if (err) {
        console.error("Fel vid borttagning av vänner (som friendId):", err);
        return res.status(500).send("Serverfel vid borttagning av vänrelationer.");
      }

      // Ta bort relationer från vänner-tabellen där användaren är "userId"
      const deleteFriendsAsUserQuery = "DELETE FROM friends WHERE userId = ?";
      db.execute(deleteFriendsAsUserQuery, [userId], (err, result) => {
        if (err) {
          console.error("Fel vid borttagning av vänner (som userId):", err);
          return res.status(500).send("Serverfel vid borttagning av vänrelationer.");
        }

        // Ta bort användaren från users-tabellen
        const deleteUserQuery = "DELETE FROM users WHERE id = ?";
        db.execute(deleteUserQuery, [userId], (err, result) => {
          if (err) {
            console.error("Fel vid borttagning av konto:", err);
            return res.status(500).send("Serverfel vid borttagning av konto.");
          }

          if (result.affectedRows === 0) {
            return res.status(404).send("Användare hittades inte.");
          }

          res.send("Kontot och alla relaterade data har tagits bort.");
        });
      });
    });
  } catch (err) {
    console.error("Fel vid hantering av borttagning:", err);
    res.status(500).send("Serverfel, försök igen senare.");
  }
});



router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Användarnamn och lösenord är obligatoriska!",
    });
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.execute(query, [username], async (err, results) => {
    if (err) {
      console.error("Fel vid inloggning:", err);
      return res
        .status(500)
        .json({ success: false, message: "Serverfel, försök igen senare." });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Felaktigt användarnamn eller lösenord.",
      });
    }

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        // Sätt session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Returnera JSON-respons istället för redirect
        return res.status(200).json({
          success: true,
          message: "Inloggning lyckades",
          username: user.username,
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Felaktigt användarnamn eller lösenord.",
        });
      }
    } catch (err) {
      console.error("Fel vid lösenordsjämförelse:", err);
      return res
        .status(500)
        .json({ success: false, message: "Serverfel, försök igen senare." });
    }
  });
});

router.post("/logout", (req, res) => {
  if (req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Fel vid utloggning:", err);
        return res.status(500).send("Serverfel vid utloggning, försök igen.");
      }

      res.clearCookie("connect.sid");
      return res.status(200).send("Utloggning lyckades");
    });
  } else {
    return res.status(400).send("ingen användare är inloggad");
  }
});

router.get("/profile/:username", (req, res) => {
  const { username } = req.params;

  if (!req.session.userId) {
    return res
      .status(401)
      .send("Du måste vara inloggad för att se denna sida.");
  }

  const query =
    "SELECT id, username, name, email, age, workplace, school, bio, profile_image FROM users WHERE username = ?";
  db.execute(query, [username], (err, results) => {
    if (err) {
      console.error("Fel vid hämtning av profil:", err);
      return res.status(500).send("Serverfel, försök igen senare.");
    }

    if (results.length === 0) {
      return res.status(404).send("Användare hittades inte.");
    }

    const user = results[0];

    const isOwner = req.session.userId === user.id;

    //res.render('profile', { user, isOwner });
    res.json({ user, isOwner });
  });
});

router.get("/profile", (req, res) => {
  if (!req.session.userId) {
    return res
      .status(401)
      .send("Du måste vara inloggad för att se din profil.");
  }

  const query =
    "SELECT id, username, name, email, age, workplace, school, bio, profile_image FROM users WHERE id = ?";
  db.execute(query, [req.session.userId], (err, results) => {
    if (err) {
      console.error("Fel vid hämtning av profil:", err);
      return res.status(500).send("Serverfel, försök igen senare.");
    }

    if (results.length === 0) {
      return res.status(404).send("Profilen hittades inte.");
    }

    res.json(results[0]);
  });
});

router.post("/profile", upload.single("image"), (req, res) => {
  const { name, email, age, workplace, school, bio, profile_image } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res
      .status(401)
      .send("Du måste vara inloggad för att uppdatera din profil.");
  }

  let profileImagePath = profile_image;

  if (req.file) {
    profileImagePath = `/uploads/${req.file.filename}`;
  }

  const query =
    "UPDATE users SET name = ?, email = ?, age = ?, workplace = ?, school = ?, bio = ?, profile_image = ? WHERE id = ?";
  db.execute(
    query,
    [name, email, age, workplace, school, bio, profileImagePath, userId],
    (err, result) => {
      if (err) {
        console.error("Fel vid uppdatering av profil:", err);
        return res.status(500).send("Serverfel, försök igen senare.");
      }

      res.send("Profil uppdaterad!");
    }
  );
});

router.get("/feed", (req, res) => {
  if (!req.session.userId) {
    return res
      .status(401)
      .send("Du måste vara inloggad för att se denna sida.");
  }

  res.send(`Välkommen till flödessidan, användare ${req.session.username}!`);
});

module.exports = router;
