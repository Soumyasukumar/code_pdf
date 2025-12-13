const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

router.post('/split-pdf', upload.single('pdfFile'), async (req, res) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    if (!req.body.pageRange) return res.status(400).json({ error: 'Page range is required' });
    uploadedPath = req.file.path;
    const pdfBytes = await fs.readFile(uploadedPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();
    const pageRange = req.body.pageRange.trim();
    const ranges = pageRange.split(',').map(r => r.trim());
    const pagesToInclude = new Set();
    for (const r of ranges) {
      if (r.includes('-')) {
        const [start, end] = r.split('-').map(Number);
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range "${r}". PDF has ${totalPages} pages.`);
        }
        for (let i = start; i <= end; i++) pagesToInclude.add(i - 1);
      } else {
        const pg = Number(r);
        if (isNaN(pg) || pg < 1 || pg > totalPages) throw new Error(`Invalid page "${r}"`);
        pagesToInclude.add(pg - 1);
      }
    }
    const newPdf = await PDFDocument.create();
    const sorted = Array.from(pagesToInclude).sort((a, b) => a - b);
    const copied = await newPdf.copyPages(pdfDoc, sorted);
    copied.forEach(p => newPdf.addPage(p));
    const splitBytes = await newPdf.save();
    const outputName = `split_${pageRange.replace(/[^0-9,-]/g, '')}_${req.file.originalname}`;
    const outputPath = path.join('uploads', outputName);
    await fs.writeFile(outputPath, splitBytes);
    await Operation.create({ operation: 'split', filename: req.file.originalname, status: 'success' });
    res.download(outputPath, outputName, async () => {
      await fs.unlink(uploadedPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (err) {
    console.error('Split PDF error:', err);
    await Operation.create({ operation: 'split', filename: req.file?.originalname || 'unknown', status: 'failed' }).catch(() => {});
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    res.status(500).json({ error: 'Failed to split PDF: ' + err.message });
  }
});

module.exports = router;