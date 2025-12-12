import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function JPGtoPDF() {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [status, setStatus] = useState(''); // '', 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const validFiles = Array.from(files).filter((file) =>
        ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
      );
      if (validFiles.length === 0) {
        setErrorMessage('Please select valid JPG or PNG images');
        setSelectedFiles(null);
        return;
      }
      setSelectedFiles(validFiles);
      setStatus('');
      setErrorMessage('');
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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const validFiles = Array.from(files).filter((file) =>
        ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
      );
      if (validFiles.length === 0) {
        setErrorMessage('Please drop valid JPG or PNG images');
        setSelectedFiles(null);
        return;
      }
      setSelectedFiles(validFiles);
      setStatus('');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMessage('Please select at least one image');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('http://localhost:5000/api/jpg-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images-converted.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setSelectedFiles(null);
      document.getElementById('file-input').value = '';
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to convert images to PDF');
    }
  };

  const fileNames = selectedFiles ? Array.from(selectedFiles).map((f) => f.name) : [];

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            JPG to PDF <span className="text-blue-600">Converter</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert multiple JPG or PNG images into a single PDF in seconds.
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
                  Upload Images (JPG, PNG)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  } ${selectedFiles ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/jpeg, image/jpg, image/png"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-5xl mb-4">Image</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {selectedFiles
                        ? `${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''} selected`
                        : 'Drop your images here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports JPG, PNG • Up to 50MB per file
                    </p>
                  </label>

                  {/* Show selected file names */}
                  {fileNames.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Selected files:
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 max-h-32 overflow-y-auto">
                        {fileNames.map((name, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-xs">Image</span>
                            <span className="truncate max-w-xs">{name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Success Message */}
              {status === 'success' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
                  <span>PDF downloaded successfully!</span>
                  <span className="text-xs">Check your downloads folder.</span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'uploading' || !selectedFiles || selectedFiles.length === 0}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  status === 'uploading' || !selectedFiles || selectedFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg'
                }`}
              >
                {status === 'uploading' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Converting to PDF...
                  </>
                ) : (
                  <>
                    Convert to PDF
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Select <strong>multiple images</strong> to create a multi-page PDF</li>
                <li>• Order is preserved: first selected = first page</li>
                <li>• Best for photos, screenshots, and scanned documents</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Convert JPG to PDF with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lock</div>
              <h3 className="font-bold text-lg mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files deleted after 1 hour. No storage.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lightning</div>
              <h3 className="font-bold text-lg mb-1">Instant Results</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Convert in seconds using cloud processing.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Free</div>
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

export default JPGtoPDF;