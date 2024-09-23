const multer = require('multer');
const path = require('path');

// Konfiguration av var filerna ska sparas och hur de ska namnges
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Mappen där filerna ska sparas
  },
  filename: function (req, file, cb) {
    // Skapar ett unikt filnamn baserat på datum och originalfilnamnet
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Filfilter för att säkerställa att endast bildfiler laddas upp
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Endast bildfiler (JPEG, PNG, GIF) är tillåtna.'));
  }
};

// Skapa Multer-instansen med de definierade inställningarna
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maximal filstorlek är 5 MB
  fileFilter: fileFilter,
});

module.exports = upload;
