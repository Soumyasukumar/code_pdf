const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// MongoDB Schema for logging operations
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

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
};
ensureUploadsDir();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

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





// Start server
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});