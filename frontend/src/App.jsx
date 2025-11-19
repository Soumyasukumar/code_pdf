import React from 'react';
import CompressPDF from './components/CompressPDF';
import MergePDFs from './components/MergePDFs';
import SplitPDF from './components/SplitPDF';
import PDFtoWord from './components/PDFtoWord';
import WordToPDF from './components/WordtoPDF';
import PDFtoPowerpoint from './components/PDFtoPowerpoint'; // ← new import
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
      </div>
    </div>
  );
}

export default App;