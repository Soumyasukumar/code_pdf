// src/components/ExcelToPDF.jsx
import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ExcelToPDF = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const validateAndSetFile = (selectedFile) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      showMessage('Please upload a valid .xlsx or .xls file', 'error');
      setFile(null);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      showMessage('File too large. Max 50MB.', 'error');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    showMessage(`${selectedFile.name} ready for professional conversion!`, 'success');
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleConvert = async () => {
    if (!file) return showMessage('Please select a file first', 'error');

    setIsLoading(true);
    setProgress(0);
    showMessage('Preparing professional PDF conversion...', 'info');

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 8));
      }, 800);

      const response = await axios.post(
        'http://localhost:5000/api/excel-to-pdf',
        formData,
        { responseType: 'blob', timeout: 120000 }
      );

      clearInterval(interval);
      setProgress(100);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.xlsx?$/i, '_Professional.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setFile(null);
      setProgress(0);
      showMessage('Professional PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Conversion failed. Is the server running?', 'error');
    } finally {
      setIsLoading(false);
    }
  };

    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | Excel To PDF";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Excel to <span className="text-green-600">Professional PDF</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert .xlsx or .xls spreadsheets into beautifully formatted PDF documents with automatic layout and page numbering.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10 space-y-8">
            {/* File Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } ${file ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleChange}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Drop your Excel file here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Only .xlsx/.xls • Up to 50MB
                </p>
              </label>

              {file && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700 font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Convert Button */}
            {file && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:scale-95 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Converting...
                  </>
                ) : (
                  'Convert to Professional PDF'
                )}
              </button>
            )}

            {/* Progress */}
            {isLoading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-4">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}

            {/* Message */}
            {message.text && (
              <div
                className={`p-4 rounded-lg text-sm flex items-center gap-2 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}
              >
                <span>{message.type === 'success' ? '✅' : '❌'}</span>
                <span>{message.text}</span>
              </div>
            )}

            {/* Features */}
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">📋</div>
                <h3 className="font-bold text-lg">Smart Tables</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Automatic column detection with professional borders
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">📄</div>
                <h3 className="font-bold text-lg">Multiple Sheets</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Each worksheet becomes a separate page
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">📏</div>
                <h3 className="font-bold text-lg">A4 Layout</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Perfect A4 formatting with proper margins
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="font-bold text-lg">Page Numbers</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Professional headers and footers with pagination
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default ExcelToPDF;
