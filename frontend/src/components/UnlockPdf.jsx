// src/components/UnlockPdf.jsx
import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';

const UnlockPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
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
    if (selectedFile.type !== 'application/pdf') {
      showMessage('Please upload a valid PDF file', 'error');
      setFile(null);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      showMessage('File too large. Max 50MB.', 'error');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    showMessage(`${selectedFile.name} ready for unlocking!`, 'success');
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleUnlock = async () => {
    if (!file) return showMessage('Please select a file first', 'error');
    if (!password) return showMessage('Please enter the document password', 'error');

    setIsLoading(true);
    setProgress(0);
    showMessage('Unlocking PDF...', 'info');

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('password', password);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 8));
      }, 500);

      const response = await axios.post('http://localhost:5000/api/unlock-pdf', formData, {
        responseType: 'blob',
        timeout: 120000,
      });

      clearInterval(interval);
      setProgress(100);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, '_unlocked.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setFile(null);
      setPassword('');
      setProgress(0);
      showMessage('✅ PDF unlocked successfully!', 'success');
    } catch (err) {
      console.error(err);
      showMessage(
        err.response?.status === 401
          ? '❌ Incorrect Password. Please try again.'
          : 'Failed to unlock PDF. Server may be busy or file is corrupted.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

   // SET PAGE TITLE HERE
  useEffect(() => {
    document.title = "PDFPro | Unlock PDF";
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Unlock <span className="text-yellow-600">PDF</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Remove password protection and download your PDF securely.
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
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } ${file ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}
            >
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleChange}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <div className="text-5xl mb-4">🔒</div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Drop your encrypted PDF here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Only PDF • Up to 50MB</p>
              </label>

              {file && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
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
                    onClick={() => {
                      setFile(null);
                      setPassword('');
                    }}
                    className="text-red-500 hover:text-red-700 font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Password Input */}
            {file && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter PDF password"
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm mt-4"
              />
            )}

            {/* Unlock Button */}
            {file && (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 active:scale-95 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span> Unlocking...
                  </>
                ) : (
                  'Unlock PDF'
                )}
              </button>
            )}

            {/* Progress */}
            {isLoading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-4">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all"
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
                <div className="text-4xl mb-2">🔑</div>
                <h3 className="font-bold text-lg">Secure Unlock</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Your files remain private and secure
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">⚡</div>
                <h3 className="font-bold text-lg">Fast Processing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Unlock PDFs quickly and efficiently
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow flex flex-col items-center gap-2">
                <div className="text-4xl mb-2">📂</div>
                <h3 className="font-bold text-lg">Download Ready</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Get your unlocked PDF immediately
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

export default UnlockPdf;
