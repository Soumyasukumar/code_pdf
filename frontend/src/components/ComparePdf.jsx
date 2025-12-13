import React, { useState,useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ComparePdf() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState('overlay'); // 'semantic' or 'overlay'
  const [error, setError] = useState('');

  const handleFileChange = (e, setFile) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setError('');
    } else {
      setError('Please upload a valid PDF file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, setFile) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setError('');
    } else {
      setError('Please drop a valid PDF file.');
    }
  };

  const handleCompare = async () => {
    if (!file1 || !file2) {
      setError('Please upload both PDF files.');
      return;
    }

    setProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    formData.append('mode', mode);

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
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Comparison failed. Ensure both PDFs are valid.');
    } finally {
      setProcessing(false);
    }
  };

    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | Compare PDF";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Compare PDF <span className="text-red-600">Files</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload two PDFs and get a visual or text-based comparison report.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left: Dual Upload */}
              <div className="flex-1 p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* File 1 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                      Original Document
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, setFile1)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        file1
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                      }`}
                    >
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, setFile1)}
                        className="hidden"
                      />
                      <label htmlFor="" className="cursor-pointer">
                        <div className="text-5xl mb-4">{file1 ? 'Document' : 'Document'}</div>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          {file1 ? file1.name : 'Drop or click to upload'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          PDF up to 50MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* File 2 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                      New Document
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, setFile2)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        file2
                          ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                      }`}
                    >
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange(e, setFile2)}
                        className="hidden"
                      />
                      <label htmlFor="" className="cursor-pointer">
                        <div className="text-5xl mb-4">{file2 ? 'Document' : 'Document'}</div>
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          {file2 ? file2.name : 'Drop or click to upload'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          PDF up to 50MB
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setMode('semantic')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
                      mode === 'semantic'
                        ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>Semantic Text</span>
                  </button>
                  <button
                    onClick={() => setMode('overlay')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
                      mode === 'overlay'
                        ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>Content Overlay</span>
                  </button>
                </div>

                {/* Mode Description */}
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  {mode === 'overlay' ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                      <p><strong>Visual Comparison:</strong> Pixel-by-pixel differences.</p>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>Red = Changes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-300 rounded border"></div>
                        <span>Faded = Original Context</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                      <p><strong>Text Comparison:</strong> Extracted text differences.</p>
                      <p className="text-green-600 font-bold">+ Added Text</p>
                      <p className="text-red-600 font-bold">- Deleted Text</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCompare}
                  disabled={processing || !file1 || !file2}
                  className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
                    processing || !file1 || !file2
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30'
                  }`}
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Report...
                    </>
                  ) : (
                    <>Download Report</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Compare PDFs with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Compare</div>
              <h3 className="font-bold text-lg mb-1">Two Modes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visual overlay or semantic text diff.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lightning</div>
              <h3 className="font-bold text-lg mb-1">Instant Report</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download PDF with highlights in seconds.
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

export default ComparePdf;








// import React, { useState } from 'react';
// import axios from 'axios';

// const ComparePdf = () => {
//   const [file1, setFile1] = useState(null);
//   const [file2, setFile2] = useState(null);
//   const [processing, setProcessing] = useState(false);
//   const [mode, setMode] = useState('overlay'); // 'semantic' or 'overlay'

//   const handleFileChange = (e, setFile) => {
//     if (e.target.files && e.target.files[0]) {
//       setFile(e.target.files[0]);
//     }
//   };

//   const handleCompare = async () => {
//     if (!file1 || !file2) return alert("Please upload both files first.");
//     setProcessing(true);

//     const formData = new FormData();
//     formData.append('file1', file1);
//     formData.append('file2', file2);
//     formData.append('mode', mode); // 👈 SEND THE SELECTED MODE

//     try {
//       const response = await axios.post('http://localhost:5000/api/compare-pdf', formData, {
//         responseType: 'blob',
//       });

//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `comparison_report_${mode}.pdf`);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//     } catch (err) {
//       console.error(err);
//       alert('Comparison failed. Ensure PDFs are valid.');
//     } finally {
//       setProcessing(false);
//     }
//   };

//   return (
//     <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
//       {/* LEFT: Viewer Area */}
//       <div className="flex-1 flex flex-col border-r border-gray-200">
//         <div className="h-14 bg-white border-b flex items-center px-4 space-x-4 shadow-sm">
//              <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-red-600">✕ Close</button>
//              <div className="h-6 w-px bg-gray-300 mx-2"></div>
//              <span className="font-semibold text-gray-700">Comparison View</span>
//         </div>

//         <div className="flex-1 flex bg-gray-100 p-4 space-x-4 overflow-hidden">
//              {/* Left Doc */}
//              <div className="flex-1 bg-white shadow-lg rounded-lg flex flex-col border border-gray-200">
//                 <div className="p-3 border-b bg-gray-50 font-medium text-gray-600 flex justify-between">
//                     <span>Original Document</span>
//                     {file1 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{file1.name}</span>}
//                 </div>
//                 <div className="flex-1 flex items-center justify-center p-4 bg-gray-200 relative">
//                     {!file1 ? (
//                         <label className="cursor-pointer bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center">
//                             <span className="text-4xl block mb-2">📄</span>
//                             <span className="text-sm font-bold text-gray-500">Upload Old Version</span>
//                             <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, setFile1)} />
//                         </label>
//                     ) : (
//                         <div className="text-center"><span className="text-6xl text-green-300">📄</span><p className="mt-2 font-bold text-green-600">Ready</p></div>
//                     )}
//                 </div>
//              </div>

//              {/* Right Doc */}
//              <div className="flex-1 bg-white shadow-lg rounded-lg flex flex-col border border-gray-200">
//                 <div className="p-3 border-b bg-gray-50 font-medium text-gray-600 flex justify-between">
//                     <span>New Document</span>
//                     {file2 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{file2.name}</span>}
//                 </div>
//                 <div className="flex-1 flex items-center justify-center p-4 bg-gray-200 relative">
//                     {!file2 ? (
//                         <label className="cursor-pointer bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-center">
//                             <span className="text-4xl block mb-2">📑</span>
//                             <span className="text-sm font-bold text-gray-500">Upload New Version</span>
//                             <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, setFile2)} />
//                         </label>
//                     ) : (
//                          <div className="text-center"><span className="text-6xl text-blue-300">📑</span><p className="mt-2 font-bold text-blue-600">Ready</p></div>
//                     )}
//                 </div>
//              </div>
//         </div>
//       </div>

//       {/* RIGHT: Sidebar Controls */}
//       <div className="w-80 bg-white shadow-xl flex flex-col z-10">
//         <div className="p-6 border-b">
//             <h2 className="text-2xl font-bold text-gray-800">Compare PDF</h2>
//         </div>

//         {/* TABS */}
//         <div className="flex border-b">
//             <button 
//                 onClick={() => setMode('semantic')}
//                 className={`flex-1 py-3 text-sm font-medium flex flex-col items-center space-y-1 border-b-2 transition-colors
//                 ${mode === 'semantic' ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
//             >
//                 <span>Semantic Text</span>
//             </button>
//             <button 
//                 onClick={() => setMode('overlay')}
//                 className={`flex-1 py-3 text-sm font-medium flex flex-col items-center space-y-1 border-b-2 transition-colors
//                 ${mode === 'overlay' ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
//             >
//                 <span>Content Overlay</span>
//             </button>
//         </div>

//         <div className="p-6 flex-1 bg-gray-50 overflow-y-auto">
//             {mode === 'overlay' ? (
//                 <div className="text-sm text-gray-600 space-y-4">
//                     <p><strong>Visual Comparison:</strong> Checks pixel-by-pixel changes.</p>
//                     <div className="flex items-center space-x-2">
//                         <div className="w-4 h-4 bg-red-500 rounded"></div>
//                         <span>Red pixels = Changes</span>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                          <div className="w-4 h-4 bg-gray-300 rounded border"></div>
//                          <span>Faded Gray = Original Context</span>
//                     </div>
//                 </div>
//             ) : (
//                 <div className="text-sm text-gray-600 space-y-4">
//                      <p><strong>Text Comparison:</strong> Extracts text and finds differences.</p>
//                      <p className="text-green-600 font-bold">+ Added Text (Green)</p>
//                      <p className="text-red-600 font-bold">- Deleted Text (Red)</p>
//                 </div>
//             )}
//         </div>

//         <div className="p-6 border-t bg-white">
//             <button 
//                 onClick={handleCompare}
//                 disabled={processing || !file1 || !file2}
//                 className={`w-full py-4 rounded-xl shadow-lg text-white font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2
//                     ${(processing || !file1 || !file2) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
//                 `}
//             >
//                 {processing ? <span>Generating Report...</span> : <span>Download Report ➜</span>}
//             </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ComparePdf;