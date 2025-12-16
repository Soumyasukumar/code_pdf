import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function RotatePDF() {
  const [file, setFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'PDFPro | Rotate PDF Pages';
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setRotation(0);
      setError('');
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setRotation(0);
      setError('');
      setSuccess(false);
    } else {
      setError('Please drop a valid PDF file');
    }
  };

  const applyRotation = (angle) => {
    if (!file) return;
    setRotation(prev => prev + angle);
    setError('');
  };

  const resetFile = () => {
    setFile(null);
    setRotation(0);
    setError('');
    setSuccess(false);
    document.getElementById('file-input').value = '';
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a PDF file');
      return;
    }
    if (rotation === 0 || rotation % 360 === 0) {
      setError('Please apply at least one rotation (90°, 180°, or 270°)');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('angle', rotation % 360); // Normalize to 0–359

    try {
      const response = await axios.post('http://localhost:5000/api/rotate-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const angle = rotation % 360 === 0 ? 360 : rotation % 360;
      link.setAttribute('download', `rotated_${angle}deg_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      // Optional: keep file for another rotation
      // resetFile();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to rotate PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Rotate PDF Pages <span className="text-blue-600">Instantly</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Fix upside-down or sideways PDFs in seconds. Rotate left, right, or 180° — no software needed.
          </p>
        </div>
      </section>

      {/* Main Tool */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Upload Your PDF
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
                    ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                    ${file ? 'bg-green-50 dark:bg-green-900/10 border-green-400 dark:border-green-600' : ''}
                  `}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input">
                    <div className="text-6xl mb-4">Rotate</div>
                    {file ? (
                      <div>
                        <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          Drop your PDF here or click to upload
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Supports PDF up to 100MB
                        </p>
                      </div>
                    )}
                  </label>
                  {file && (
                    <button
                      type="button"
                      onClick={resetFile}
                      className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              {/* Rotation Controls */}
              {file && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
                      Choose Rotation Direction
                    </p>
                    <div className="flex justify-center items-center gap-8 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyRotation(-90)}
                        className="flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
                      >
                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
                          <span className="text-4xl">Rotate Left</span>
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Left 90°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyRotation(180)}
                        className="flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
                      >
                        <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-3">
                          <span className="text-4xl">Rotate Down</span>
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">180°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyRotation(90)}
                        className="flex flex-col items-center p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
                      >
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-3">
                          <span className="text-4xl">Rotate Right</span>
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Right 90°</span>
                      </button>
                    </div>

                    <div className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full shadow-lg">
                      Total Rotation: {Math.abs(rotation) % 360 === 0 ? 360 : Math.abs(rotation) % 360}°
                      {rotation < 0 ? ' (Counter-clockwise)' : rotation > 0 ? ' (Clockwise)' : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Error & Success */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm text-center font-medium">
                  Rotated PDF downloaded successfully!
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !file || rotation === 0}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3
                  ${isLoading || !file || rotation === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg'
                  }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Rotating PDF...
                  </>
                ) : (
                  <>
                    Rotate Download Rotated PDF
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li>• Click multiple times to rotate 180° or 270°</li>
                <li>• Use Left 90° + Right 90° = 180° if needed</li>
                <li>• All pages will be rotated by the total angle</li>
                <li>• Your file is deleted from our servers after 1 hour</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Rotate PDFs Here?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Secure</div>
              <h3 className="font-bold text-lg mb-1">100% Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files auto-deleted after processing.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Fast</div>
              <h3 className="font-bold text-lg mb-1">Instant Rotation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No waiting. Download in seconds.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Free</div>
              <h3 className="font-bold text-lg mb-1">Completely Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No signup. No limits. Forever.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default RotatePDF;