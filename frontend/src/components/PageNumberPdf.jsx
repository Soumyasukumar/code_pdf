import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function PageNumberPdf() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState('bottom-right');
  const [margin, setMargin] = useState('20');
  const [textFormat, setTextFormat] = useState('{n}');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState('');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setError('');
    setThumbnails([]);

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/get-pdf-thumbnails', formData);
      setThumbnails(response.data.thumbnails);
      setToPage(response.data.thumbnails.length);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setProcessing(true);
    setError('');

    const settings = {
      position,
      margin: parseInt(margin),
      fromPage,
      toPage: toPage || thumbnails.length,
      text: textFormat,
    };

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('settings', JSON.stringify(settings));

    try {
      const response = await axios.post('http://localhost:5000/api/add-page-numbers', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `numbered_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Add page numbers failed:', err);
      setError('Failed to add page numbers. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const renderDot = (pos) => {
    const posMap = {
      'top-left': 'top-2 left-2',
      'top-center': 'top-2 left-1/2 transform -translate-x-1/2',
      'top-right': 'top-2 right-2',
      'middle-left': 'top-1/2 left-2 -translate-y-1/2',
      'middle-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      'middle-right': 'top-1/2 right-2 -translate-y-1/2',
      'bottom-left': 'bottom-2 left-2',
      'bottom-center': 'bottom-2 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'bottom-2 right-2',
    };

      // SET PAGE TITLE HERE
      useEffect(() => {
        document.title = "PDFPro | Insert Page Number to PDF";
      }, []);

    return (
      <div
        className={`absolute w-3 h-3 bg-red-500 rounded-full shadow-sm z-10 ${posMap[pos] || 'hidden'}`}
      />
    );
  };

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Add Page Numbers <span className="text-red-600">to PDF</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Automatically number your PDF pages with full control over position, format, and range.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {!file ? (
              <div className="p-12 text-center">
                <label className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl cursor-pointer bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm hover:shadow-md group border-red-200 dark:border-red-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <span className="text-3xl">Numbers</span>
                    </div>
                    <p className="mb-2 text-xl text-gray-700 dark:text-gray-200 font-bold">Select PDF file</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">to add page numbers</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
                {loading && <p className="mt-4 text-red-600 dark:text-red-400 animate-pulse">Loading pages...</p>}
                {error && <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>}
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row">
                {/* Left: Preview Grid */}
                <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {thumbnails.map((page, i) => {
                      const pageNum = i + 1;
                      const inRange = pageNum >= fromPage && (!toPage || pageNum <= toPage);
                      return (
                        <div
                          key={i}
                          className={`relative group flex flex-col items-center transition-opacity ${
                            inRange ? 'opacity-100' : 'opacity-40'
                          }`}
                        >
                          <div className="relative p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            {inRange && renderDot(position)}
                            <div className="w-36 h-48 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-600">
                              <img
                                src={page.src}
                                alt={`Page ${i + 1}`}
                                className="object-contain w-full h-full pointer-events-none"
                              />
                            </div>
                          </div>
                          <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Settings */}
                <div className="w-full lg:w-96 bg-gray-50 dark:bg-gray-700 p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Page Number Settings</h3>
                    <button
                      onClick={() => {
                        setFile(null);
                        setThumbnails([]);
                        setError('');
                      }}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Remove File
                    </button>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Preview shows red dot where number will appear.
                    </p>
                  </div>

                  {/* Position Grid */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Position</label>
                    <div className="grid grid-cols-3 gap-2 w-36 mx-auto">
                      {[
                        'top-left',
                        'top-center',
                        'top-right',
                        'middle-left',
                        'middle-center',
                        'middle-right',
                        'bottom-left',
                        'bottom-center',
                        'bottom-right',
                      ].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setPosition(pos)}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                            position === pos
                              ? 'bg-red-500 border-red-600 text-white shadow-md scale-110'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              position === pos ? 'bg-white' : 'bg-gray-400 dark:bg-gray-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Margin</label>
                    <select
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="10">Small (10px)</option>
                      <option value="20">Recommended (20px)</option>
                      <option value="50">Large (50px)</option>
                    </select>
                  </div>

                  {/* Page Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Range</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={fromPage}
                        onChange={(e) => setFromPage(Number(e.target.value))}
                        className="w-full px-3 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        min="1"
                        value={toPage}
                        onChange={(e) => setToPage(Number(e.target.value))}
                        placeholder={thumbnails.length}
                        className="w-full px-3 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Text Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Format</label>
                    <input
                      type="text"
                      value={textFormat}
                      onChange={(e) => setTextFormat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{n}'}</code> for page number
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={processing}
                    className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                      processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>Add Page Numbers</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Add Page Numbers with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Numbers</div>
              <h3 className="font-bold text-lg mb-1">Full Control</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Position, margin, format, and range.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lightning</div>
              <h3 className="font-bold text-lg mb-1">Instant Preview</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See red dot on every page before processing.
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

export default PageNumberPdf;