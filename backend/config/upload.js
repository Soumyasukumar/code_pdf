const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads folder exists
fs.mkdirSync('uploads', { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fieldSize: 50 * 1024 * 1024 }, // for base64 fields
});

module.exports = upload;