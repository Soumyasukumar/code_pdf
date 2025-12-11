import React, { useState } from 'react';
import axios from 'axios';

const ComparePdf = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState('overlay'); // 'semantic' or 'overlay'

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return alert("Please upload both files first.");
    setProcessing(true);

    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    formData.append('mode', mode); // 👈 SEND THE SELECTED MODE

    try {
      const response = await axios.post('http://localhost:5000/api/compare-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comparison_report_${mode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Comparison failed. Ensure PDFs are valid.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* LEFT: Viewer Area */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        <div className="h-14 bg-white border-b flex items-center px-4 space-x-4 shadow-sm">
             <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-red-600">✕ Close</button>
             <div className="h-6 w-px bg-gray-300 mx-2"></div>
             <span className="font-semibold text-gray-700">Comparison View</span>
        </div>

        <div className="flex-1 flex bg-gray-100 p-4 space-x-4 overflow-hidden">
             {/* Left Doc */}
             <div className="flex-1 bg-white shadow-lg rounded-lg flex flex-col border border-gray-200">
                <div className="p-3 border-b bg-gray-50 font-medium text-gray-600 flex justify-between">
                    <span>Original Document</span>
                    {file1 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{file1.name}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center p-4 bg-gray-200 relative">
                    {!file1 ? (
                        <label className="cursor-pointer bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center">
                            <span className="text-4xl block mb-2">📄</span>
                            <span className="text-sm font-bold text-gray-500">Upload Old Version</span>
                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, setFile1)} />
                        </label>
                    ) : (
                        <div className="text-center"><span className="text-6xl text-green-300">📄</span><p className="mt-2 font-bold text-green-600">Ready</p></div>
                    )}
                </div>
             </div>

             {/* Right Doc */}
             <div className="flex-1 bg-white shadow-lg rounded-lg flex flex-col border border-gray-200">
                <div className="p-3 border-b bg-gray-50 font-medium text-gray-600 flex justify-between">
                    <span>New Document</span>
                    {file2 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{file2.name}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center p-4 bg-gray-200 relative">
                    {!file2 ? (
                        <label className="cursor-pointer bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center">
                            <span className="text-4xl block mb-2">📑</span>
                            <span className="text-sm font-bold text-gray-500">Upload New Version</span>
                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, setFile2)} />
                        </label>
                    ) : (
                         <div className="text-center"><span className="text-6xl text-blue-300">📑</span><p className="mt-2 font-bold text-blue-600">Ready</p></div>
                    )}
                </div>
             </div>
        </div>
      </div>

      {/* RIGHT: Sidebar Controls */}
      <div className="w-80 bg-white shadow-xl flex flex-col z-10">
        <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Compare PDF</h2>
        </div>

        {/* TABS */}
        <div className="flex border-b">
            <button 
                onClick={() => setMode('semantic')}
                className={`flex-1 py-3 text-sm font-medium flex flex-col items-center space-y-1 border-b-2 transition-colors
                ${mode === 'semantic' ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <span>Semantic Text</span>
            </button>
            <button 
                onClick={() => setMode('overlay')}
                className={`flex-1 py-3 text-sm font-medium flex flex-col items-center space-y-1 border-b-2 transition-colors
                ${mode === 'overlay' ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <span>Content Overlay</span>
            </button>
        </div>

        <div className="p-6 flex-1 bg-gray-50 overflow-y-auto">
            {mode === 'overlay' ? (
                <div className="text-sm text-gray-600 space-y-4">
                    <p><strong>Visual Comparison:</strong> Checks pixel-by-pixel changes.</p>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>Red pixels = Changes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                         <div className="w-4 h-4 bg-gray-300 rounded border"></div>
                         <span>Faded Gray = Original Context</span>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-600 space-y-4">
                     <p><strong>Text Comparison:</strong> Extracts text and finds differences.</p>
                     <p className="text-green-600 font-bold">+ Added Text (Green)</p>
                     <p className="text-red-600 font-bold">- Deleted Text (Red)</p>
                </div>
            )}
        </div>

        <div className="p-6 border-t bg-white">
            <button 
                onClick={handleCompare}
                disabled={processing || !file1 || !file2}
                className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2
                    ${(processing || !file1 || !file2) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                `}
            >
                {processing ? <span>Generating Report...</span> : <span>Download Report ➜</span>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ComparePdf;