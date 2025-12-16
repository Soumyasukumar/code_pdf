const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, degrees, rgb } = require('pdf-lib');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const Operation = require('../models/Operation');
const upload = require('../config/upload');
const { getFontAndStyle, calculatePosition, hexToRgb, getCellStyles } = require('../utils/pdfHelpers');


// ------------------ ORGANIZE PDF (Reorder, Delete, Rotate) ------------------
router.post('/organize-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('📚 Organize PDF request received');

    // 1. Validation
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (!req.body.pageOrder) return res.status(400).json({ error: 'Page order data is required' });

    uploadedPath = req.file.path;

    // Parse instructions from frontend
    // Format: [{ originalIndex: 0, rotate: 90 }, ...] — order defines new sequence
    let pageInstructions;
    try {
      pageInstructions = JSON.parse(req.body.pageOrder);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format for pageOrder' });
    }

    if (!Array.isArray(pageInstructions) || pageInstructions.length === 0) {
      return res.status(400).json({ error: 'Page order cannot be empty' });
    }

    // 2. Load Original PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    // 3. Validate Page Indices
    const indicesToCopy = pageInstructions.map(p => p.originalIndex);
    const invalidIndex = indicesToCopy.find(i => i < 0 || i >= totalPages);
    if (invalidIndex !== undefined) {
      return res.status(400).json({ error: `Invalid page index: ${invalidIndex}` });
    }

    // 4. Create New PDF & Copy Pages Efficiently
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

    // 5. Add Pages with Optional Rotation
    pageInstructions.forEach((instr, i) => {
      const page = copiedPages[i];

      if (instr.rotate && instr.rotate !== 0) {
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + instr.rotate + 360) % 360; // Normalize
        page.setRotation(degrees(newRotation));
      }

      newPdf.addPage(page);
    });

    // 6. Save and Send Final PDF
    const organizedPdfBytes = await newPdf.save();
    const outputName = `organized_${req.file.originalname}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(organizedPdfBytes));

    // Log Success
    await Operation.create({
      operation: 'organize-pdf',
      filename: req.file.originalname,
      status: 'success'
    });

    // Cleanup uploaded file
    await fs.unlink(uploadedPath).catch(() => {});
  } catch (err) {
    console.error('❌ Organize PDF Error:', err);

    await Operation.create({
      operation: 'organize-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    }).catch(() => {});

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});

    res.status(500).json({ error: 'Failed to organize PDF: ' + err.message });
  }
});

// ------------------ GET PDF THUMBNAILS (Direct pdftoppm execution) ------------------
router.post('/get-pdf-thumbnails', upload.single('pdfFile'), async (req, res) => {
  const tempDir = path.join(__dirname, '..', 'temp_thumbnails', `preview_${Date.now()}`);
  let uploadedPath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    uploadedPath = req.file.path;

    // 1. Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });

    // 2. Define output prefix for pdftoppm
    const outPrefix = path.join(tempDir, 'page');

    // 3. Run pdftoppm to generate JPEG thumbnails
    const cmd = `pdftoppm -jpeg -scale-to 300 "${uploadedPath}" "${outPrefix}"`;
    console.log('🖼️ Generating thumbnails with command:', cmd);

    try {
      await execPromise(cmd);
    } catch (execError) {
      console.error('pdftoppm failed:', execError.message);
      throw new Error('Failed to generate thumbnails. Is Poppler (pdftoppm) installed and in PATH?');
    }

    // 4. Read and sort generated thumbnail files
    let imageFiles = await fs.readdir(tempDir);
    imageFiles = imageFiles
      .filter(f => f.match(/^page-\d+\.jpg$/i))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.jpg/i)[1]);
        const numB = parseInt(b.match(/page-(\d+)\.jpg/i)[1]);
        return numA - numB;
      });

    if (imageFiles.length === 0) {
      throw new Error('No pages found in PDF or generation failed.');
    }

    console.log(`✅ Generated ${imageFiles.length} thumbnails`);

    // 5. Convert to base64 and send to frontend
    const thumbnails = await Promise.all(
      imageFiles.map(async (file, index) => {
        const filePath = path.join(tempDir, file);
        const buffer = await fs.readFile(filePath);
        return {
          id: `page-${index}`,
          originalIndex: index,
          src: `data:image/jpeg;base64,${buffer.toString('base64')}`,
          rotation: 0
        };
      })
    );

    res.json({ thumbnails });

    // 6. Cleanup: remove uploaded file and temp thumbnails
    await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  } catch (err) {
    console.error('❌ Thumbnail Generation Error:', err);

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    let userMessage = err.message || 'Failed to generate thumbnails';
    if (err.message.includes('pdftoppm') || err.message.includes('command not found')) {
      userMessage = 'Server missing Poppler utilities. Please install pdftoppm.';
    }

    res.status(500).json({ error: userMessage });
  }
});

// ------------------ ADD PAGE NUMBERS ------------------
router.post('/add-page-numbers', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  let tempDir = null;

  try {
    console.log('Add Page Numbers request received');

    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    uploadedPath = toWslPath(req.file.path);

    // === 1. Generate Thumbnails (Always) ===
    tempDir = path.join(__dirname, '..', 'temp_thumbnails', `preview_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const outPrefix = path.join(tempDir, 'page');

    const cmd = `pdftoppm -jpeg -scale-to 300 "${uploadedPath}" "${outPrefix}"`;
    await execPromise(cmd);

    let imageFiles = await fs.readdir(tempDir);
    imageFiles = imageFiles
      .filter(f => /^page-\d+\.jpg$/i.test(f))
      .sort((a, b) => parseInt(a.match(/(\d+)/)[1]) - parseInt(b.match(/(\d+)/)[1]));

    const thumbnails = await Promise.all(
      imageFiles.map(async (file, i) => {
        const buffer = await fs.readFile(path.join(tempDir, file));
        return {
          id: `page-${i}`,
          originalIndex: i,
          src: `data:image/jpeg;base64,${buffer.toString('base64')}`,
          rotation: 0
        };
      })
    );

    // === 2. If only preview requested → return thumbnails only ===
    if (req.body.previewOnly === 'true' || !req.body.settings) {
      // Cleanup uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.json({ thumbnails });
    }

    // === 3. Apply Page Numbers ===
    const settings = JSON.parse(req.body.settings);

    const {
      position = 'bottom-center',
      margin = 30,
      fromPage = 1,
      toPage = 0,
      text = '{n}',
      startFrom = 1,
      fontSize = 12
    } = settings;

    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const totalPages = pdfDoc.getPageCount();
    const font = await pdfDoc.embedFont('Helvetica');

    const startIdx = Math.max(0, (parseInt(fromPage) || 1) - 1);
    const endIdx = toPage === 0 ? totalPages - 1 : Math.min(totalPages - 1, (parseInt(toPage) || totalPages) - 1);

    for (let i = startIdx; i <= endIdx; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const currentNumber = parseInt(startFrom) + (i - startIdx);
      const textToDraw = text.replace('{n}', currentNumber).replace('{p}', totalPages);

      const textWidth = font.widthOfTextAtSize(textToDraw, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      const m = parseInt(margin);

      let x, y;

      if (position.includes('left')) x = m;
      else if (position.includes('center')) x = width / 2 - textWidth / 2;
      else x = width - textWidth - m;

      if (position.includes('top')) y = height - textHeight - m;
      else y = m + textHeight / 4;

      page.drawText(textToDraw, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
    }

    const resultBytes = await pdfDoc.save();
    const outputName = `numbered_${req.file.originalname}`;

    // === Cleanup ===
    await fs.unlink(req.file.path).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    // === Send Final PDF ===
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(resultBytes));

    await Operation.create({
      operation: 'page-numbers',
      filename: req.file.originalname,
      status: 'success'
    });

  } catch (err) {
    console.error('Page Numbers Error:', err);
    if (uploadedPath) await fs.unlink(req.file.path).catch(() => {});
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Failed to process page numbers: ' + err.message });
  }
});

module.exports = router;