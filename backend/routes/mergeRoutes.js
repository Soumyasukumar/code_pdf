const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

router.post('/merge-pdfs', upload.array('pdfFiles', 2), async (req, res) => {
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
    pdf1Pages.forEach(p => mergedPdf.addPage(p));
    pdf2Pages.forEach(p => mergedPdf.addPage(p));
    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join('uploads', 'merged_output.pdf');
    await fs.writeFile(outputPath, mergedPdfBytes);
    await Operation.create({
      operation: 'merge',
      filename: `${file1.originalname}, ${file2.originalname}`,
      status: 'success',
    });
    res.download(outputPath, 'merged_output.pdf', async () => {
      await fs.unlink(file1.path).catch(() => {});
      await fs.unlink(file2.path).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (err) {
    console.error('Error merging PDFs:', err);
    await Operation.create({ operation: 'merge', filename: req.files?.map(f => f.originalname).join(', ') || 'unknown', status: 'failed' });
    req.files?.forEach(f => fs.unlink(f.path).catch(() => {}));
    res.status(500).json({ error: 'Failed to merge PDFs' });
  }
});

module.exports = router;