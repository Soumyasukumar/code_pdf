const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const Jimp = require('jimp');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

// Optimize image buffer using Jimp (lossy JPEG recompression)
async function optimizeImage(imageBuffer, quality = 60) {
    try {
        const image = await Jimp.read(imageBuffer);
        image.quality(quality);
        return await image.getBufferAsync(Jimp.MIME_JPEG);
    } catch (err) {
        console.warn('Jimp optimization failed, using original image:', err.message);
        return imageBuffer;
    }
}

// ------------------ COMPRESS PDF (Deep Image Optimization) ------------------
router.post('/compress-pdf', upload.single('pdfFile'), async (req, res) => {
    let inputPath = null;
    let outputPath = null;
    const QUALITY = parseInt(req.body.quality, 10) || 60; // Allow client to set quality

    try {
        inputPath = req.file.path;
        const pdfBytes = await fs.readFile(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Create new document for rebuilt pages
        const compressedDoc = await PDFDocument.create();
        const pages = pdfDoc.getPages();

        for (const page of pages) {
            // Copy page into new document (preserves vectors/text)
            const [copiedPage] = await compressedDoc.copyPages(pdfDoc, [pdfDoc.getPageIndices().find(i => pdfDoc.getPage(i) === page)]);
            compressedDoc.addPage(copiedPage);

            // Extract images from original page (pdf-lib limited support)
            const resources = page.node.Resources();
            if (!resources) continue;

            const xObjects = resources.get('XObject');
            if (!xObjects) continue;

            const images = [];
            xObjects.forEach((ref, name) => {
                const xObj = pdfDoc.context.lookup(ref);
                if (xObj && xObj.dict && ['Image'].includes(xObj.dict.get('Subtype')?.name)) {
                    images.push({ name: name.toString(), ref });
                }
            });

            // Limited replacement: re-embed optimized images (works only for simple cases)
            for (const { name, ref } of images) {
                try {
                    const image = await pdfDoc.embedJpeg(await optimizeImage(ref.data, QUALITY));
                    const newRef = compressedDoc.context.register(image.ref);
                    // Replace in copied page resources (fragile)
                    copiedPage.node.Resources().XObject().set(name, newRef);
                } catch (e) {
                    // Skip if image can't be processed
                }
            }
        }

        // Final save with pdf-lib optimizations
        const compressedBytes = await compressedDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });

        outputPath = path.join('uploads', `compressed_${Date.now()}_${req.file.originalname}`);
        await fs.writeFile(outputPath, compressedBytes);

        const origStat = await fs.stat(inputPath);
        const compStat = await fs.stat(outputPath);
        const reduction = 100 * (1 - compStat.size / origStat.size);
        console.log(`Compression: ${reduction.toFixed(2)}% reduction`);

        await Operation.create({ operation: 'compress', filename: req.file.originalname, status: 'success' });

        res.download(outputPath, `compressed_${req.file.originalname}`, async (err) => {
            if (err) console.error('Download error:', err);
            await Promise.all([fs.unlink(inputPath), fs.unlink(outputPath)].map(p => p.catch(() => {})));
        });

    } catch (err) {
        console.error('PDF compression failed:', err);
        if (inputPath) await fs.unlink(inputPath).catch(() => {});
        await Operation.create({ operation: 'compress', filename: req.file?.originalname || 'unknown', status: 'failed' });
        res.status(500).json({ error: 'Failed to compress PDF' });
    }
});

module.exports = router;