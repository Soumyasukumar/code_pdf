const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const Operation = require('../models/Operation');
const upload = require('../config/upload');


// ------------------ COMPARE PDF (Fixed: Overlay & Semantic) ------------------
router.post('/compare-pdf', upload.fields([{ name: 'file1' }, { name: 'file2' }]), async (req, res) => {
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
        page.drawText(`Visual Diff - Page ${i + 1}`, { x: 20, y: 20, size: 14, color: rgb(1, 0, 0) });
      }

      // Cleanup temp images
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }

    // Common: Save & Send
    const outputBytes = await resultPdf.save();
    const outputName = `comparison_${mode}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.send(Buffer.from(outputBytes));

    // Cleanup inputs
    await fs.unlink(file1Path).catch(() => { });
    await fs.unlink(file2Path).catch(() => { });

  } catch (err) {
    console.error('❌ Comparison Error:', err);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
    res.status(500).json({ error: 'Failed to compare: ' + err.message });
  }
});


module.exports = router;