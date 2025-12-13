import React, { useState,useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function PDFtoJPG() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(''); // '', 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setStatus('');
      setErrorMessage('');
    } else {
      setSelectedFile(null);
      setErrorMessage('Please select a valid PDF file.');
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
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setStatus('');
      setErrorMessage('');
    } else {
      setSelectedFile(null);
      setErrorMessage('Please drop a valid PDF file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage('Please select a PDF file.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/api/pdf-to-jpg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorText = 'Conversion failed';
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } else {
          errorText = response.statusText || errorText;
        }
        throw new Error(errorText);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFile.name.replace(/\.pdf$/i, '')}_jpg_images.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
    } catch (error) {
      console.error('PDF to JPG Submission Error:', error);
      setStatus('error');
      setErrorMessage(`Failed to convert: ${error.message}`);
    }
  };

    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | PDF TO JPG";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            PDF to JPG <span className="text-blue-600">Converter</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert each page of your PDF into high-quality JPG images. Download as a ZIP.
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
                  } ${selectedFile ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-5xl mb-4">Image</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {selectedFile
                        ? selectedFile.name
                        : 'Drop your PDF here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports PDF up to 50MB
                    </p>
                  </label>

                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">PDF</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          document.getElementById('file-input').value = '';
                          setErrorMessage('');
                          setStatus('');
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Success Message */}
              {status === 'success' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
                  <span>ZIP file with JPG images downloaded!</span>
                  <span className="text-xs">Each page = 1 JPG</span>
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
                disabled={status === 'uploading' || !selectedFile}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  status === 'uploading' || !selectedFile
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
                    Converting to JPG...
                  </>
                ) : (
                  <>
                    Convert to JPG
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Each PDF page becomes a separate JPG image</li>
                <li>• High-quality output: 300 DPI</li>
                <li>• Download includes all images in a single ZIP</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Convert PDF to JPG with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lock</div>
              <h3 className="font-bold text-lg mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Files deleted after 1 hour. No storage.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lightning</div>
              <h3 className="font-bold text-lg mb-1">Instant Results</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Convert in seconds using cloud processing.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Free</div>
              <h3 className="font-bold text-lg mb-1">100% Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No limits. No sign-up. No ads.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default PDFtoJPG;