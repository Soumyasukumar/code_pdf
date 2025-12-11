import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AllTools from './pages/AllTools';
import CompressPDF from './components/CompressPDF';
import MergePDFs from './components/MergePDFs';
import SplitPDF from './components/SplitPDF';
import PDFtoWord from './components/PDFtoWord';
import WordToPDF from './components/WordtoPDF';
import PDFtoPowerpoint from './components/PDFtoPowerpoint';
import JPGtoPDF from './components/JPGtoPDF';
import PDFtoJPG from './components/PdftoJPG';
import PDFtoExcel from './components/PDFtoExcel';
import POWERPOINTtoPDF from './components/POWERPOINTtoPDF';
import ExcelToPDF from './components/ExcelToPDF';
import EditPDF from './components/EditPDF';
import AddWatermark from './components/AddWatermark';
import RotatePdf from './components/RotatePdf';
import UnlockPdf from './components/UnlockPdf';
import ProtectPdf from './components/ProtectPdf';

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all-tools" element={<AllTools />} />
          <Route path="/compress" element={<CompressPDF />} />
          <Route path="/merge" element={<MergePDFs />} />
          <Route path="/split" element={<SplitPDF />} />
          <Route path="/pdf-to-word" element={<PDFtoWord />} />
          <Route path="/word-to-pdf" element={<WordToPDF />} />
          <Route path="/pdf-to-ppt" element={<PDFtoPowerpoint />} />
          <Route path="/jpg-to-pdf" element={<JPGtoPDF />} />
          <Route path="/pdf-to-jpg" element={<PDFtoJPG />} />
          <Route path="/pdf-to-excel" element={<PDFtoExcel />} />
          <Route path="/ppt-to-pdf" element={<POWERPOINTtoPDF />} />
          <Route path="/excel-to-pdf" element={<ExcelToPDF />} />
          <Route path="/edit" element={<EditPDF />} />
          <Route path="/watermark" element={<AddWatermark />} />
          <Route path="/rotate" element={<RotatePdf />} />
          <Route path="/unlock" element={<UnlockPdf />} />
          <Route path="/protect" element={<ProtectPdf />} />
        </Routes>
        <button
          onClick={toggleTheme}
          className="fixed bottom-6 right-6 z-50 p-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-full shadow-lg hover:scale-110 transition"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </Router>
  );
}

export default App;