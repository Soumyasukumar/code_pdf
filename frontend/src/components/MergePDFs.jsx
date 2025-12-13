import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function MergePDFs() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type === 'application/pdf'
    );

    if (selectedFiles.length === 0) {
      setError('Please upload valid PDF files');
      setFiles([]);
      return;
    }

    setFiles(selectedFiles);
    setError('');
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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );

    if (droppedFiles.length === 0) {
      setError('Please drop valid PDF files');
      setFiles([]);
      return;
    }

    setFiles(droppedFiles);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validFiles = files.filter((f) => f.type === 'application/pdf');
    if (validFiles.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    validFiles.forEach((file) => formData.append('pdfFiles', file));

    try {
      const response = await axios.post('http://localhost:5000/api/merge-pdfs', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `merged_${validFiles.length}_pdfs.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Reset form
      setFiles([]);
      document.getElementById('file-input').value = '';
    } catch (err) {
      console.error(err.response || err);
      setError(err.response?.data?.error || 'Failed to merge PDFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fileNames = files.length > 0 ? files.map((f) => f.name) : null;

    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | Merge PDF";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Merge PDF Files <span className="text-blue-600">Seamlessly</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Combine multiple PDFs into one in seconds. No sign-up. No watermarks.
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
                  Upload PDF Files
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  } ${files.length >= 2 ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-5xl mb-4">📑</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {files.length === 0
                        ? 'Drop your PDFs here or click to upload'
                        : `${files.length} PDF${files.length > 1 ? 's' : ''} selected`}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports up to 100MB per file • Select 2 or more
                    </p>
                  </label>

                  {/* Show selected file names */}
                  {fileNames && (
                    <div className="mt-4 text-left">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Selected files:
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 max-h-32 overflow-y-auto">
                        {fileNames.map((name, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-xs">📄</span>
                            <span className="truncate max-w-xs">{name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                disabled={isLoading || files.length < 2}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading || files.length < 2
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
                    Merging PDFs...
                  </>
                ) : (
                  <>
                    🔗 Merge PDFs
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Select <strong>2 or more</strong> PDFs to merge</li>
                <li>• Order is preserved: first selected = first in output</li>
                <li>• Large files? We handle up to 100MB per file</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Merge PDFs with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-bold text-lg mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files deleted after 1 hour. No storage.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-lg mb-1">Instant Results</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Merge in seconds using cloud processing.</p>
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

export default MergePDFs;