const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises; // Promise-based operations (readFile, writeFile)
const fsBase = require('fs'); // <--- ADD THIS LINE: Imports the standard fs module for streams
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
const upload = multer({ dest: 'uploads/' });

// Create uploads folder
fs.mkdir('uploads', { recursive: true }).catch(() => {});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

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





// Start server
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});