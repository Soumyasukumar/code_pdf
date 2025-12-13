const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
// Add the missing require for child_process
const { execFile } = require('child_process'); 
// All other requires remain...
const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { getFontAndStyle, calculatePosition, hexToRgb, getCellStyles } = require('../utils/pdfHelpers');
const Operation = require('../models/Operation');
const upload = require('../config/upload');

// ------------------ UNLOCK PDF (Fixed: Uses QPDF via execFile) ------------------
router.post('/unlock-pdf', upload.single('pdfFile'), async (req, res) => {
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
            '--decrypt',             // Decrypt mode
            inputPath,               // Input file
            outputPath               // Output file
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
            await fs.unlink(inputPath).catch(() => { });
            await fs.unlink(outputPath).catch(() => { });
        });

    } catch (err) {
        // specific error handling for wrong password
        if (err.message === "INCORRECT_PASSWORD") {
            console.warn('⚠️ User provided incorrect password');
            // Clean up input immediately
            if (inputPath) await fs.unlink(inputPath).catch(() => { });
            return res.status(401).json({ error: "Incorrect password" });
        }

        console.error('❌ Unlock PDF Failed:', err.message);

        // Cleanup input
        if (inputPath) await fs.unlink(inputPath).catch(() => { });

        res.status(500).json({ error: err.message });
    }
});

// REMOVED: app.use(express.json());
// REMOVED: app.use(express.urlencoded({ extended: true }));
// REMOVED: const { execFile } = require('child_process'); // Moved to the top of this file

// ------------------ PROTECT PDF (Fixed: Uses QPDF via execFile) ------------------
router.post('/protect-pdf', upload.single('pdfFile'), async (req, res) => {
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
            password,        // User password (to open)
            password,        // Owner password (to edit)
            '256',           // 256-bit encryption
            '--print=full',  // Allow printing
            '--modify=none', // Block modifications
            '--',            // End of flags
            inputPath,       // Input file
            outputPath       // Output file
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
            await fs.unlink(inputPath).catch(() => { });
            await fs.unlink(outputPath).catch(() => { });
        });

    } catch (err) {
        console.error('❌ Protect PDF Failed:', err.message);

        // Log Failure
        await Operation.create({
            operation: 'protect-pdf',
            filename: req.file?.originalname || 'unknown',
            status: 'failed'
        }).catch(() => { });

        // Cleanup input if it exists
        if (inputPath) await fs.unlink(inputPath).catch(() => { });

        // Send Error
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;