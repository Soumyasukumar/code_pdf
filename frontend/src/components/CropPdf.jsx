import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function CropPdf() {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: null }); 
  
  // pageSelection now supports: 'all', 'current', 'custom'
  const [pageSelection, setPageSelection] = useState('all'); 
  const [customRange, setCustomRange] = useState(''); // New State for Input
  const imageRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setError('');
    setThumbnails([]);
    setCurrentPage(0);
    setCrop(undefined);
    setCustomRange('');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/get-pdf-thumbnails', formData);
      setThumbnails(response.data.thumbnails);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF preview.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCrop(undefined);
  };

  const handleCrop = async () => {
    if (!file || !crop?.width || !crop?.height || !imageRef.current) {
      setError('Please select an area to crop first.');
      return;
    }

    if (pageSelection === 'custom' && !customRange.trim()) {
      setError('Please enter page numbers (e.g., 1,3,5-7).');
      return;
    }

    setProcessing(true);
    setError('');

    const image = imageRef.current;
    
    // Convert px crop to % if necessary
    let finalCrop = { ...crop };
    if (crop.unit === 'px') {
        finalCrop = {
            x: (crop.x / image.width) * 100,
            y: (crop.y / image.height) * 100,
            width: (crop.width / image.width) * 100,
            height: (crop.height / image.height) * 100,
            unit: '%'
        };
    }

    const cropData = {
      crop: finalCrop,
      pageSelection,
      currentPageIndex: currentPage,
      customPageRange: customRange // Send the custom string
    };

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('cropData', JSON.stringify(cropData));

    try {
      const response = await axios.post('http://localhost:5000/api/crop-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cropped_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setError('');
    } catch (err) {
      console.error('Crop failed:', err);
      // Check if backend sent a specific error message as a Blob
      if (err.response && err.response.data instanceof Blob) {
         // Determine if it's JSON or PDF. If it failed, likely JSON inside Blob.
         // Simpler to just say generic error or try to read Blob text.
         setError('Failed to crop PDF. Check your page selection.');
      } else {
         setError('Failed to crop PDF. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

    useEffect(() => {
      document.title = "PDFPro | Crop PDF";
    }, []);

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, thumbnails.length - 1));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 0));

  return (
    <>
      <Navbar />

      <section className="py-16 px-4 bg-gradient-to-b from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Crop PDF <span className="text-red-600">Pages</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Select area to crop. Download specific pages or the whole document.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {!file ? (
              <div className="p-12 text-center">
                 {/* ... (File Upload UI remains same as before) ... */}
                 <label className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl cursor-pointer bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm hover:shadow-md group border-red-200 dark:border-red-700">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="mb-2 text-xl text-gray-700 dark:text-gray-200 font-bold">Select PDF file</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
                {loading && <p className="mt-4 text-red-600 animate-pulse">Loading...</p>}
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row">
                {/* Left: Crop Area */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-6 lg:p-8 overflow-auto">
                   {/* ... (Image Crop & Pagination UI remains same) ... */}
                   <div className="bg-white dark:bg-gray-800 rounded-xl shadow-inner p-4">
                    {thumbnails.length > 0 && (
                      <ReactCrop crop={crop} onChange={(c) => setCrop(c)} className="max-w-full">
                        <img
                          ref={imageRef}
                          src={thumbnails[currentPage].src}
                          alt={`Page ${currentPage + 1}`}
                          className="max-h-[70vh] w-auto mx-auto object-contain"
                          style={{ maxWidth: '100%', height: 'auto' }}
                        />
                      </ReactCrop>
                    )}
                  </div>
                  <div className="flex justify-center items-center mt-6 gap-4">
                     {/* Pagination Controls */}
                     <button onClick={prevPage} disabled={currentPage === 0} className="p-2 rounded-full bg-red-600 text-white disabled:opacity-50">Prev</button>
                     <span className="text-lg font-semibold dark:text-gray-200">{currentPage + 1} / {thumbnails.length}</span>
                     <button onClick={nextPage} disabled={currentPage === thumbnails.length - 1} className="p-2 rounded-full bg-red-600 text-white disabled:opacity-50">Next</button>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="w-full lg:w-96 bg-gray-50 dark:bg-gray-700 p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Crop Settings</h3>
                    <button onClick={() => setFile(null)} className="text-red-600 hover:text-red-700 text-sm font-medium">Remove File</button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Apply to:</h4>
                    <div className="space-y-3">
                      {/* Option 1: All Pages */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="pageSelection"
                          value="all"
                          checked={pageSelection === 'all'}
                          onChange={() => setPageSelection('all')}
                          className="w-5 h-5 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">All pages</span>
                      </label>

                      {/* Option 2: Current Page */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="pageSelection"
                          value="current"
                          checked={pageSelection === 'current'}
                          onChange={() => setPageSelection('current')}
                          className="w-5 h-5 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Current page only</span>
                      </label>

                      {/* Option 3: Custom Pages (NEW) */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="pageSelection"
                          value="custom"
                          checked={pageSelection === 'custom'}
                          onChange={() => setPageSelection('custom')}
                          className="w-5 h-5 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Selected pages</span>
                      </label>

                      {/* Input for Custom Pages */}
                      {pageSelection === 'custom' && (
                        <div className="ml-8 animate-fade-in-down">
                          <input 
                            type="text" 
                            placeholder="e.g. 1, 3, 5-8"
                            value={customRange}
                            onChange={(e) => setCustomRange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate with commas or use hyphens.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleCrop}
                    disabled={processing || !crop?.width}
                    className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all ${
                      processing || !crop?.width ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? 'Processing...' : 'Crop PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default CropPdf;