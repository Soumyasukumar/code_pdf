import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PageNumberPdf = () => {
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Settings State
  const [position, setPosition] = useState('bottom-right'); // default
  const [margin, setMargin] = useState('20'); // recommended
  const [textFormat, setTextFormat] = useState('{n}');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState('');

  // 1. Handle File Upload & Get Thumbnails
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setLoading(true);
      setError('');
      setThumbnails([]);

      const formData = new FormData();
      formData.append('pdfFile', selectedFile);

      try {
        // Reuse your existing thumbnail endpoint
        const response = await axios.post('http://localhost:5000/api/get-pdf-thumbnails', formData);
        setThumbnails(response.data.thumbnails);
        setToPage(response.data.thumbnails.length); // Default end page
      } catch (err) {
        console.error(err);
        setError('Failed to load PDF preview.');
      } finally {
        setLoading(false);
      }
    }
  };

  // 2. Submit Request
  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);

    const settings = {
        position,
        margin: parseInt(margin),
        fromPage,
        toPage: toPage || thumbnails.length,
        text: textFormat
    };

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('settings', JSON.stringify(settings));

    try {
        const response = await axios.post('http://localhost:5000/api/add-page-numbers', formData, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `numbered_${file.name}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        alert("Failed to add page numbers");
    } finally {
        setProcessing(false);
    }
  };

  // Helper to render the red dot on thumbnails
  const renderDot = () => {
     // Map position string to CSS classes for absolute positioning
     const posMap = {
         'top-left': 'top-2 left-2',
         'top-center': 'top-2 left-1/2 transform -translate-x-1/2',
         'top-right': 'top-2 right-2',
         'bottom-left': 'bottom-2 left-2',
         'bottom-center': 'bottom-2 left-1/2 transform -translate-x-1/2',
         'bottom-right': 'bottom-2 right-2',
         // Middle rows if needed later
         'middle-left': 'top-1/2 left-2 -translate-y-1/2', 
         'middle-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 
         'middle-right': 'top-1/2 right-2 -translate-y-1/2', 
     };
     return (
         <div className={`absolute w-3 h-3 bg-red-600 rounded-full shadow-sm z-10 ${posMap[position] || 'hidden'}`}></div>
     );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-20">
        <h1 className="text-2xl font-bold text-gray-800">Page Numbers</h1>
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
                        <span className="text-3xl">🔢</span>
                    </div>
                    <p className="mb-2 text-xl text-gray-700 font-bold">Select PDF file</p>
                    <p className="text-sm text-gray-500">to add page numbers</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
            {loading && <p className="mt-4 text-gray-500 animate-pulse">Loading pages...</p>}
        </div>
      ) : (
        // MAIN EDITOR UI
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {thumbnails.map((page, i) => {
                        // Check if this page is inside selected range
                        const pageNum = i + 1;
                        const inRange = pageNum >= fromPage && (!toPage || pageNum <= toPage);

                        return (
                            <div key={i} className={`relative group flex flex-col items-center transition-opacity ${inRange ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="relative p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                                    {/* The Red Dot Indicator */}
                                    {inRange && renderDot()}
                                    
                                    <div className="w-40 h-56 bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                                        <img src={page.src} alt={`Page ${i+1}`} className="object-contain w-full h-full pointer-events-none" />
                                    </div>
                                </div>
                                <span className="mt-2 text-sm font-medium text-gray-500">{i + 1}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Sidebar Options */}
            <div className="w-80 bg-white shadow-xl border-l border-gray-200 p-6 flex flex-col z-30 h-full overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Page Number Options</h3>

                {/* 1. Grid Position Selector */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Position</label>
                    <div className="grid grid-cols-3 gap-2 w-32 mx-auto">
                        {['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => (
                            <button
                                key={pos}
                                onClick={() => setPosition(pos)}
                                className={`w-8 h-8 rounded border flex items-center justify-center transition-all
                                    ${position === pos 
                                        ? 'bg-red-500 border-red-600 text-white shadow-md scale-110' 
                                        : 'bg-white border-gray-300 hover:border-red-300 text-transparent hover:bg-gray-50'}
                                `}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${position === pos ? 'bg-white' : 'bg-gray-300'}`}></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Margin */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margin</label>
                    <select 
                        value={margin} 
                        onChange={(e) => setMargin(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm p-2 border"
                    >
                        <option value="10">Small</option>
                        <option value="20">Recommended</option>
                        <option value="50">Big</option>
                    </select>
                </div>

                {/* 3. Page Range */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Range</label>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="number" 
                            min="1"
                            value={fromPage} 
                            onChange={(e) => setFromPage(Number(e.target.value))}
                            className="w-full border-gray-300 rounded-md shadow-sm border p-2 text-center"
                        />
                        <span className="text-gray-400">to</span>
                        <input 
                            type="number" 
                            min="1"
                            value={toPage} 
                            onChange={(e) => setToPage(Number(e.target.value))}
                            className="w-full border-gray-300 rounded-md shadow-sm border p-2 text-center"
                        />
                    </div>
                </div>

                {/* 4. Text Format */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Format</label>
                    <input 
                        type="text" 
                        value={textFormat} 
                        onChange={(e) => setTextFormat(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm p-2 border"
                    />
                    <p className="text-xs text-gray-400 mt-1">Use <b>{'{n}'}</b> for page number.</p>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleSubmit} 
                    disabled={processing}
                    className={`w-full py-3 px-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105 mt-auto
                        ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Processing...
                        </span>
                    ) : (
                        <>Add Page Numbers ➜</>
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default PageNumberPdf;