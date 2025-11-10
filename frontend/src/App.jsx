import React from 'react';
import CompressPDF from './components/CompressPDF';
import MergePDFs from './components/MergePDFs';
import SplitPDF from './components/SplitPDF';
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
      </div>
    </div>
  );
}

export default App;