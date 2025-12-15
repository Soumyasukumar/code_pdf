// routes/thumbnailRoute.js  (or whatever your file is named)

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;           // ← REQUIRED
const path = require('path');                // ← REQUIRED
const { exec } = require('child_process');   // ← REQUIRED
const util = require('util');                // ← REQUIRED
const execPromise = util.promisify(exec);    // ← REQUIRED

const upload = require('../config/upload');
const { generateThumbnails } = require('../utils/pdfHelpers');

// GET PDF THUMBNAILS
router.post('/get-pdf-thumbnails', upload.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadedPath = req.file.path;

  try {
    const { thumbnails, cleanup } = await generateThumbnails(uploadedPath);

    res.json({ thumbnails });

    // Cleanup after successful response
    await cleanup();
    await fs.unlink(uploadedPath).catch(() => {});

  } catch (err) {
    console.error('Thumbnail Error:', err.message || err);

    // Always try to clean up uploaded file
    await fs.unlink(uploadedPath).catch(() => {});

    let message = 'Failed to generate thumbnails';

    if (err.message.includes('pdftoppm') || err.message.includes('command not found')) {
      message = 'Poppler (pdftoppm) is not installed or not in your system PATH.';
    } else if (err.message.includes('No thumbnails generated')) {
      message = 'PDF has no pages or is corrupted.';
    }

    res.status(500).json({ error: message });
  }
});

module.exports = router;