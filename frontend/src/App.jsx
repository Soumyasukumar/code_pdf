import React from 'react';
import CompressPDF from './components/CompressPDF';
import MergePDFs from './components/MergePDFs';
import SplitPDF from './components/SplitPDF';
import PDFtoWord from './components/PDFtoWord';
import WordToPDF from './components/WordtoPDF';
import PDFtoPowerpoint from './components/PDFtoPowerpoint'; // ← new import
import JPGtoPDF from './components/JPGtoPDF';
import PDFtoJPG from './components/PdftoJPG';
import PDFtoExcel from './components/PDFtoExcel';
import POWERPOINTtoPDF from './components/POWERPOINTtoPDF'; // ← new import
import ExcelToPDF from './components/ExcelToPDF'; // ← new import
import EditPDF from './components/EditPDF';
import AddWatermark from './components/AddWatermark'; // ← ADD THIS
import './App.css';


function App() {
  return (
    <div className="App">
      <h1>PDF Processor</h1>
      <div className="container">
        <div className="section">
          <h2>Compress PDF</h2>
          <CompressPDF />
        </div>
        <div className="section">
          <h2>Merge PDFs</h2>
          <MergePDFs />
        </div>
        <div className="section">
          <h2>Split PDF</h2>
          <SplitPDF />
        </div>
        <div className="section">
          <h2>PDF to Word</h2>
          <PDFtoWord />
        </div>
        <div className="section">
          <h2>Word to PDF</h2>
          <WordToPDF />
        </div>
        <div className="section">
          <h2>PDF to PowerPoint</h2>
          <PDFtoPowerpoint />
        </div>
        <div className="section">
          <h2>JPG to PDF</h2>
          <JPGtoPDF />
        </div>
        <div className="section">
          <h2>PDF to JPG</h2>
          <PDFtoJPG />
        </div>
        <div className="section">
          <h2>PDF to Excel</h2>
          <PDFtoExcel />
        </div>

        <div className="section">
          <h2>Powerpoint to PDF</h2>
          <POWERPOINTtoPDF />
        </div>
        <div className="section">
          <h2>Excel to PDF</h2>
          <ExcelToPDF />
        </div>
        <div className="App">
          <h2>Edit PDF</h2>
          <EditPDF />
        </div>
        <div className="section">
          <h2>Add Watermark</h2>
          <AddWatermark />
        </div>
      </div>
    </div>
  );
}

export default App;