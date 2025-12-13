import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function CompressPDF() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please drop a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const response = await axios.post('http://localhost:5000/api/compress-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compressed_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Reset form
      setFile(null);
      document.getElementById('file-input').value = '';
    } catch (err) {
      console.error(err.response || err);
      setError(err.response?.data?.error || 'Failed to compress PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | Compress PDF";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Compress PDF <span className="text-blue-600">Instantly</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Reduce PDF file size without losing quality. No sign-up. No watermarks.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Upload PDF File
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  } ${file ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-5xl mb-4">🗜️</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : 'Drop your PDF here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports PDF up to 100MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !file}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading || !file
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Compressing PDF...
                  </>
                ) : (
                  <>
                    🗜️ Compress PDF
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Reduces file size by up to <strong>90%</strong> with smart compression</li>
                <li>• Preserves text, images, and layout quality</li>
                <li>• Perfect for email attachments and faster uploads</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Compress PDFs with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-bold text-lg mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files deleted after 1 hour. No storage.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-lg mb-1">Instant Results</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Compress in seconds using cloud processing.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">🆓</div>
              <h3 className="font-bold text-lg mb-1">100% Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No limits. No sign-up. No ads.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default CompressPDF;