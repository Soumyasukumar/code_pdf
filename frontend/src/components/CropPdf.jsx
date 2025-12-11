import React, { useState, useRef } from 'react';
import axios from 'axios';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CropPdf = () => {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Crop State
  const [crop, setCrop] = useState();
  const [pageSelection, setPageSelection] = useState('all'); // 'all' or 'current'
  const imageRef = useRef(null);

  // 1. Handle File Upload & Get Thumbnails
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setLoading(true);
      setError('');
      setThumbnails([]);
      setCurrentPage(0);
      setCrop(undefined); // Reset crop on new file

      const formData = new FormData();
      formData.append('pdfFile', selectedFile);

      try {
        const response = await axios.post('http://localhost:5000/api/get-pdf-thumbnails', formData);
        setThumbnails(response.data.thumbnails);
      } catch (err) {
        console.error(err);
        setError('Failed to load PDF preview. Please try again.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  // 2. Reset Crop Selection
  const handleReset = () => {
    setCrop(undefined);
  };

  // 3. Submit Crop Request
  const handleCrop = async () => {
    if (!file) return;
    if (!crop || crop.width === 0 || crop.height === 0) {
        alert("Please select an area to crop first.");
        return;
    }
    setProcessing(true);

    const cropData = {
        crop,
        pageSelection,
        currentPageIndex: currentPage
    };

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('cropData', JSON.stringify(cropData));

    try {
        const response = await axios.post('http://localhost:5000/api/crop-pdf', formData, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cropped_${file.name}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        console.error("Crop failed:", err);
        alert("Failed to crop PDF. Please try again.");
    } finally {
        setProcessing(false);
    }
  };

  // Pagination handlers
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, thumbnails.length - 1));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 0));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-20">
        <h1 className="text-2xl font-bold text-gray-800">Crop PDF</h1>
        {file && (
             <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 font-medium text-sm">
                ✕ Remove File
             </button>
        )}
      </div>

      {!file ? (
        // UPLOAD UI
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <label className="flex flex-col items-center justify-center w-full max-w-2xl h-64 border-2 border-red-100 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-red-50 transition-all shadow-sm hover:shadow-md group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-red-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="mb-2 text-xl text-gray-700 font-bold">Select PDF file</p>
                    <p className="text-sm text-gray-500">to crop pages</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
            {loading && <p className="mt-4 text-gray-500 animate-pulse">Loading PDF...</p>}
            {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      ) : (
        // MAIN CROP UI
        <div className="flex-1 flex overflow-hidden">
            
            {/* Main Area: Image & Cropper */}
            <div className="flex-1 bg-gray-200 overflow-auto flex flex-col items-center justify-center p-8 relative">
                {thumbnails.length > 0 && (
                    <div className="bg-white shadow-lg p-1">
                        <ReactCrop 
                            crop={crop} 
                            onChange={(c) => setCrop(c)} 
                            aspect={undefined} 
                        >
                            <img 
                                ref={imageRef}
                                src={thumbnails[currentPage].src} 
                                alt={`Page ${currentPage + 1}`} 
                                className="max-h-[80vh] object-contain pointer-events-none" 
                                onLoad={() => URL.revokeObjectURL(thumbnails[currentPage].src)}
                            />
                        </ReactCrop>
                    </div>
                )}

                {/* Pagination Controls - FIXED SVG CLOSING TAGS */}
                <div className="absolute bottom-4 bg-gray-800 text-white px-4 py-2 rounded-full flex items-center space-x-4 shadow-lg opacity-90">
                    <button onClick={prevPage} disabled={currentPage === 0} className="hover:text-red-400 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    
                    <span className="font-medium">{currentPage + 1} / {thumbnails.length}</span>
                    
                    <button onClick={nextPage} disabled={currentPage === thumbnails.length - 1} className="hover:text-red-400 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Right Sidebar: Options */}
            <div className="w-80 bg-white shadow-xl border-l border-gray-200 p-6 flex flex-col z-30 h-full font-sans">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-gray-800">Crop PDF</h3>
                    <button onClick={handleReset} className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Reset all
                    </button>
                </div>

                {/* FIXED TAG MISMATCH HERE (p tag closed by p tag) */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                    <p className="text-sm text-blue-700">
                        Click and drag to select the area you want to keep. Resize if needed.
                    </p>
                </div>

                {/* Pages Selection */}
                <div className="mb-auto">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Pages:</h4>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="pageSelection" 
                                value="all"
                                checked={pageSelection === 'all'}
                                onChange={() => setPageSelection('all')}
                                className="form-radio h-5 w-5 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-gray-700 font-medium group-hover:text-gray-900">All pages</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="pageSelection" 
                                value="current"
                                checked={pageSelection === 'current'}
                                onChange={() => setPageSelection('current')}
                                className="form-radio h-5 w-5 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-gray-700 font-medium group-hover:text-gray-900">Current page</span>
                        </label>
                    </div>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleCrop} 
                    disabled={processing || !crop?.width}
                    className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105
                        ${(processing || !crop?.width) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30'}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Processing...
                        </span>
                    ) : (
                        <>Crop PDF ➜</>
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CropPdf;