const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { getFontAndStyle, calculatePosition, hexToRgb, getCellStyles } = require('../utils/pdfHelpers');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

router.post('/add-watermark', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    // 1. Check file
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }
    uploadedPath = req.file.path;

    // 2. Parse watermark data safely
    let watermarkConfig;
    try {
      watermarkConfig = JSON.parse(req.body.watermarkData);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid watermarkData JSON format.' });
    }
    const { watermarks } = watermarkConfig;
    if (!Array.isArray(watermarks) || watermarks.length === 0) {
      return res.status(400).json({ error: 'No watermarks provided.' });
    }

    // 3. Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // 4. Process each watermark
    for (const wm of watermarks) {
      const { type } = wm;

      // TEXT WATERMARK
      if (type === 'text') {
        const {
          text,
          fontSize = 50,
          textColor = '#000000',
          isBold = false,
          isItalic = false,
          rotation = 0,
          opacity = 0.5,
          positionKey = 'center',
          isMosaic = false,
          fontFamily = 'Helvetica'
        } = wm;

        const font = await getFontAndStyle(pdfDoc, fontFamily, isBold, isItalic);
        const pdfColor = hexToRgb(textColor);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        const drawOptions = {
          x: 0, y: 0,
          size: fontSize,
          font,
          color: pdfColor,
          opacity,
          rotate: degrees(rotation),
        };

        const drawTextAt = (x, y) => {
          pages.forEach(page => page.drawText(text, { ...drawOptions, x, y }));
        };

        if (isMosaic) {
          const gap = 280;
          const cols = 10;
          const rows = 12;
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              drawTextAt(-600 + i * gap, -800 + j * gap);
            }
          }
        } else {
          pages.forEach(page => {
            const { width, height } = page.getSize();
            const { x, y } = calculatePosition(width, height, textWidth, textHeight, positionKey);
            page.drawText(text, { ...drawOptions, x, y });
          });
        }
      }

      // IMAGE WATERMARK
      else if (type === 'image') {
        const {
          imageData,         // data:image/png;base64,xxxx
          width = 200,
          height = 200,
          opacity = 0.4,
          rotation = 0,
          positionKey = 'center',
          isMosaic = false
        } = wm;

        if (!imageData || !imageData.startsWith('data:image/')) {
          console.warn('Invalid or missing imageData for image watermark');
          continue;
        }

        // Extract base64
        const base64String = imageData.split(';base64,').pop();
        const imageBytes = Buffer.from(base64String, 'base64');

        // Embed image (PNG or JPG)
        let embeddedImage;
        try {
          if (imageData.includes('image/png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else if (imageData.includes('image/jpeg') || imageData.includes('image/jpg')) {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          } else {
            console.warn('Unsupported image format');
            continue;
          }
        } catch (embedErr) {
          console.warn('Failed to embed image:', embedErr.message);
          continue;
        }

        const drawImageAt = (x, y) => {
          pages.forEach(page => {
            const dims = embeddedImage.scaleToFit(width, height);
            page.drawImage(embeddedImage, {
              x,
              y,
              width: dims.width,
              height: dims.height,
              opacity,
              rotate: degrees(rotation),
            });
          });
        };

        if (isMosaic) {
          const gap = 300;
          const cols = 10;
          const rows = 12;
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              drawImageAt(-700 + i * gap, -900 + j * gap);
            }
          }
        } else {
          pages.forEach(page => {
            const { width: pageWidth, height: pageHeight } = page.getSize();
            const dims = embeddedImage.scaleToFit(width, height);
            const { x, y } = calculatePosition(pageWidth, pageHeight, dims.width, dims.height, positionKey);

            page.drawImage(embeddedImage, {
              x,
              y,
              width: dims.width,
              height: dims.height,
              opacity,
              rotate: degrees(rotation),
            });
          });
        }
      }
    }

    // 5. Save and send PDF
    const resultPdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=watermarked_${Date.now()}.pdf`);
    res.send(Buffer.from(resultPdfBytes));

    // 6. Cleanup
    await fs.unlink(uploadedPath).catch(() => {});
  } catch (error) {
    console.error('PDF Watermark Error:', error);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to add watermark: ' + error.message });
  }
});
// ------------------ ROTATE PDF ENDPOINT (ROBUST) ------------------
router.post('/rotate-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('🔄 Rotate PDF request received...');
    console.log('📂 Body:', req.body); // Check if angle is arriving

    // 1. Validation
    if (!req.file) {
      console.error('❌ No file received');
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Parse angle safely
    const angle = parseInt(req.body.angle);
    console.log(`📐 Requested Rotation: ${angle} degrees`);

    if (isNaN(angle) || angle % 90 !== 0) {
      console.error('❌ Invalid angle:', req.body.angle);
      return res.status(400).json({ error: 'Rotation angle must be a multiple of 90' });
    }

    uploadedPath = req.file.path;

    // 2. Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    console.log(`📄 PDF Loaded. Total pages: ${pages.length}`);

    // 3. Apply Rotation (Safe Method)
    pages.forEach((page, index) => {
      // Get current rotation safely (handles different pdf-lib versions)
      const rawRotation = page.getRotation();
      let currentRotation = 0;

      if (typeof rawRotation === 'object' && rawRotation.angle !== undefined) {
        currentRotation = rawRotation.angle;
      } else if (typeof rawRotation === 'number') {
        currentRotation = rawRotation;
      }

      const newRotation = currentRotation + angle;

      // Use the 'degrees' helper imported at the top of server.js
      page.setRotation(degrees(newRotation));
    });

    // 4. Save and Send
    const rotatedPdfBytes = await pdfDoc.save();
    const outputName = `rotated_${angle}_${req.file.originalname}`;

    console.log('✅ PDF Rotated successfully. Sending back...');

    // Log operation
    await Operation.create({
      operation: 'rotate-pdf',
      filename: req.file.originalname,
      status: 'success'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(rotatedPdfBytes));

    // Cleanup
    await fs.unlink(uploadedPath).catch(() => { });

  } catch (err) {
    console.error('❌ CRITICAL ROTATE ERROR:', err);

    // Attempt to log failure to DB
    try {
      await Operation.create({
        operation: 'rotate-pdf',
        filename: req.file?.originalname || 'unknown',
        status: 'failed'
      });
    } catch (dbErr) { console.error("DB Log failed", dbErr); }

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });

    // Send detailed error to frontend so you can see it in the Alert
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
});



// ------------------ CROP PDF (With Custom Page Selection) ------------------
router.post('/crop-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('✂️ Crop PDF request received');

    // 1. Validation
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (!req.body.cropData) return res.status(400).json({ error: 'Crop data is required' });

    uploadedPath = req.file.path;

    // Parse frontend data
    // New field: customPageRange (string like "1,3,5-7")
    const { crop, pageSelection, currentPageIndex, customPageRange } = JSON.parse(req.body.cropData);

    if (!crop || crop.width === 0 || crop.height === 0) {
      return res.status(400).json({ error: 'Please select an area to crop.' });
    }

    // 2. Load the Original PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const srcDoc = await PDFDocument.load(pdfBytes);
    const srcPages = srcDoc.getPages();
    const totalPages = srcPages.length;

    // 3. Create a NEW PDF Document
    const newDoc = await PDFDocument.create();

    // 4. Determine which pages to process (Logic Update)
    let pageIndicesToProcess = [];

    if (pageSelection === 'all') {
      // Add all pages (0 to total-1)
      pageIndicesToProcess = srcPages.map((_, i) => i);
    } 
    else if (pageSelection === 'current') {
      // Add only current page
      if (currentPageIndex >= 0 && currentPageIndex < totalPages) {
        pageIndicesToProcess = [currentPageIndex];
      }
    } 
    else if (pageSelection === 'custom') {
      // --- CUSTOM RANGE PARSING LOGIC ---
      // Expected format: "1, 3, 5-7"
      const ranges = customPageRange.split(',');
      const selectedIndices = new Set(); // Use Set to avoid duplicates

      ranges.forEach(range => {
        const part = range.trim();
        if (part.includes('-')) {
          // Handle range "5-7"
          const [start, end] = part.split('-').map(num => parseInt(num));
          if (!isNaN(start) && !isNaN(end)) {
            // Loop from start to end (inclusive)
            for (let i = start; i <= end; i++) {
              // Convert 1-based (user) to 0-based (array)
              if (i > 0 && i <= totalPages) selectedIndices.add(i - 1);
            }
          }
        } else {
          // Handle single number "3"
          const pageNum = parseInt(part);
          if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
            selectedIndices.add(pageNum - 1);
          }
        }
      });
      // Convert Set to Array and Sort
      pageIndicesToProcess = Array.from(selectedIndices).sort((a, b) => a - b);
    }

    if (pageIndicesToProcess.length === 0) {
      return res.status(400).json({ error: 'Invalid page selection. Please check your page numbers.' });
    }

    console.log(`Processing ${pageIndicesToProcess.length} page(s)...`);

    // 5. Embed Pages
    // We only embed the pages we intend to keep
    const embeddedPages = await newDoc.embedPages(pageIndicesToProcess.map(i => srcPages[i]));

    // 6. Apply Crop and Add to New Doc
    for (let i = 0; i < pageIndicesToProcess.length; i++) {
      const srcIdx = pageIndicesToProcess[i];
      const srcPage = srcPages[srcIdx];
      const embeddedPage = embeddedPages[i];
      
      const { width: originalWidth, height: originalHeight } = srcPage.getSize();

      // Calculate Crop Dimensions (Convert % to Points)
      const cropW = (crop.width / 100) * originalWidth;
      const cropH = (crop.height / 100) * originalHeight;
      const cropX = (crop.x / 100) * originalWidth;
      const cropY = originalHeight - ((crop.y / 100) * originalHeight) - cropH;

      // Create new page exactly the size of the crop
      const newPage = newDoc.addPage([cropW, cropH]);

      // Draw original page shifted to show only the crop area
      newPage.drawPage(embeddedPage, {
        x: -cropX,
        y: -cropY,
        width: originalWidth,
        height: originalHeight,
      });
    }

    // 7. Save and Send
    const croppedPdfBytes = await newDoc.save();
    const outputName = `cropped_selection_${req.file.originalname}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(croppedPdfBytes));

    // Cleanup
    await fs.unlink(uploadedPath).catch(() => {});
    console.log("✅ Custom crop successful");

  } catch (err) {
    console.error('❌ Crop PDF Error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to crop PDF: ' + err.message });
  }
});


// ------------------ PDF EDIT ENDPOINT - FULLY FIXED ✅ ------------------
// ------------------ PDF EDIT ENDPOINT - 100% FIXED ✅ ------------------
router.post('/edit-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('📥 Edit PDF request received...');

    if (!req.file || !req.body.editData) {
      console.log('❌ Missing file or edits');
      return res.status(400).json({ error: 'Missing file or edits' });
    }

    uploadedPath = req.file.path;
    const editData = JSON.parse(req.body.editData);
    const edits = editData.edits || [];

    console.log(`📝 Applying ${edits.length} edits to PDF`);

    // Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    console.log(`📄 PDF loaded with ${pages.length} pages`);

    // Process each edit
    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i];
      console.log(`🔧 Processing edit ${i + 1}/${edits.length}:`, edit.type, 'on page', edit.pageIndex);

      if (edit.pageIndex >= pages.length) {
        console.warn(`⚠️ Skipping edit ${i}: Invalid page ${edit.pageIndex}`);
        continue;
      }

      const page = pages[edit.pageIndex];

      try {
        if (edit.type === 'text') {
          await addTextToPage(page, pdfDoc, edit);
        } else if (edit.type === 'rectangle') {
          await addRectangleToPage(page, edit);
        }
      } catch (editError) {
        console.error(`❌ Edit ${i} failed:`, editError.message);
        // Continue with other edits
      }
    }

    // Save edited PDF
    const editedBytes = await pdfDoc.save();
    const outputName = `edited_${Date.now()}_${req.file.originalname}`;

    console.log('✅ PDF edited successfully!');

    // Send directly as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(editedBytes);

    // Log success
    await Operation.create({
      operation: 'edit-pdf',
      filename: req.file.originalname,
      status: 'success'
    });

  } catch (err) {
    console.error('❌ CRITICAL ERROR:', err);
    res.status(500).json({ error: 'Failed to edit PDF: ' + err.message });
  } finally {
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(console.error);
    }
  }
});

// ✅ FIXED: Text addition with CORRECT color format
async function addTextToPage(page, pdfDoc, edit) {
  const { x = 100, y = 700, text = '', fontSize = 12, color = '#000000' } = edit;

  console.log(`✏️ Adding text "${text.substring(0, 20)}..." at (${x}, ${y})`);

  // Embed font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ✅ FIXED: Create color using pdf-lib's standard method
  const colorRgb = rgbFromHex(color);

  // Draw text
  page.drawText(text, {
    x: Number(x),
    y: Number(y),
    size: Number(fontSize),
    font: font,
    color: colorRgb,
  });

  console.log('✅ Text added successfully');
}

// ✅ FIXED: Rectangle addition with CORRECT color format
async function addRectangleToPage(page, edit) {
  const { x = 100, y = 700, width = 100, height = 50, color = '#FF0000' } = edit;

  console.log(`📦 Adding rectangle at (${x}, ${y}) size ${width}x${height}`);

  // ✅ FIXED: Create color using pdf-lib's standard method
  const colorRgb = rgbFromHex(color);

  // Draw rectangle
  page.drawRectangle({
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height),
    color: colorRgb,
    borderColor: colorRgb,
    borderWidth: 2,
  });

  console.log('✅ Rectangle added successfully');
}

// ✅ FIXED: CORRECT color conversion for pdf-lib
function rgbFromHex(hex) {
  // Remove # if present
  let cleanHex = hex.replace('#', '');

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }

  // Handle 6-digit hex
  if (cleanHex.length !== 6) {
    console.warn('⚠️ Invalid hex color, using black:', hex);
    return rgb(0, 0, 0);
  }

  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  // ✅ PDF-LIB EXPECTS 0-1 RANGE
  return rgb(r / 255, g / 255, b / 255);
}



// ✅ REQUIRED: rgb function (must be after hexToRgb)
// function rgb(r, g, b) {c
//   return { r, g, b };
// }

// ------------------ FIXED HELPER FUNCTIONS ✅ ------------------
async function addTextToPDF(pdfDoc, edit) {
  try {
    const { pageIndex, x = 50, y = 750, text = '', fontSize = 12, color = '#000000' } = edit;

    if (!text.trim()) {
      console.warn('⚠️ Empty text skipped');
      return;
    }

    if (pageIndex >= pdfDoc.getPageCount()) {
      console.warn('⚠️ Invalid page index:', pageIndex);
      return;
    }

    const page = pdfDoc.getPage(pageIndex);
    const helveticaFont = await pdfDoc.embedFont('Helvetica');

    // Convert hex color to RGB (0-1 scale for pdf-lib)
    const rgbColor = hexToRgb(color);

    console.log(`✏️ Adding text: "${text.substring(0, 30)}..." at (${x}, ${y})`);

    page.drawText(text, {
      x: parseFloat(x),
      y: parseFloat(y),
      size: parseFloat(fontSize),
      font: helveticaFont,
      color: rgbColor
    });

    console.log('✅ Text added successfully');
  } catch (error) {
    console.error('❌ Text addition failed:', error);
    throw error;
  }
}

async function addRectangleToPDF(pdfDoc, edit) {
  try {
    const { pageIndex, x = 50, y = 750, width = 100, height = 50, color = '#FF0000' } = edit;

    if (pageIndex >= pdfDoc.getPageCount()) {
      console.warn('⚠️ Invalid page index:', pageIndex);
      return;
    }

    const page = pdfDoc.getPage(pageIndex);
    const rgbColor = hexToRgb(color);

    console.log(`📦 Adding rectangle: (${x}, ${y}) ${width}x${height}`);

    page.drawRectangle({
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
      color: rgbColor,
      borderWidth: 1,
      borderColor: rgbColor
    });

    console.log('✅ Rectangle added successfully');
  } catch (error) {
    console.error('❌ Rectangle addition failed:', error);
    throw error;
  }
}

// ✅ FIXED: Correct hexToRgb function for pdf-lib
// function hexToRgb(hex) {
//   // Remove # if present
//   hex = hex.replace('#', '');

//   // Handle 3-digit hex
//   if (hex.length === 3) {
//     hex = hex.split('').map(char => char + char).join('');
//   }

//   if (hex.length !== 6) {
//     console.warn('⚠️ Invalid hex color:', hex);
//     return { r: 0, g: 0, b: 0 };
//   }

//   const r = parseInt(hex.substring(0, 2), 16) / 255;
//   const g = parseInt(hex.substring(2, 4), 16) / 255;
//   const b = parseInt(hex.substring(4, 6), 16) / 255;

//   return { r, g, b };
// }

// ------------------ PDF PAGE COUNT ENDPOINT (FIXED) ------------------
router.post('/pdf-page-count', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    console.log('📥 Page count request received...');
    console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Validate file type and size
    if (!req.file.originalname.toLowerCase().match(/\.pdf$/i)) {
      console.log('❌ Invalid file type:', req.file.originalname);
      await fs.unlink(req.file.path).catch(() => { });
      return res.status(400).json({ error: 'Please upload a valid .pdf file' });
    }

    if (req.file.size > 50 * 1024 * 1024) { // 50MB limit
      console.log('❌ File too large:', req.file.size);
      await fs.unlink(req.file.path).catch(() => { });
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB' });
    }

    uploadedPath = req.file.path;
    console.log('📄 Loading PDF from:', uploadedPath);

    // Load PDF with encryption ignore
    const pdfBytes = await fs.readFile(uploadedPath);
    console.log('📊 PDF bytes loaded:', pdfBytes.length);

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    console.log('✅ Page count successful:', pageCount);

    // Send JSON response FIRST
    res.json({ pageCount });

    // Cleanup AFTER response (but since it's async, use finally for safety)
    await fs.unlink(uploadedPath).catch(console.error);

  } catch (err) {
    console.error('❌ Page count error:', err.message);
    console.error('Full stack:', err.stack); // Log full error for debugging

    // Always send JSON error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to get page count: ' + err.message });
    } else {
      // Fallback if headers sent (rare)
      res.end(JSON.stringify({ error: 'Server error during PDF processing' }));
    }

    // Cleanup on error
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(console.error);
    }
  }
});

// ------------------ HELPER FUNCTIONS FOR PDF EDITING ------------------
async function addTextToPDF(pdfDoc, edit) {
  const { pageIndex, x, y, text, fontSize = 12, color = '#000000' } = edit;

  if (pageIndex >= pdfDoc.getPageCount()) {
    console.warn('⚠️ Page index out of bounds:', pageIndex);
    return;
  }

  const page = pdfDoc.getPage(pageIndex);
  const helveticaFont = await pdfDoc.embedFont('Helvetica');

  // Convert hex color to rgb
  const hexColor = color.startsWith('#') ? color : `#${color}`;
  const rgbValues = hexToRgb(hexColor);

  console.log(`✏️ Adding text "${text.substring(0, 20)}..." at (${x}, ${y})`);

  page.drawText(text, {
    x: parseFloat(x),
    y: parseFloat(y),
    size: parseFloat(fontSize),
    font: helveticaFont,
    color: rgbValues
  });
}

async function addImageToPDF(pdfDoc, edit) {
  const { pageIndex, x, y, width, height, imageData } = edit;
  const page = pdfDoc.getPage(pageIndex);

  // Convert base64 image data to bytes
  const imageBytes = Buffer.from(imageData.split(',')[1], 'base64');

  let image;
  try {
    image = await pdfDoc.embedPng(imageBytes); // Try PNG first
  } catch {
    image = await pdfDoc.embedJpg(imageBytes); // Fallback to JPG
  }

  page.drawImage(image, {
    x: parseFloat(x),
    y: parseFloat(y),
    width: parseFloat(width),
    height: parseFloat(height)
  });
}

async function addRectangleToPDF(pdfDoc, edit) {
  const { pageIndex, x, y, width, height, color = '#FF0000' } = edit;

  if (pageIndex >= pdfDoc.getPageCount()) {
    console.warn('⚠️ Page index out of bounds:', pageIndex);
    return;
  }

  const page = pdfDoc.getPage(pageIndex);
  const hexColor = color.startsWith('#') ? color : `#${color}`;
  const rgbValues = hexToRgb(hexColor);

  console.log(`📦 Adding rectangle at (${x}, ${y}) size ${width}x${height}`);

  page.drawRectangle({
    x: parseFloat(x),
    y: parseFloat(y),
    width: parseFloat(width),
    height: parseFloat(height),
    color: rgbValues
  });
}

async function removePageFromPDF(pdfDoc, edit) {
  const { pageIndex } = edit;
  pdfDoc.removePage(parseInt(pageIndex));
}

// function hexToRgb(hex) {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result ? {
//     r: parseInt(result[1], 16) / 255,
//     g: parseInt(result[2], 16) / 255,
//     b: parseInt(result[3], 16) / 255,
//   } : { r: 0, g: 0, b: 0 };
// }

// ✅ FIXED: rgb helper for pdf-lib
// function rgb(r, g, b) {
//   return { r, g, b };
// }



// Helper function to avoid repeating Operation.create
async function logOperation(op, filename, status) {
  try {
    await Operation.create({ operation: op, filename, status });
  } catch (err) {
    console.error('Failed to log operation:', err);
  }
}

// Rotate✅, Edit PDF, Crop✅

module.exports = router;