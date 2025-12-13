const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { getFontAndStyle, calculatePosition, hexToRgb } = require('../utils/pdfHelpers');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

// ------------------ ORGANIZE PDF (Reorder, Delete, Rotate) ------------------
router.post('/organize-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('📚 Organize PDF request received');

    // 1. Validation
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (!req.body.pageOrder) return res.status(400).json({ error: 'Page order data is required' });

    uploadedPath = req.file.path;

    // Parse the instruction from frontend
    // Expected Format: Array of objects [{ originalIndex: 0, rotate: 0 }, { originalIndex: 2, rotate: 90 }, ...]
    // Note: The order of the array determines the new page sequence.
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

    // 3. Create New PDF
    const newPdf = await PDFDocument.create();

    // 4. Process Instructions
    // We collect all needed indices first to batch copy (efficient)
    const indicesToCopy = pageInstructions.map(p => p.originalIndex);

    // Validate indices
    const validIndices = indicesToCopy.filter(i => i >= 0 && i < totalPages);
    if (validIndices.length !== indicesToCopy.length) {
      throw new Error("Invalid page index detected in request.");
    }

    // Copy pages to the new document
    const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);

    // Add pages to new PDF and apply rotation if needed
    pageInstructions.forEach((instr, i) => {
      const page = copiedPages[i];

      // Apply extra rotation if requested (on top of existing rotation)
      // 'rotate' in instruction is relative (e.g., 90, 180, -90)
      if (instr.rotate && instr.rotate !== 0) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + instr.rotate));
      }

      newPdf.addPage(page);
    });

    // 5. Save and Send
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

    // Cleanup
    await fs.unlink(uploadedPath).catch(() => { });

  } catch (err) {
    console.error('❌ Organize PDF Error:', err);
    await Operation.create({
      operation: 'organize-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    }).catch(() => { });

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
    res.status(500).json({ error: 'Failed to organize PDF: ' + err.message });
  }
});



// ------------------ ADD PAGE NUMBERS ------------------
router.post('/add-page-numbers', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('🔢 Add Page Numbers request received');

    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    uploadedPath = req.file.path;
    const settings = JSON.parse(req.body.settings);

    // Settings defaults
    const {
      position = 'bottom-center', // top-left, top-center, top-right, bottom-left...
      margin = 30,                // Distance from edge
      fromPage = 1,
      toPage = 0,                 // 0 means last page
      text = '{n}',               // Format: "Page {n}"
      startFrom = 1,              // The number to start counting at
      fontSize = 12,
      fontFamily = 'Helvetica'
    } = settings;

    // Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const totalPages = pdfDoc.getPageCount();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Determine Range
    const startIdx = (parseInt(fromPage) || 1) - 1;
    const endIdx = (parseInt(toPage) || totalPages) - 1;

    // Iterate pages
    for (let i = 0; i < totalPages; i++) {
      // Skip if outside user's selected range
      if (i < startIdx || i > endIdx) continue;

      const page = pages[i];
      const { width, height } = page.getSize();

      // Calculate the actual number to print
      // (i - startIdx) is how many pages we've processed in the range
      const currentNumber = parseInt(startFrom) + (i - startIdx);
      const textToDraw = text.replace('{n}', currentNumber).replace('{p}', totalPages);

      // Calculate Text Dimensions
      const textWidth = font.widthOfTextAtSize(textToDraw, parseInt(fontSize));
      const textHeight = font.heightAtSize(parseInt(fontSize));

      // Calculate Position (X, Y)
      let x, y;
      const m = parseInt(margin);

      // Horizontal Logic
      if (position.includes('left')) {
        x = m;
      } else if (position.includes('center')) {
        x = (width / 2) - (textWidth / 2);
      } else { // right
        x = width - textWidth - m;
      }

      // Vertical Logic
      if (position.includes('top')) {
        y = height - textHeight - m;
      } else { // bottom
        y = m;
      }

      // Draw the number
      page.drawText(textToDraw, {
        x: x,
        y: y,
        size: parseInt(fontSize),
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Save and Send
    const resultBytes = await pdfDoc.save();
    const outputName = `numbered_${req.file.originalname}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(resultBytes));

    // Cleanup
    await fs.unlink(uploadedPath).catch(() => { });
    await Operation.create({ operation: 'page-numbers', filename: req.file.originalname, status: 'success' });

  } catch (err) {
    console.error('❌ Page Numbers Error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
    res.status(500).json({ error: 'Failed to add page numbers: ' + err.message });
  }
});


module.exports = router;