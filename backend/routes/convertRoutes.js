// Word → PDF, JPG → PDF, PDF → PPT, PDF → JPG, PDF → Excel, PPT → PDF, Excel → PDF

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const htmlToPdfMake = require('html-to-pdfmake');
const { JSDOM } = require('jsdom');
const Poppler = require('pdf-poppler');
const PptxGenJS = require('pptxgenjs');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const fsBase = require('fs');
// const { PDFDocument, StandardFonts } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const PdfPrinter = require('pdfmake');
const Operation = require('../models/Operation');
const upload = require('../config/upload');
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { getFontAndStyle, calculatePosition, hexToRgb, getCellStyles } = require('../utils/pdfHelpers');

const fonts = { Roboto: { normal: path.join(__dirname, '../fonts', 'Roboto-Regular.ttf'), bold: path.join(__dirname, '../fonts', 'Roboto-Medium.ttf'), italics: path.join(__dirname, '../fonts', 'Roboto-Italic.ttf'), bolditalics: path.join(__dirname, '../fonts', 'Roboto-MediumItalic.ttf') }};
const printer = new PdfPrinter(fonts);

// PDF → Word
router.post('/pdf-to-word', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    uploadedPath = req.file.path;
    const dataBuffer = await fs.readFile(uploadedPath);
    const pdfData = await pdfParse(dataBuffer);
    const lines = pdfData.text.split('\n').map(l => l.trim()).filter(Boolean);
    const doc = new Document({ sections: [{ children: lines.map(text => new Paragraph({ children: [new TextRun(text)] })) }] });
    const buffer = await Packer.toBuffer(doc);
    const outputName = req.file.originalname.replace(/.pdf$/i, '') + '.docx';
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${outputName}"` });
    res.send(buffer);
    await Operation.create({ operation: 'pdf-to-word', filename: req.file.originalname, status: 'success' });
    await fs.unlink(uploadedPath);
  } catch (err) {
    console.error('PDF → Word error:', err);
    await Operation.create({ operation: 'pdf-to-word', filename: req.file?.originalname || 'unknown', status: 'failed' });
    if (uploadedPath) await fs.unlink(uploadedPath);
    res.status(500).json({ error: 'Failed to convert PDF to Word' });
  }
});


router.post('/word-to-pdf', upload.single('wordFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No Word file uploaded' });
    if (!req.file.originalname.match(/.docx$/i)) return res.status(400).json({ error: 'Only .docx files are supported' });
    uploadedPath = req.file.path;
    const result = await mammoth.convertToHtml({ path: uploadedPath });
    let html = result.value.replace(/<img[^>]*>/gi, "");
    const dom = new JSDOM('');
    const pdfmakeContent = htmlToPdfMake(html, { window: dom.window });
    const docDefinition = { content: pdfmakeContent, defaultStyle: { font: 'Roboto' } };
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const outputName = req.file.originalname.replace(/.docx$/i, '.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
    await Operation.create({ operation: 'word-to-pdf', filename: req.file.originalname, status: 'success' });
    await fs.unlink(uploadedPath);
  } catch (err) {
    console.error("Word→PDF error:", err);
    await Operation.create({ operation: 'word-to-pdf', filename: req.file?.originalname || 'unknown', status: 'failed' }).catch(() => {});
    if (uploadedPath) await fs.unlink(uploadedPath);
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});


// ------------------ PDF → PowerPoint ------------------
router.post('/pdf-to-ppt', upload.single('pdfFile'), async (req, res) => {
  const tempDir = path.join(__dirname, 'temp_images');
  let uploadedPath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

    uploadedPath = req.file.path;
    await fs.mkdir(tempDir, { recursive: true });

    // Convert PDF → PNG images
    const options = { format: 'png', out_dir: tempDir, out_prefix: 'page', page: null, dpi: 300 };
    await Poppler.convert(uploadedPath, options);

    let imageFiles = await fs.readdir(tempDir);
    imageFiles = imageFiles
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
      .map(f => path.join(tempDir, f));

    if (imageFiles.length === 0) throw new Error('No images generated from PDF');

    // Create PPTX
    const pptx = new PptxGenJS();
    imageFiles.forEach(img => {
      const slide = pptx.addSlide();
      slide.addImage({ path: img, x: 0, y: 0, w: '100%', h: '100%' });
    });

    const outputName = req.file.originalname.replace(/\.pdf$/i, '.pptx');
    const outputPath = path.join('uploads', outputName);
    await pptx.writeFile({ fileName: outputPath });

    // Send to frontend
    res.download(outputPath, outputName, async () => {
      await fs.unlink(uploadedPath).catch(() => { });
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
      await fs.unlink(outputPath).catch(() => { });
    });

  } catch (err) {
    console.error('PDF → PPT error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    res.status(500).json({ error: 'Failed to convert PDF to PowerPoint: ' + err.message });
  }
});

// ------------------ JPG → PDF ------------------
router.post('/jpg-to-pdf', upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      await Operation.create({ operation: 'jpg-to-pdf', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Create a new PDF Document
    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const filePath = file.path;
      const imageBytes = await fs.readFile(filePath);

      let image;
      // We try to embed as JPG. If the user uploads a PNG by mistake, 
      // we try to handle it, otherwise catch the error.
      try {
        if (file.mimetype === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } catch (e) {
        console.warn(`Skipping file ${file.originalname} - format not supported.`);
        continue;
      }

      // Get image dimensions
      const { width, height } = image.scale(1);

      // Add a page with the same dimensions as the image
      const page = pdfDoc.addPage([width, height]);

      // Draw the image on the page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const outputName = `converted_images_${Date.now()}.pdf`;
    const outputPath = path.join('uploads', outputName);

    await fs.writeFile(outputPath, pdfBytes);

    // Log operation
    await Operation.create({
      operation: 'jpg-to-pdf',
      filename: `${req.files.length} files`,
      status: 'success'
    });

    res.download(outputPath, outputName, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Error sending converted PDF' });
      }
      // Cleanup all uploaded images and the output PDF
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
      await fs.unlink(outputPath).catch(console.error);
    });

  } catch (err) {
    console.error('JPG → PDF error:', err);
    await Operation.create({
      operation: 'jpg-to-pdf',
      filename: 'batch',
      status: 'failed'
    });

    // Cleanup uploaded files on error
    if (req.files) {
      req.files.forEach(f => fs.unlink(f.path).catch(() => { }));
    }

    res.status(500).json({ error: 'Failed to convert images to PDF: ' + err.message });
  }
});


// ------------------ PDF → JPG ------------------
router.post('/pdf-to-jpg', upload.single('pdfFile'), async (req, res) => {
  const tempDir = path.join('uploads', 'temp_images', `jpg_${Date.now()}`);
  let uploadedPath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

    uploadedPath = req.file.path;

    await fs.mkdir(tempDir, { recursive: true });

    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',     // ALWAYS USE SIMPLE PREFIX
      page: null,
      dpi: 150
    };

    await Poppler.convert(uploadedPath, options);

    let imageFiles = await fs.readdir(tempDir);

    imageFiles = imageFiles
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => {
        const nA = parseInt(a.match(/\d+/)[0]);
        const nB = parseInt(b.match(/\d+/)[0]);
        return nA - nB;
      })
      .map(f => path.join(tempDir, f));

    if (imageFiles.length === 0)
      return res.status(500).json({ error: 'Poppler failed to generate images. Install poppler correctly.' });

    const zipName = req.file.originalname.replace(/\.pdf$/i, '') + '_jpg_images.zip';
    const zipPath = path.join('uploads', zipName);
    const output = fsBase.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const img of imageFiles) {
      archive.file(img, { name: path.basename(img).replace('.png', '.jpg') });
    }

    await new Promise((resolve, reject) => {
      archive.on('finish', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    res.download(zipPath, zipName, async () => {
      await fs.unlink(uploadedPath).catch(() => { });
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
      await fs.unlink(zipPath).catch(() => { });
    });

  } catch (err) {
    console.error('PDF → JPG error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ------------------ PDF → Excel (simple table extraction) ------------------
// ------------------ PDF → Excel (simple table extraction) ------------------
// Note: We use fsBase for the createReadStream needed for streaming the response.
router.post('/pdf-to-excel', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      await Operation.create({ operation: 'pdf-to-excel', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    uploadedPath = req.file.path;

    // --- Conversion Logic (Same as before) ---
    const dataBuffer = await fs.readFile(uploadedPath);
    const pdfData = await pdfParse(dataBuffer);
    const rawText = pdfData.text || "";
    if (!rawText.trim()) throw new Error("PDF contains no readable text.");

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const splitLine = (line) => {
      if (line.includes('\t')) return line.split('\t').map(c => c.trim());
      if (line.includes('|')) return line.split('|').map(c => c.trim());
      if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);
      return [line];
    };

    let rows = lines.map(splitLine).filter(r => r.length > 0);
    const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
    rows = rows.map(r => {
      while (r.length < maxCols) r.push("");
      return r;
    });

    if (maxCols === 0 && rows.length > 0) {
      // Log this as a soft failure if the text extraction was poor
      console.warn("Conversion warning: PDF text extracted but columns could not be reliably split.");
    }
    // --- End Conversion Logic ---

    // 4. Create Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    rows.forEach(r => worksheet.addRow(r));

    const outputName = req.file.originalname.replace(/\.pdf$/i, '') + ".xlsx";
    outputPath = path.join("uploads", outputName);

    await workbook.xlsx.writeFile(outputPath);

    await Operation.create({
      operation: "pdf-to-excel",
      filename: req.file.originalname,
      status: "success"
    });

    // 5. MANUAL STREAMING FOR RELIABILITY (Replaces res.download)
    const fileStream = fsBase.createReadStream(outputPath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);

    // Pipe the file stream to the response stream
    fileStream.pipe(res);

    // Crucial: Handle stream errors and cleanup when the response finishes
    fileStream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      // Don't send status if headers are already sent, but ensure client gets some closure
      if (!res.headersSent) {
        res.status(500).json({ error: 'Server failed to stream the output file.' });
      }
    });

    res.on('finish', async () => {
      console.log('Download complete. Cleaning up files.');
      // Cleanup files after the client has received the response
      try {
        if (uploadedPath) await fs.unlink(uploadedPath).catch(() => { });
        if (outputPath) await fs.unlink(outputPath).catch(() => { });
      } catch (cleanupErr) {
        console.error('Final cleanup failed:', cleanupErr);
      }
    });


  } catch (err) {
    console.error("PDF → Excel error:", err);

    await Operation.create({
      operation: 'pdf-to-excel',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    });

    // Cleanup uploaded file on main error path
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(cleanErr => console.error("Cleanup error:", cleanErr));
    }

    // Send JSON error response (This is what the client fix expects)
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to convert PDF to Excel: " + err.message });
    }
  }
});


// ------------------ PowerPoint → PDF (NEW FEATURE) ------------------
// ------------------ PowerPoint → PDF (FIXED & WORKING) ------------------
router.post('/ppt-to-pdf', upload.single('pptFile'), async (req, res) => {
  let uploadedPath = null;
  let tempDir = null;

  try {
    // Validation
    if (!req.file) {
      await Operation.create({ operation: 'ppt-to-pdf', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.file.originalname.toLowerCase().match(/\.pptx?$/i)) {
      await Operation.create({ operation: 'ppt-to-pdf', filename: req.file.originalname, status: 'failed' });
      return res.status(400).json({ error: 'Please upload a valid .pptx or .ppt file' });
    }

    uploadedPath = req.file.path;
    tempDir = path.join(__dirname, 'temp_ppt', Date.now().toString());
    await fs.mkdir(tempDir, { recursive: true });

    console.log('🔄 Converting PPTX:', req.file.originalname);

    // Method 1: Try using PptxGenJS to render slides as images
    let slideImages = [];

    try {
      // Extract slides using PptxGenJS
      const pptx = new PptxGenJS();
      await pptx.loadFile(uploadedPath); // Load the PPTX file

      const slideCount = pptx.getSlideCount();
      console.log(`📊 Found ${slideCount} slides`);

      for (let i = 0; i < slideCount; i++) {
        const tempImagePath = path.join(tempDir, `slide_${i + 1}.png`);

        // Render slide as PNG
        const slideImageBuffer = await pptx.renderSlideAsImage(i);
        await fs.writeFile(tempImagePath, slideImageBuffer);

        slideImages.push(tempImagePath);
        console.log(`✅ Slide ${i + 1} rendered`);
      }
    } catch (pptxError) {
      console.log('⚠️ PptxGenJS method failed, trying ZIP extraction method...');

      // Method 2: Fallback - Extract images from PPTX ZIP structure
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(uploadedPath);

      // Extract to temp directory
      zip.extractAllTo(tempDir, true);

      // Find slide images in PPTX structure
      const pptSlidesDir = path.join(tempDir, 'ppt', 'slides');
      const mediaDir = path.join(tempDir, 'ppt', 'media');

      let allImages = [];

      // Check slides directory
      if (await fs.access(pptSlidesDir).then(() => true).catch(() => false)) {
        const slideFiles = await fs.readdir(pptSlidesDir);
        allImages = allImages.concat(
          slideFiles
            .filter(f => f.match(/slide\d+\.xml/i))
            .map(f => path.join(pptSlidesDir, f))
        );
      }

      // Check media directory for embedded images
      if (await fs.access(mediaDir).then(() => true).catch(() => false)) {
        const mediaFiles = await fs.readdir(mediaDir);
        allImages = allImages.concat(
          mediaFiles
            .filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f))
            .sort((a, b) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0');
              const numB = parseInt(b.match(/\d+/)?.[0] || '0');
              return numA - numB;
            })
            .map(f => path.join(mediaDir, f))
        );
      }

      slideImages = allImages.slice(0, 20); // Limit to first 20 slides
    }

    if (slideImages.length === 0) {
      throw new Error('No slides found in the PowerPoint presentation');
    }

    console.log(`📸 Found ${slideImages.length} images to convert`);

    // Create PDF from images
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < slideImages.length; i++) {
      const imgPath = slideImages[i];

      try {
        const imgBytes = await fs.readFile(imgPath);
        const ext = path.extname(imgPath).toLowerCase();

        let image;
        if (ext === '.png') {
          image = await pdfDoc.embedPng(imgBytes);
        } else {
          image = await pdfDoc.embedJpg(imgBytes);
        }

        // Standard PowerPoint slide size (10x5.625 inches at 72 DPI)
        const pageWidth = 720;  // 10 inches
        const pageHeight = 405; // 5.625 inches

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Scale image to fit page while maintaining aspect ratio
        const { width: imgWidth, height: imgHeight } = image.scale(1);
        const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });

      } catch (imgError) {
        console.warn(`⚠️ Failed to process image ${imgPath}:`, imgError.message);
        continue;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const outputName = req.file.originalname.replace(/\.pptx?$/i, '.pdf');

    // Log success
    await Operation.create({
      operation: 'ppt-to-pdf',
      filename: req.file.originalname,
      status: 'success'
    });

    console.log(`✅ PDF created: ${outputName} (${slideImages.length} slides)`);

    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(pdfBytes);

  } catch (err) {
    console.error('❌ PPTX → PDF Error:', err);

    await Operation.create({
      operation: 'ppt-to-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    });

    res.status(500).json({
      error: 'Failed to convert PowerPoint to PDF',
      details: err.message
    });
  } finally {
    // Cleanup
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(() => { });
    }
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
  }
});



// ------------------ Excel → PDF (PROFESSIONAL LANDSCAPE FIX) ------------------
router.post('/excel-to-pdf', upload.single('excelFile'), async (req, res) => {
    let uploadedPath = null;

    try {
        console.log('📥 Professional Excel to PDF request received (Landscape Mode)');

        // --- 1. Validation ---
        if (!req.file || !req.file.originalname.toLowerCase().match(/\.xlsx?$/i)) {
            return res.status(400).json({ error: 'Please upload a valid .xlsx or .xls file' });
        }
        uploadedPath = req.file.path;

        // --- 2. Load Excel ---
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedPath);
        const worksheets = workbook.worksheets;

        // --- 3. Setup PDF (Landscape A4) ---
        const pdfDoc = await PDFDocument.create();
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Landscape Dimensions (swapped width/height)
        const PAGE_WIDTH = 841.89;
        const PAGE_HEIGHT = 595.28;
        const MARGIN = 30; // Slightly smaller margin for max space
        const PAGE_CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN);
        const BASE_ROW_HEIGHT = 16;

        let totalPageIndex = 1;

        // --- INTERNAL HELPERS ---

        // Helper: Convert Hex to RGB safely
        const safeHexToRgb = (hex) => {
            try {
                // Remove '#' if present
                const cleanHex = hex.replace('#', '');
                // Parse hex to r, g, b (0-255)
                const bigint = parseInt(cleanHex, 16);
                const r = (bigint >> 16) & 255;
                const g = (bigint >> 8) & 255;
                const b = bigint & 255;
                return rgb(r / 255, g / 255, b / 255);
            } catch (e) {
                return rgb(0, 0, 0);
            }
        };

        // Helper: Draw Header (Title + Page Num)
        const drawPageHeader = (page, sheetName, pageNumber) => {
            // Sheet Title
            page.drawText(sheetName.substring(0, 60), {
                x: MARGIN,
                y: PAGE_HEIGHT - MARGIN + 10,
                size: 12,
                font: helveticaBold,
                color: rgb(0.2, 0.2, 0.2)
            });
            // Page Number
            const pageNumText = `Page ${pageNumber}`;
            const textWidth = helvetica.widthOfTextAtSize(pageNumText, 9);
            page.drawText(pageNumText, {
                x: PAGE_WIDTH - MARGIN - textWidth,
                y: PAGE_HEIGHT - MARGIN + 10,
                size: 9,
                font: helvetica,
                color: rgb(0.5, 0.5, 0.5)
            });
            // Header Line
            page.drawLine({
                start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 2 },
                end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 2 },
                thickness: 1,
                color: rgb(0.7, 0.7, 0.7)
            });
        };

        // Helper: Draw Single Cell
        const drawCell = (page, text, x, y, w, h, isHeader, fillColor) => {
            // Background
            if (fillColor) {
                page.drawRectangle({
                    x, y, width: w, height: h,
                    color: fillColor,
                    borderColor: rgb(0.8, 0.8, 0.8),
                    borderWidth: 0.5,
                });
            } else {
                // Border only
                page.drawRectangle({
                    x, y, width: w, height: h,
                    borderColor: rgb(0.8, 0.8, 0.8),
                    borderWidth: 0.5,
                });
            }

            // Text
            if (text) {
                const fontSize = isHeader ? 8 : 7; // Smaller font for data density
                const font = isHeader ? helveticaBold : helvetica;
                
                // Truncate text to fit width
                // Approx width char factor ~0.5 of font size
                const maxChars = Math.floor((w - 4) / (fontSize * 0.5));
                let cleanText = String(text).trim();
                
                if (cleanText.length > maxChars) {
                    cleanText = cleanText.substring(0, maxChars - 1) + '…';
                }

                // Center text vertically
                const textY = y + (h / 2) - (fontSize / 2.5);
                
                page.drawText(cleanText, {
                    x: x + 3, // Padding left
                    y: textY,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }
        };

        // --- 4. Process Worksheets ---
        for (const worksheet of worksheets) {
            // Determine dimensions
            let numCols = worksheet.columnCount;
            if (numCols === 0) {
                worksheet.eachRow((row) => { numCols = Math.max(numCols, row.cellCount); });
            }
            if (numCols === 0 || worksheet.rowCount === 0) continue;

            const sheetName = worksheet.name || `Sheet`;

            // Calculate Optimal Widths
            let colWidths = [];
            let totalContentWidth = 0;

            // Sample first 50 rows to find max width per column
            for (let c = 1; c <= numCols; c++) {
                let maxLen = 0;
                // Header length
                const headerVal = worksheet.getRow(1).getCell(c).value;
                if (headerVal) maxLen = String(headerVal).length;

                // Data length
                for (let r = 2; r <= Math.min(worksheet.rowCount, 50); r++) {
                    const val = worksheet.getRow(r).getCell(c).value;
                    if (val) {
                        const len = String(val).length;
                        if (len > maxLen) maxLen = len;
                    }
                }
                // Base width: chars * 4.5pts + padding. Min 25, Max 120.
                let w = Math.min(Math.max(maxLen * 4.5 + 8, 25), 120);
                colWidths.push(w);
                totalContentWidth += w;
            }

            // Scale widths to fit Landscape Page
            const scaleFactor = Math.min(1, PAGE_CONTENT_WIDTH / totalContentWidth);
            colWidths = colWidths.map(w => w * scaleFactor);

            // Start Output
            let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            let currentY = PAGE_HEIGHT - MARGIN - BASE_ROW_HEIGHT;
            drawPageHeader(currentPage, sheetName, totalPageIndex);

            // Loop Rows
            for (let r = 1; r <= worksheet.rowCount; r++) {
                const row = worksheet.getRow(r);
                const isHeader = (r === 1);
                
                // Pagination Check
                if (currentY < MARGIN + BASE_ROW_HEIGHT) {
                    totalPageIndex++;
                    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    drawPageHeader(currentPage, sheetName, totalPageIndex);
                    currentY = PAGE_HEIGHT - MARGIN - BASE_ROW_HEIGHT;

                    // Repeat Header on new page
                    if (!isHeader) {
                        const headerRow = worksheet.getRow(1);
                        let hX = MARGIN;
                        for (let c = 0; c < numCols; c++) {
                            let cellVal = headerRow.getCell(c + 1).value || '';
                            if(typeof cellVal === 'object') cellVal = cellVal.result || ''; // Handle formulas
                            
                            // Header Style (Light Gray Background)
                            drawCell(currentPage, cellVal, hX, currentY, colWidths[c], BASE_ROW_HEIGHT, true, rgb(0.9, 0.9, 0.9));
                            hX += colWidths[c];
                        }
                        currentY -= BASE_ROW_HEIGHT;
                    }
                }

                // Draw Current Row
                // Skip drawing original header if we just did a pagination header (rare edge case, usually safe)
                
                let rX = MARGIN;
                for (let c = 0; c < numCols; c++) {
                    let cellVal = row.getCell(c + 1).value;
                    if (cellVal && typeof cellVal === 'object') {
                        if(cellVal.text) cellVal = cellVal.text; // Rich text
                        else if(cellVal.result !== undefined) cellVal = cellVal.result; // Formula
                    }
                    if (cellVal === null || cellVal === undefined) cellVal = '';

                    // Header gets gray background, Data gets white (or alternate if you want)
                    const bg = isHeader ? rgb(0.9, 0.9, 0.9) : null;
                    
                    drawCell(currentPage, cellVal, rX, currentY, colWidths[c], BASE_ROW_HEIGHT, isHeader, bg);
                    rX += colWidths[c];
                }
                currentY -= BASE_ROW_HEIGHT;
            }
            totalPageIndex++;
        }

        // --- 5. Finalize ---
        const pdfBytes = await pdfDoc.save();
        const outputName = req.file.originalname.replace(/\.xlsx?$/i, '_Professional.pdf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
        res.send(Buffer.from(pdfBytes));

        // Cleanup
        await Operation.create({ operation: 'excel-to-pdf', filename: req.file.originalname, status: 'success' });
        if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});

    } catch (err) {
        console.error('❌ Excel PDF Error:', err);
        if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
        res.status(500).json({ error: 'Conversion failed: ' + err.message });
    }
});


// jpg-to-pdf✅, pdf-to-ppt✅, pdf-to-jpg✅, pdf-to-excel✅, ppt-to-pdf✅, excel-to-pdf✅

module.exports = router;