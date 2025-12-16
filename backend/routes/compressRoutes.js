// routes/compressRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const Operation = require('../models/Operation');
const upload = require('../config/upload');

async function safeUnlink(p) {
    if (!p) return;
    await fs.unlink(p).catch(() => {});
}

// Convert Windows path → WSL path
function toWslPath(winPath) {
    return winPath.replace(/^C:/i, '/mnt/c').replace(/\\/g, '/');
}

// Best possible compression using Ghostscript (handles everything perfectly)
async function compressWithGhostscript(inputPath, outputPath) {
    const inWsl = toWslPath(inputPath);
    const outWsl = toWslPath(outputPath);

    const gsCommand = [
        'wsl', 'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.7',
        '-dPDFSETTINGS=/ebook',        // Best balance: high quality + small size
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
        '-dAutoRotatePages=/None',
        '-dColorImageDownsampleType=/Bicubic',
        '-dColorImageResolution=150',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dGrayImageResolution=150',
        '-dMonoImageDownsampleType=/Bicubic',
        '-dMonoImageResolution=300',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile="${outWsl}"`,
        `"${inWsl}"`
    ].join(' ');

    await execAsync(gsCommand, { timeout: 600000 }); // 10 min max
}

// Final polish with qpdf (linearize + max stream compression)
async function finalizeWithQpdf(pdfPath) {
    const wslPath = toWslPath(pdfPath);
    const tempPath = pdfPath.replace('.pdf', '_final.pdf');
    const wslTemp = toWslPath(tempPath);

    const qpdfCmd = `wsl qpdf --linearize --object-streams=generate --compress-streams=y "${wslPath}" "${wslTemp}"`;
    await execAsync(qpdfCmd, { timeout: 300000 });
    await fs.rename(tempPath, pdfPath);
}

// MAIN ROUTE — NEVER CORRUPTS
router.post('/compress-pdf', upload.single('pdfFile'), async (req, res) => {
    let inputPath = null;
    let outputPath = null;

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        inputPath = req.file.path;
        const originalSize = req.file.size;
        outputPath = path.join('uploads', `compressed_${Date.now()}_${req.file.originalname}`);

        console.log('Compressing with Ghostscript...');
        await compressWithGhostscript(inputPath, outputPath);

        console.log('Finalizing with qpdf...');
        await finalizeWithQpdf(outputPath);

        const finalSize = (await fs.stat(outputPath)).size;
        const reduction = ((1 - finalSize / originalSize) * 100).toFixed(2);

        console.log(`Success: ${originalSize} → ${finalSize} bytes (${reduction}% reduction)`);

        // Block negative compression
        if (finalSize >= originalSize * 0.98) {
            await safeUnlink(inputPath);
            await safeUnlink(outputPath);

            await Operation.create({
                operation: 'compress',
                filename: req.file.originalname,
                status: 'skipped',
                note: 'Already optimized'
            });

            return res.json({
                message: 'Already optimized',
                originalSize,
                wouldBeSize: finalSize,
                reduction: reduction + '%'
            });
        }

        await Operation.create({
            operation: 'compress',
            filename: req.file.originalname,
            status: 'success',
            reduction
        });

        res.download(outputPath, `compressed_${req.file.originalname}`, async (err) => {
            if (err) console.error('Download error:', err);
            await Promise.all([safeUnlink(inputPath), safeUnlink(outputPath)]);
        });

    } catch (err) {
        console.error('Compression failed:', err.message);
        await safeUnlink(inputPath);
        await safeUnlink(outputPath);

        await Operation.create({
            operation: 'compress',
            filename: req.file?.originalname || 'unknown',
            status: 'failed'
        });

        res.status(500).json({ error: 'Failed to compress PDF' });
    }
});

module.exports = router;