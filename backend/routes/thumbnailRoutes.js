const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { getFontAndStyle, calculatePosition, hexToRgb } = require('../utils/pdfHelpers');
const Operation = require('../models/Operation');
const upload = require('../config/upload');


// ------------------ GET PDF THUMBNAILS (Fixed: Runs pdftoppm directly) ------------------
router.post('get-pdf-thumbnails', upload.single('pdfFile'), async (req, res) => {
  const tempDir = path.join(__dirname, 'temp_thumbnails', `preview_${Date.now()}`);
  let uploadedPath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    uploadedPath = req.file.path;

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Define output prefix (e.g. "uploads/temp/page")
    const outPrefix = path.join(tempDir, 'page');

    // 1. Construct the command
    // Syntax: pdftoppm -jpeg -scale-to 200 "InputFile" "OutputPrefix"
    // We wrap paths in quotes to handle spaces safely
    const cmd = `pdftoppm -jpeg -scale-to 200 "${uploadedPath}" "${outPrefix}"`;

    console.log('🖼️ Generating thumbnails with command:', cmd);

    // 2. Execute directly using child_process
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      await execPromise(cmd);
    } catch (execError) {
      console.error("System Command Failed:", execError.message);
      throw new Error("Failed to execute pdftoppm. Ensure Poppler is in System PATH.");
    }

    // 3. Read the generated images
    let imageFiles = await fs.readdir(tempDir);

    // Sort files naturally (page-1, page-2, page-10...)
    imageFiles = imageFiles
      .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
      .sort((a, b) => {
        const numA = parseInt(a.match(/-(\d+)\./)?.[1] || 0);
        const numB = parseInt(b.match(/-(\d+)\./)?.[1] || 0);
        return numA - numB;
      });

    console.log(`✅ Generated ${imageFiles.length} thumbnails`);

    // 4. Convert images to Base64 to send to frontend
    const thumbnails = await Promise.all(imageFiles.map(async (file, index) => {
      const filePath = path.join(tempDir, file);
      const buffer = await fs.readFile(filePath);
      return {
        id: `page-${index}`,
        originalIndex: index, // Maintain exact index
        src: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        rotation: 0
      };
    }));

    res.json({ thumbnails });

    // 5. Cleanup
    await fs.unlink(uploadedPath).catch(() => { });
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });

  } catch (err) {
    console.error('❌ Thumbnail Error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    res.status(500).json({ error: 'Failed to generate previews: ' + err.message });
  }
});


module.exports = router;