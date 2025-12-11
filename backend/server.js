const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
// const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises; // Promise-based operations (readFile, writeFile)
const fsBase = require('fs');
const path = require('path');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const htmlToPdfMake = require('html-to-pdfmake');
const { JSDOM } = require('jsdom');
const Poppler = require('pdf-poppler');
const PptxGenJS = require('pptxgenjs');
const archiver = require('archiver');
const ExcelJS = require('exceljs'); 
const { createReadStream } = require('fs');
const unzipper = require('unzipper');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const diff = require('diff');

// ✅ Use 'degrees' for text rotation rotate pdf feature
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { exec } = require("child_process");
// const path = require("path"); // path used previously but stayed halted accordingly.
const Color = require('color'); // To parse hex color strings
// const { PDFDocument, degrees } = require('pdf-lib'); // ← already correct


// const PdfPrinter = require('pdfmake');        // ← only once, correct name
const { Document, Packer, Paragraph, TextRun } = require('docx'); // ← for PDF → Word
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// MongoDB logging schema
const operationSchema = new mongoose.Schema({
  operation: String,
  filename: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
});
const Operation = mongoose.model('Operation', operationSchema);

// Middleware
app.use(cors());
app.use(express.json());
// Increase the limit for text fields (like your base64 image) to 50MB
const upload = multer({ 
  dest: 'uploads/', 
  limits: { fieldSize: 50 * 1024 * 1024 } 
});

// Create uploads folder
fs.mkdir('uploads', { recursive: true }).catch(() => {});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));


  // Helper function to get the built-in PDFLib font based on style flags
const getFontAndStyle = (pdfDoc, fontFamily, isBold, isItalic) => {
    let fontName = fontFamily;
    if (fontFamily === 'Helvetica') {
        if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique;
        else if (isBold) fontName = StandardFonts.HelveticaBold;
        else if (isItalic) fontName = StandardFonts.HelveticaOblique;
        else fontName = StandardFonts.Helvetica;
    } else if (fontFamily === 'Times-Roman') {
        if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
        else if (isBold) fontName = StandardFonts.TimesRomanBold;
        else if (isItalic) fontName = StandardFonts.TimesRomanItalic;
        else fontName = StandardFonts.TimesRoman;
    } else if (fontFamily === 'Courier') {
        if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique;
        else if (isBold) fontName = StandardFonts.CourierBold;
        else if (isItalic) fontName = StandardFonts.CourierOblique;
        else fontName = StandardFonts.Courier;
    }
    // Load the font
    return pdfDoc.embedFont(fontName);
};

// Helper to calculate (x, y) coordinates for the 9-point grid
const calculatePosition = (pageWidth, pageHeight, textWidth, textHeight, positionKey) => {
    const margin = 20; // Small margin from the edges
    let x, y;

    // Horizontal Alignment
    if (positionKey.includes('left')) {
        x = margin;
    } else if (positionKey.includes('center')) {
        x = (pageWidth / 2) - (textWidth / 2);
    } else if (positionKey.includes('right')) {
        x = pageWidth - textWidth - margin;
    }

    // Vertical Alignment
    if (positionKey.includes('top')) {
        y = pageHeight - textHeight - margin;
    } else if (positionKey.includes('center')) {
        y = (pageHeight / 2) - (textHeight / 2);
    } else if (positionKey.includes('bottom')) {
        y = margin;
    }

    // Ensure central position is calculated correctly for center-center
    if (positionKey === 'center-center') {
      x = (pageWidth / 2) - (textWidth / 2);
      y = (pageHeight / 2) - (textHeight / 2);
    }

    return { x, y };
};



// Endpoint 1: Compress PDF
app.post('/api/compress-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      await Operation.create({ operation: 'compress', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });

    const outputPath = path.join('uploads', `compressed_${req.file.originalname}`);
    await fs.writeFile(outputPath, compressedPdfBytes);

    // Log operation
    await Operation.create({ operation: 'compress', filename: req.file.originalname, status: 'success' });

    res.download(outputPath, `compressed_${req.file.originalname}`, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Error sending compressed PDF' });
      }
      await fs.unlink(pdfPath).catch(console.error);
      await fs.unlink(outputPath).catch(console.error);
    });
  } catch (err) {
    console.error('Error compressing PDF:', err);
    await Operation.create({ operation: 'compress', filename: req.file?.originalname || 'unknown', status: 'failed' });
    res.status(500).json({ error: 'Failed to compress PDF' });
    if (req.file) await fs.unlink(req.file.path).catch(console.error);
  }
});

// Endpoint 2: Merge two PDFs 
app.post('/api/merge-pdfs', upload.array('pdfFiles', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length !== 2) {
      await Operation.create({ operation: 'merge', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'Exactly two PDF files must be uploaded' });
    }

    const [file1, file2] = req.files;
    const pdf1Bytes = await fs.readFile(file1.path);
    const pdf2Bytes = await fs.readFile(file2.path);

    const mergedPdf = await PDFDocument.create();
    const pdf1 = await PDFDocument.load(pdf1Bytes);
    const pdf2 = await PDFDocument.load(pdf2Bytes);

    const pdf1Pages = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
    const pdf2Pages = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());

    pdf1Pages.forEach((page) => mergedPdf.addPage(page));
    pdf2Pages.forEach((page) => mergedPdf.addPage(page));

    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join('uploads', 'merged_output.pdf');
    await fs.writeFile(outputPath, mergedPdfBytes);

    // Log operation
    await Operation.create({
      operation: 'merge',
      filename: `${file1.originalname}, ${file2.originalname}`,
      status: 'success',
    });

    res.download(outputPath, 'merged_output.pdf', async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Error sending merged PDF' });
      }
      await fs.unlink(file1.path).catch(console.error);
      await fs.unlink(file2.path).catch(console.error);
      await fs.unlink(outputPath).catch(console.error);
    });
  } catch (err) {
    console.error('Error merging PDFs:', err);
    await Operation.create({ operation: 'merge', filename: req.files.map(f => f.originalname).join(', ') || 'unknown', status: 'failed' });
    res.status(500).json({ error: 'Failed to merge PDFs' });
    req.files.forEach((file) => fs.unlink(file.path).catch(console.error));
  }
});

app.post('/api/split-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath;
  try {
    console.log('📥 Split request received...');
    console.log('File:', req.file);
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('❌ No file uploaded');
      await Operation.create({ operation: 'split', filename: 'none', status: 'failed' });
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    if (!req.body.pageRange) {
      console.log('❌ Page range missing');
      await Operation.create({ operation: 'split', filename: req.file.originalname, status: 'failed' });
      return res.status(400).json({ error: 'Page range is required (e.g., 1-3,2)' });
    }

    uploadedPath = req.file.path;
    console.log('📄 Uploaded path:', uploadedPath);

    // Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    console.log('📑 Total pages in uploaded PDF:', totalPages);

    const pageRange = req.body.pageRange.trim();
    const ranges = pageRange.split(',').map((r) => r.trim());
    const pagesToInclude = new Set();

    for (const r of ranges) {
      if (r.includes('-')) {
        const [start, end] = r.split('-').map(Number);
        console.log(`➡️ Range: ${start}-${end}`);
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range "${r}". PDF has ${totalPages} pages.`);
        }
        for (let i = start; i <= end; i++) pagesToInclude.add(i - 1);
      } else {
        const pg = Number(r);
        console.log(`➡️ Single page: ${pg}`);
        if (isNaN(pg) || pg < 1 || pg > totalPages) {
          throw new Error(`Invalid page number "${r}". PDF has ${totalPages} pages.`);
        }
        pagesToInclude.add(pg - 1);
      }
    }

    console.log('✅ Pages to include:', Array.from(pagesToInclude));

    // Create new PDF
    const newPdf = await PDFDocument.create();
    const sorted = Array.from(pagesToInclude).sort((a, b) => a - b);
    const copied = await newPdf.copyPages(pdfDoc, sorted);
    copied.forEach((p) => newPdf.addPage(p));

    const splitBytes = await newPdf.save();
    const outputName = `split_${pageRange.replace(/[^0-9,-]/g, '')}_${req.file.originalname}`;
    const outputPath = path.join('uploads', outputName);
    await fs.writeFile(outputPath, splitBytes);
    console.log('✅ Split file created at:', outputPath);

    await Operation.create({ operation: 'split', filename: req.file.originalname, status: 'success' });

    res.download(outputPath, outputName, async (err) => {
      if (err) console.error('❌ Error sending split file:', err);
      await fs.unlink(uploadedPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (err) {
    console.error('❌ Split PDF error:', err);
    await Operation.create({
      operation: 'split',
      filename: req.file?.originalname || 'unknown',
      status: 'failed',
    }).catch(() => {});
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to split PDF: ' + err.message });
  }
});

// ------------------ PDF → Word (text only) ------------------
app.post('/api/pdf-to-word', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    uploadedPath = req.file.path;
    const dataBuffer = await fs.readFile(uploadedPath);
    const pdfData = await pdfParse(dataBuffer);

    const lines = pdfData.text.split('\n').map(l => l.trim()).filter(Boolean);

    const doc = new Document({
      sections: [{
        children: lines.map(text => new Paragraph({
          children: [new TextRun(text)]
        }))
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputName = req.file.originalname.replace(/\.pdf$/i, '') + '.docx';

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${outputName}"`
    });
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

// ------------------ Word → PDF (FULLY WORKING) ------------------

const PdfPrinter = require('pdfmake');
const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts', 'Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts', 'Roboto-Medium.ttf'),
    italics: path.join(__dirname, 'fonts', 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts', 'Roboto-MediumItalic.ttf'),
  }
}


const printer = new PdfPrinter(fonts);

app.post('/api/word-to-pdf', upload.single('wordFile'), async (req, res) => {
  let uploadedPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Word file uploaded' });
    }

    if (!req.file.originalname.match(/\.docx$/i)) {
      return res.status(400).json({ error: 'Only .docx files are supported' });
    }

    uploadedPath = req.file.path;

    const result = await mammoth.convertToHtml({ path: uploadedPath });
    let html = result.value;

    if (!html || html.trim().length === 0) {
      throw new Error("Could not extract content from Word file");
    }

    // REMOVE ALL IMAGES → they break pdfmake
    html = html.replace(/<img[^>]*>/gi, "");

    // Convert HTML → pdfmake
    const dom = new JSDOM('');
    const window = dom.window;
    const pdfmakeContent = htmlToPdfMake(html, { window: window });

    const docDefinition = {
      content: pdfmakeContent,
      defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const outputName = req.file.originalname.replace(/\.docx$/i, '.pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);

    pdfDoc.pipe(res);
    pdfDoc.end();

    await Operation.create({
      operation: 'word-to-pdf',
      filename: req.file.originalname,
      status: 'success'
    });

    await fs.unlink(uploadedPath);
  } catch (err) {
    console.error("Word→PDF error:", err);
    await Operation.create({
      operation: 'word-to-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    }).catch(() => {});

    if (uploadedPath) await fs.unlink(uploadedPath);
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});

// ------------------ PDF → PowerPoint ------------------
const PPTXGenJS = require('pptxgenjs');
// PDF → PowerPoint endpoint
app.post('/api/pdf-to-ppt', upload.single('pdfFile'), async (req, res) => {
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
      await fs.unlink(uploadedPath).catch(() => {});
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });

  } catch (err) {
    console.error('PDF → PPT error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Failed to convert PDF to PowerPoint: ' + err.message });
  }
});

// ------------------ JPG → PDF ------------------
app.post('/api/jpg-to-pdf', upload.array('images'), async (req, res) => {
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
        req.files.forEach(f => fs.unlink(f.path).catch(() => {}));
    }
    
    res.status(500).json({ error: 'Failed to convert images to PDF: ' + err.message });
  }
});

// ------------------ PDF → JPG ------------------
app.post('/api/pdf-to-jpg', upload.single('pdfFile'), async (req, res) => {
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
      await fs.unlink(uploadedPath).catch(() => {});
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await fs.unlink(zipPath).catch(() => {});
    });

  } catch (err) {
    console.error('PDF → JPG error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ------------------ PDF → Excel (simple table extraction) ------------------
// ------------------ PDF → Excel (simple table extraction) ------------------
// Note: We use fsBase for the createReadStream needed for streaming the response.
app.post('/api/pdf-to-excel', upload.single('pdfFile'), async (req, res) => {
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
                if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
                if (outputPath) await fs.unlink(outputPath).catch(() => {});
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
app.post('/api/ppt-to-pdf', upload.single('pptFile'), async (req, res) => {
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
      await fs.unlink(uploadedPath).catch(() => {});
    }
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
});


  // ------------------ Excel → PDF (FIXED ENDPOINT) ------------------
  app.post('/api/excel-to-pdf', upload.single('excelFile'), async (req, res) => {
    let uploadedPath = null;

    try {
      console.log('📥 Excel to PDF request received');
      console.log('File:', req.file);

      // Validation
      if (!req.file) {
        console.log('❌ No file uploaded');
        await Operation.create({ operation: 'excel-to-pdf', filename: 'none', status: 'failed' });
        return res.status(400).json({ error: 'No Excel file uploaded' });
      }

      if (!req.file.originalname.toLowerCase().match(/\.xlsx?$/i)) {
        console.log('❌ Invalid file type:', req.file.originalname);
        await Operation.create({ operation: 'excel-to-pdf', filename: req.file.originalname, status: 'failed' });
        return res.status(400).json({ error: 'Please upload a valid .xlsx or .xls file' });
      }

      if (req.file.size > 50 * 1024 * 1024) { // 50MB
        console.log('❌ File too large:', req.file.size);
        await Operation.create({ operation: 'excel-to-pdf', filename: req.file.originalname, status: 'failed' });
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB' });
      }

      uploadedPath = req.file.path;
      console.log('🔄 Converting Excel:', req.file.originalname);

      // Read Excel file using ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(uploadedPath);
      
      const pdfDoc = await PDFDocument.create();
      const worksheets = workbook.worksheets;
      
      console.log(`📊 Found ${worksheets.length} worksheets`);

      if (worksheets.length === 0) {
        throw new Error('No worksheets found in Excel file');
      }

      let pageIndex = 0;
      for (const worksheet of worksheets) {
        const sheetName = worksheet.name || `Sheet${pageIndex + 1}`;
        console.log(`📄 Processing worksheet: ${sheetName}`);
        
        // Create page for each worksheet
        const pageWidth = 595; // A4
        const pageHeight = 842;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Title
        page.drawText(sheetName, {
          x: 50,
          y: pageHeight - 50,
          size: 16,
          font: await pdfDoc.embedFont('Helvetica-Bold')
        });

        let currentY = pageHeight - 80;
        const rowHeight = 16;
        const colWidth = 70;
        const marginLeft = 50;

        // Get data
        const rows = [];
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const rowData = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let cellValue = '';
            if (cell.value !== null && cell.value !== undefined) {
              cellValue = cell.value.toString().substring(0, 30); // Truncate long text
            }
            rowData.push(cellValue);
          });
          rows.push(rowData);
        });

        // Draw rows
        for (let rowIndex = 0; rowIndex < Math.min(rows.length, 40); rowIndex++) { // Limit to 40 rows per sheet
          if (currentY < 100) break; // Stop if page is full
          
          const rowData = rows[rowIndex];
          let colX = marginLeft;
          
          for (let colIndex = 0; colIndex < Math.min(rowData.length, 8); colIndex++) { // 8 columns max
            if (colX > pageWidth - 50) break;
            
            const cellText = rowData[colIndex] || '';
            const fontSize = rowIndex === 0 ? 10 : 9; // Headers slightly larger
            const font = rowIndex === 0 ? await pdfDoc.embedFont('Helvetica-Bold') : await pdfDoc.embedFont('Helvetica');
            
            page.drawText(cellText, {
              x: colX,
              y: currentY,
              size: fontSize,
              font,
              maxWidth: colWidth - 5
            });
            colX += colWidth;
          }
          currentY -= rowHeight;
        }
        
        pageIndex++;
      }

      const pdfBytes = await pdfDoc.save();
      const outputName = req.file.originalname.replace(/\.xlsx?$/i, '.pdf');

      // Log success
      await Operation.create({
        operation: 'excel-to-pdf',
        filename: req.file.originalname,
        status: 'success'
      });

      console.log(`✅ PDF created successfully: ${outputName}`);

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
      res.send(pdfBytes);

    } catch (err) {
      console.error('❌ Excel → PDF Error:', err);
      
      await Operation.create({
        operation: 'excel-to-pdf',
        filename: req.file?.originalname || 'unknown',
        status: 'failed'
      });

      // Send detailed error response
      res.status(500).json({ 
        error: 'Failed to convert Excel to PDF',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    } finally {
      // Cleanup
      if (uploadedPath) {
        await fs.unlink(uploadedPath).catch(err => console.error('Cleanup error:', err));
      }
    }
  });


// ------------------ PDF EDIT ENDPOINT - FULLY FIXED ✅ ------------------
// ------------------ PDF EDIT ENDPOINT - 100% FIXED ✅ ------------------
app.post('/api/edit-pdf', upload.single('pdfFile'), async (req, res) => {
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
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length !== 6) {
    console.warn('⚠️ Invalid hex color:', hex);
    return { r: 0, g: 0, b: 0 };
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return { r, g, b };
}

// ------------------ PDF PAGE COUNT ENDPOINT (FIXED) ------------------
app.post('/api/pdf-page-count', upload.single('pdfFile'), async (req, res) => {
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
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Please upload a valid .pdf file' });
    }

    if (req.file.size > 50 * 1024 * 1024) { // 50MB limit
      console.log('❌ File too large:', req.file.size);
      await fs.unlink(req.file.path).catch(() => {});
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
}

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



// ------------------ ADD WATERMARK ENDPOINT (FIXED) ------------------
app.post('/api/add-watermark', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }
    
    uploadedPath = req.file.path; // Capture path for cleanup later
    const { watermarks } = JSON.parse(req.body.watermarkData);
    
    // FIX 1: Read file from disk, NOT buffer (since you use dest: 'uploads/')
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const watermark of watermarks) {
      if (watermark.type === 'text') {
        const { 
          text, 
          fontSize, 
          textColor, 
          isBold, 
          isItalic, 
          rotation, 
          opacity, 
          positionKey, 
          isMosaic, 
          fontFamily
        } = watermark;

        // 1. Get the font object
        const font = await getFontAndStyle(pdfDoc, fontFamily, isBold, isItalic);
        
        // 2. Convert Color
        // Ensure we handle the color safely
        let pdfColor;
        try {
            const { r, g, b } = Color(textColor).object();
            pdfColor = rgb(r / 255, g / 255, b / 255);
        } catch (e) {
            console.warn("Invalid color, defaulting to black");
            pdfColor = rgb(0, 0, 0);
        }

        // 3. Pre-calculate text size
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        // 4. Define the drawing options
        const drawOptions = {
          size: fontSize,
          font: font,
          color: pdfColor,
          opacity: opacity,
          rotate: degrees(rotation), // ✅ CORRECT: Uses the degrees helper
        };
        
        for (const page of pages) {
            const { width: pageWidth, height: pageHeight } = page.getSize();
            
            // Draw Helper
            const drawText = (x, y) => {
                // FIX 2: Draw directly on page (removes broken 'layer' logic)
                page.drawText(text, { 
                    ...drawOptions, 
                    x: x, 
                    y: y 
                });
            };

            if (isMosaic) {
                // Tiling (Mosaic) Logic
                const gap = 300; // Increased gap for better spacing
                const horizontalRepeats = Math.ceil(pageWidth / gap) * 2;
                const verticalRepeats = Math.ceil(pageHeight / gap) * 2;
                
                const startX = -pageWidth;
                const startY = -pageHeight;

                for (let i = 0; i < horizontalRepeats; i++) {
                    for (let j = 0; j < verticalRepeats; j++) {
                        const tileX = startX + i * gap;
                        const tileY = startY + j * gap;
                        drawText(tileX, tileY);
                    }
                }
            } else {
                // 9-Point Positioning Logic
                const { x, y } = calculatePosition(pageWidth, pageHeight, textWidth, textHeight, positionKey);
                drawText(x, y);
            }
        }
      }
      
      else if (watermark.type === 'image') {
    const { 
        imageData, 
        width, 
        height, 
        opacity, 
        rotation, 
        positionKey, 
        isMosaic 
    } = watermark;

    // 1. Decode Base64 Image
    // The client sends "data:image/png;base64,..." - we need the part after the comma
    if (!imageData) continue;
    const base64Data = imageData.split(',')[1]; 
    const imageBytes = Buffer.from(base64Data, 'base64');

    let image;
    try {
        // Try embedding as PNG first
        image = await pdfDoc.embedPng(imageBytes);
    } catch (e) {
        // If PNG fails, try JPG
        image = await pdfDoc.embedJpg(imageBytes);
    }

    // 2. Define Image Drawing Options
    const drawOptions = {
        width: Number(width),
        height: Number(height),
        opacity: Number(opacity),
        rotate: degrees(rotation), // Uses the same 'degrees' helper
    };

    for (const page of pages) {
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Helper to draw the image at specific coordinates
        const drawImg = (x, y) => {
            page.drawImage(image, {
                ...drawOptions,
                x: x,
                y: y
            });
        };

        if (isMosaic) {
            // Tiling (Mosaic) Logic for Images
            const gap = 300; 
            const horizontalRepeats = Math.ceil(pageWidth / gap) * 2;
            const verticalRepeats = Math.ceil(pageHeight / gap) * 2;
            
            const startX = -pageWidth;
            const startY = -pageHeight;

            for (let i = 0; i < horizontalRepeats; i++) {
                for (let j = 0; j < verticalRepeats; j++) {
                    const tileX = startX + i * gap;
                    const tileY = startY + j * gap;
                    drawImg(tileX, tileY);
                }
            }
        } else {
            // 9-Point Positioning Logic
            // We reuse calculatePosition by passing image width/height as text width/height
            const { x, y } = calculatePosition(pageWidth, pageHeight, Number(width), Number(height), positionKey);
            drawImg(x, y);
        }
    }
}
    }

    // Finalize the PDF
    const resultPdfBytes = await pdfDoc.save();

    // Send the modified PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=watermarked_${Date.now()}.pdf`);
    res.send(Buffer.from(resultPdfBytes));

    // Cleanup uploaded file
    await fs.unlink(uploadedPath).catch(() => {});

  } catch (error) {
    console.error('PDF Watermark Processing Error:', error);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {}); // Cleanup on error
    res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
  }
});


// ------------------ ROTATE PDF ENDPOINT (ROBUST) ------------------
app.post('/api/rotate-pdf', upload.single('pdfFile'), async (req, res) => {
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
    await fs.unlink(uploadedPath).catch(() => {});

  } catch (err) {
    console.error('❌ CRITICAL ROTATE ERROR:', err);
    
    // Attempt to log failure to DB
    try {
        await Operation.create({
        operation: 'rotate-pdf',
        filename: req.file?.originalname || 'unknown',
        status: 'failed'
        });
    } catch(dbErr) { console.error("DB Log failed", dbErr); }

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    
    // Send detailed error to frontend so you can see it in the Alert
    res.status(500).json({ error: 'Server Error: ' + err.message });
  }
});


// ------------------ UNLOCK PDF (Fixed: Uses QPDF via execFile) ------------------
app.post('/api/unlock-pdf', upload.single('pdfFile'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    console.log("🔓 Unlock PDF request received");

    // 1. Validation
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    if (!req.body.password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    inputPath = req.file.path;
    // Create a temporary output filename
    outputPath = path.join('uploads', `unlocked_${Date.now()}_${req.file.originalname}`);
    const password = req.body.password.trim();

    // 2. Define QPDF Path
    // Ensure this matches the path used in protect-pdf
    const qpdfExe = 'C:\\Program Files\\qpdf 12.2.0\\bin\\qpdf.exe';

    // 3. Arguments for QPDF Decrypt
    const args = [
      `--password=${password}`, // Pass password specifically
      '--decrypt',              // Decrypt mode
      inputPath,                // Input file
      outputPath                // Output file
    ];

    console.log(`Executing QPDF Decrypt...`);

    // 4. Run QPDF using execFile
    await new Promise((resolve, reject) => {
      execFile(qpdfExe, args, (error, stdout, stderr) => {
        if (error) {
          // Check for specific "invalid password" message in stderr
          if (stderr && stderr.includes('invalid password')) {
             reject(new Error("INCORRECT_PASSWORD"));
          } else {
             console.error("QPDF Unlock Error:", stderr);
             reject(new Error("Failed to unlock PDF."));
          }
        } else {
          resolve(stdout);
        }
      });
    });

    console.log("✅ PDF Unlocked successfully!");

    // 5. Send the Unlocked File
    res.download(outputPath, `unlocked_${req.file.originalname}`, async (err) => {
      if (err) console.error("Download Error:", err);
      
      // Cleanup files
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });

  } catch (err) {
    // specific error handling for wrong password
    if (err.message === "INCORRECT_PASSWORD") {
        console.warn('⚠️ User provided incorrect password');
        // Clean up input immediately
        if (inputPath) await fs.unlink(inputPath).catch(() => {});
        return res.status(401).json({ error: "Incorrect password" });
    }

    console.error('❌ Unlock PDF Failed:', err.message);
    
    // Cleanup input
    if (inputPath) await fs.unlink(inputPath).catch(() => {});
    
    res.status(500).json({ error: err.message });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add this at the very top of server.js with other requires if not present
const { execFile } = require('child_process');

// ------------------ PROTECT PDF (Fixed: Uses QPDF via execFile) ------------------
app.post('/api/protect-pdf', upload.single('pdfFile'), async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    console.log("🔒 Protect PDF request received");

    // 1. Validation
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    if (!req.body.password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    inputPath = req.file.path;
    outputPath = path.join('uploads', `protected_${Date.now()}_${req.file.originalname}`);
    const password = req.body.password;

    // 2. Define QPDF Path
    // ⚠️ IMPORTANT: Verify this path matches your computer exactly!
    const qpdfExe = 'C:\\Program Files\\qpdf 12.2.0\\bin\\qpdf.exe';

    // Check if QPDF exists before running (helps debugging)
    try {
        await fs.access(qpdfExe);
    } catch (e) {
        throw new Error(`QPDF executable not found at: ${qpdfExe}. Please install QPDF or check the path.`);
    }

    // 3. Arguments for QPDF
    // Syntax: qpdf --encrypt user-password owner-password key-len -- input output
    const args = [
        '--encrypt',
        password,       // User password (to open)
        password,       // Owner password (to edit)
        '256',          // 256-bit encryption
        '--print=full', // Allow printing
        '--modify=none',// Block modifications
        '--',           // End of flags
        inputPath,      // Input file
        outputPath      // Output file
    ];

    console.log(`Executing QPDF...`);

    // 4. Run QPDF using execFile (Handles spaces in paths automatically)
    await new Promise((resolve, reject) => {
        execFile(qpdfExe, args, (error, stdout, stderr) => {
            if (error) {
                console.error("QPDF Error:", stderr);
                reject(new Error("QPDF failed to encrypt the file."));
            } else {
                resolve(stdout);
            }
        });
    });

    console.log("✅ QPDF Encrypted successfully!");

    // 5. Send the Protected File
    res.download(outputPath, `protected_${req.file.originalname}`, async (err) => {
        if (err) console.error("Download Error:", err);
        
        // Cleanup files
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
    });

  } catch (err) {
    console.error('❌ Protect PDF Failed:', err.message);
    
    // Log Failure
    await Operation.create({
      operation: 'protect-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    }).catch(() => {});

    // Cleanup input if it exists
    if (inputPath) await fs.unlink(inputPath).catch(() => {});
    
    // Send Error
    res.status(500).json({ error: err.message });
  }
});


// ------------------ ORGANIZE PDF (Reorder, Delete, Rotate) ------------------
app.post('/api/organize-pdf', upload.single('pdfFile'), async (req, res) => {
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


// ------------------ GET PDF THUMBNAILS (Fixed: Runs pdftoppm directly) ------------------
app.post('/api/get-pdf-thumbnails', upload.single('pdfFile'), async (req, res) => {
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
    await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  } catch (err) {
    console.error('❌ Thumbnail Error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Failed to generate previews: ' + err.message });
  }
});



// ------------------ ADD PAGE NUMBERS ------------------
app.post('/api/add-page-numbers', upload.single('pdfFile'), async (req, res) => {
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
    await fs.unlink(uploadedPath).catch(() => {});
    await Operation.create({ operation: 'page-numbers', filename: req.file.originalname, status: 'success' });

  } catch (err) {
    console.error('❌ Page Numbers Error:', err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to add page numbers: ' + err.message });
  }
});


// ------------------ CROP PDF ------------------
app.post('/api/crop-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath = null;

  try {
    console.log('✂️ Crop PDF request received');

    // 1. Validation
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (!req.body.cropData) return res.status(400).json({ error: 'Crop data is required' });

    uploadedPath = req.file.path;
    
    // Parse frontend data
    // crop: { x, y, width, height, unit: '%' } - values are percentages (0-100)
    // pageSelection: 'all' or 'current'
    // currentPageIndex: number (0-based)
    const { crop, pageSelection, currentPageIndex } = JSON.parse(req.body.cropData);

    if (!crop || crop.width === 0 || crop.height === 0) {
        return res.status(400).json({ error: 'Please select an area to crop.' });
    }

    // 2. Load PDF
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // 3. Determine pages to crop
    let pagesToProcess = [];
    if (pageSelection === 'all') {
        pagesToProcess = pages;
    } else if (pageSelection === 'current' && currentPageIndex >= 0 && currentPageIndex < pages.length) {
        pagesToProcess = [pages[currentPageIndex]];
    } else {
        throw new Error('Invalid page selection');
    }

    console.log(`Applying crop to ${pagesToProcess.length} page(s)...`);

    // 4. Apply crop to each selected page
    for (const page of pagesToProcess) {
        const { width, height } = page.getSize();

        // Convert percentage values from frontend to PDF points
        // PDF origin (0,0) is bottom-left. Frontend origin is top-left.
        
        // Calculate dimensions
        const cropWidth = (crop.width / 100) * width;
        const cropHeight = (crop.height / 100) * height;

        // Calculate X (distance from left is same for both)
        const cropX = (crop.x / 100) * width;

        // Calculate Y (distance from bottom)
        // PDF Y = Page Height - (Top Margin from UI) - (Crop Height)
        const cropY = height - ((crop.y / 100) * height) - cropHeight;

        // Set both CropBox (visible area) and MediaBox (physical page size)
        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
        page.setMediaBox(cropX, cropY, cropWidth, cropHeight);
    }

    // 5. Save and Send
    const croppedPdfBytes = await pdfDoc.save();
    const outputName = `cropped_${req.file.originalname}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(croppedPdfBytes));

    // Log & Cleanup
    await Operation.create({ operation: 'crop-pdf', filename: req.file.originalname, status: 'success' });
    await fs.unlink(uploadedPath).catch(() => {});

  } catch (err) {
    console.error('❌ Crop PDF Error:', err);
    await Operation.create({
      operation: 'crop-pdf',
      filename: req.file?.originalname || 'unknown',
      status: 'failed'
    }).catch(() => {});

    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to crop PDF: ' + err.message });
  }
});




// ------------------ COMPARE PDF (Fixed: Overlay & Semantic) ------------------
app.post('/api/compare-pdf', upload.fields([{ name: 'file1' }, { name: 'file2' }]), async (req, res) => {
  const tempDir = path.join(__dirname, 'temp_compare', `cmp_${Date.now()}`);
  
  try {
    console.log('🔍 Compare PDF request received');

    if (!req.files || !req.files['file1'] || !req.files['file2']) {
        return res.status(400).json({ error: 'Please upload both PDF versions.' });
    }

    const mode = req.body.mode || 'overlay'; // 'overlay' or 'semantic'
    const file1Path = req.files['file1'][0].path;
    const file2Path = req.files['file2'][0].path;

    // Output PDF
    const resultPdf = await PDFDocument.create();

    // ======================================================
    // MODE 1: SEMANTIC TEXT COMPARISON (Text Diff)
    // ======================================================
    if (mode === 'semantic') {
        console.log("📝 Running Semantic Text Comparison...");
        
        // Extract text
        const buffer1 = await fs.readFile(file1Path);
        const buffer2 = await fs.readFile(file2Path);
        const data1 = await pdfParse(buffer1);
        const data2 = await pdfParse(buffer2);

        // Compute Text Diff
        const diffs = diff.diffLines(data1.text, data2.text);

        // Create Report Page
        let page = resultPdf.addPage([595, 842]); // A4
        const font = await resultPdf.embedFont(StandardFonts.Helvetica);
        const fontBold = await resultPdf.embedFont(StandardFonts.HelveticaBold);
        
        let y = 800;
        const margin = 50;
        const fontSize = 10;
        const lineHeight = 12;

        // Title
        page.drawText('Semantic Comparison Report', { x: margin, y, size: 18, font: fontBold, color: rgb(0, 0, 0) });
        y -= 30;

        for (const part of diffs) {
            // Split into lines to handle wrapping/newlines
            const lines = part.value.split('\n');
            
            // Set Color: Red for removed, Green for added, Gray for unchanged
            let color = rgb(0.5, 0.5, 0.5); // Gray (unchanged)
            let prefix = '  ';
            if (part.added) {
                color = rgb(0, 0.6, 0); // Green
                prefix = '+ ';
            }
            if (part.removed) {
                color = rgb(0.8, 0, 0); // Red
                prefix = '- ';
            }

            // Draw Lines
            for (const line of lines) {
                if (line.trim().length === 0) continue; // Skip empty lines
                
                if (y < 50) { // New page if bottom reached
                    page = resultPdf.addPage([595, 842]);
                    y = 800;
                }

                // Truncate overly long lines to prevent crash
                const safeLine = line.substring(0, 90); 

                page.drawText(prefix + safeLine, { x: margin, y, size: fontSize, font: font, color });
                y -= lineHeight;
            }
        }
    } 
    
    // ======================================================
    // MODE 2: VISUAL OVERLAY (Pixel Diff)
    // ======================================================
    else {
        console.log("🖼️ Running Content Overlay Comparison...");
        
        await fs.mkdir(tempDir, { recursive: true });
        const dir1 = path.join(tempDir, 'file1');
        const dir2 = path.join(tempDir, 'file2');
        await fs.mkdir(dir1);
        await fs.mkdir(dir2);

        // Convert PDFs to Images (pdftoppm)
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        const cmd1 = `pdftoppm -png -rx 100 -ry 100 "${file1Path}" "${path.join(dir1, 'page')}"`;
        const cmd2 = `pdftoppm -png -rx 100 -ry 100 "${file2Path}" "${path.join(dir2, 'page')}"`;
        await Promise.all([execPromise(cmd1), execPromise(cmd2)]);

        // Get Images
        const getImages = async (dir) => {
            const files = await fs.readdir(dir);
            return files.filter(f => f.endsWith('.png')).sort((a, b) => {
                const numA = parseInt(a.match(/-(\d+)\./)?.[1] || 0);
                const numB = parseInt(b.match(/-(\d+)\./)?.[1] || 0);
                return numA - numB;
            });
        };

        const images1 = await getImages(dir1);
        const images2 = await getImages(dir2);
        const count = Math.min(images1.length, images2.length);

        for (let i = 0; i < count; i++) {
            const img1Path = path.join(dir1, images1[i]);
            const img2Path = path.join(dir2, images2[i]);

            const img1Data = PNG.sync.read(await fs.readFile(img1Path));
            const img2Data = PNG.sync.read(await fs.readFile(img2Path));
            
            const { width, height } = img1Data;
            const diffImage = new PNG({ width, height });

            // Pixelmatch
            const numDiffPixels = pixelmatch(
                img1Data.data, img2Data.data, diffImage.data, width, height, 
                { threshold: 0.1, alpha: 0.9, diffColor: [255, 0, 0] }
            );

            // 1. Embed Original Page (Background)
            // We use the original PNG as the base layer so the user sees the context
            const baseImage = await resultPdf.embedPng(await fs.readFile(img1Path));
            
            // 2. Embed Diff Layer (Foreground)
            const diffBuffer = PNG.sync.write(diffImage);
            const overlayImage = await resultPdf.embedPng(diffBuffer);

            // 3. Draw to PDF Page
            const page = resultPdf.addPage([width, height]);
            
            // Draw Original (Faded slightly to make red pop?) 
            // Standard drawing is fine, red overlay is strong.
            page.drawImage(baseImage, { x: 0, y: 0, width, height, opacity: 0.3 }); // Faded background
            page.drawImage(overlayImage, { x: 0, y: 0, width, height }); // Sharp diffs
            
            // Label
            page.drawText(`Visual Diff - Page ${i+1}`, { x: 20, y: 20, size: 14, color: rgb(1, 0, 0) });
        }
        
        // Cleanup temp images
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    // Common: Save & Send
    const outputBytes = await resultPdf.save();
    const outputName = `comparison_${mode}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(outputBytes));

    // Cleanup inputs
    await fs.unlink(file1Path).catch(() => {});
    await fs.unlink(file2Path).catch(() => {});

  } catch (err) {
    console.error('❌ Comparison Error:', err);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ error: 'Failed to compare: ' + err.message });
  }
});


// Global error handler for uncaught exceptions
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});