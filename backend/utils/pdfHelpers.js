const { StandardFonts, rgb, degrees } = require('pdf-lib');
const Color = require('color');

const getFontAndStyle = async (pdfDoc, fontFamily, isBold, isItalic) => {
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
  return pdfDoc.embedFont(fontName);
};

const calculatePosition = (pageWidth, pageHeight, textWidth, textHeight, positionKey) => {
  const margin = 20;
  let x, y;
  if (positionKey.includes('left')) x = margin;
  else if (positionKey.includes('center')) x = (pageWidth / 2) - (textWidth / 2);
  else if (positionKey.includes('right')) x = pageWidth - textWidth - margin;

  if (positionKey.includes('top')) y = pageHeight - textHeight - margin;
  else if (positionKey.includes('center')) y = (pageHeight / 2) - (textHeight / 2);
  else if (positionKey.includes('bottom')) y = margin;

  return { x, y };
};

const hexToRgb = (hex) => {
  try {
    const color = Color(hex);
    return rgb(color.red() / 255, color.green() / 255, color.blue() / 255);
  } catch (e) {
    return rgb(0, 0, 0);
  }
};

const getCellStyles = (cell) => {
    const isHeader = cell.row.number === 1;
    const isBold = isHeader || cell.style?.font?.bold;
    const isItalic = cell.style?.font?.italic;
    const isUnderline = cell.style?.font?.underline;
    const fontName = cell.style?.font?.name || 'Helvetica';
    const fontSize = cell.style?.font?.size ? cell.style.font.size * 0.75 : (isHeader ? 10 : 9); // Scale font size for PDF points

    let cellRgbColor = rgb(0, 0, 0); // Default black text
    if (cell.style?.font?.color?.argb) {
        // ExcelJS colors are in ARGB (alpha-red-green-blue)
        const argb = cell.style.font.color.argb;
        const hex = argb.length === 8 ? `#${argb.substring(2)}` : `#${argb}`; // Remove alpha channel if present
        try {
            cellRgbColor = hexToRgb(hex);
        } catch (e) {
            console.warn(`Invalid font color: ${argb}`);
        }
    }

    let fillColor = null;
    if (cell.style?.fill?.fgColor?.argb) {
        const argb = cell.style.fill.fgColor.argb;
        const hex = argb.length === 8 ? `#${argb.substring(2)}` : `#${argb}`;
        try {
            fillColor = hexToRgb(hex);
        } catch (e) {
            console.warn(`Invalid fill color: ${argb}`);
        }
    }
    
    // Fallback/Header style
    if (cell.row.number === 1 && !fillColor) {
        fillColor = rgb(0.85, 0.85, 0.85); // Light gray for header background
    }

    return {
        isBold,
        isItalic,
        isUnderline,
        fontName,
        fontSize,
        textColor: cellRgbColor,
        fillColor
    };
};

async function generateThumbnails(pdfPath) {
  const tempDir = path.join(__dirname, '..', 'temp_thumbnails', `preview_${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const outPrefix = path.join(tempDir, 'page');

  const cmd = `pdftoppm -jpeg -scale-to 300 "${pdfPath}" "${outPrefix}"`;

  try {
    await execPromise(cmd);
  } catch (err) {
    throw new Error('pdftoppm failed. Is Poppler installed and in PATH?');
  }

  let files = await fs.readdir(tempDir);
  files = files
    .filter(f => /^page-\d+\.jpg$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/page-(\d+)\.jpg/)[1]);
      const numB = parseInt(b.match(/page-(\d+)\.jpg/)[1]);
      return numA - numB;
    });

  if (files.length === 0) {
    throw new Error('No thumbnails generated');
  }

  const thumbnails = await Promise.all(
    files.map(async (file, index) => {
      const filePath = path.join(tempDir, file);
      const buffer = await fs.readFile(filePath);
      return {
        originalIndex: index,
        src: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        rotation: 0
      };
    })
  );

  // Return both data and cleanup function
  return {
    thumbnails,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };
};

module.exports = {
  getFontAndStyle,
  calculatePosition,
  hexToRgb,
  getCellStyles,
  generateThumbnails

};