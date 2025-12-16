import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EditPDF = () => {
  useEffect(() => {
    document.title = "PDFPro | Edit PDF Online";
  }, []);

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [edits, setEdits] = useState([]);
  const [editMode, setEditMode] = useState('text');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Edit form state
  const [editText, setEditText] = useState('Your Text Here');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [xPos, setXPos] = useState(100);
  const [yPos, setYPos] = useState(400);
  const [rectWidth, setRectWidth] = useState(200);
  const [rectHeight, setRectHeight] = useState(100);
  const [rectColor, setRectColor] = useState('#3B82F6');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null); // This was missing the connection!

  // === Drag & Drop Handlers ===
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      handleFileUpload(droppedFile);
    } else {
      setError('Please drop a valid PDF file');
    }
  };

  // === File Upload Handler ===
  const handleFileUpload = async (uploadedFile) => {
    if (!uploadedFile || uploadedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);
    setError('');
    setEdits([]);
    setPageCount(0);
    setCurrentPage(0);

    const formData = new FormData();
    formData.append('pdfFile', uploadedFile);

    try {
      const res = await fetch('http://localhost:5000/api/pdf-page-count', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to read PDF');
      }

      const data = await res.json();
      if (data.pageCount > 0) {
        setPageCount(data.pageCount);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('No pages found in PDF');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to load PDF. Please try again.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsLoading(false);
    }
  };

  // === Canvas Click to Set Position ===
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pdfX = Math.round((x / rect.width) * 595);
    const pdfY = Math.round(842 - (y / rect.height) * 842);

    setXPos(Math.max(50, Math.min(pdfX, 545)));
    setYPos(Math.max(50, Math.min(pdfY, 792)));
  };

  // === Add Edit ===
  const addEdit = () => {
    if (!file) return;

    if (editMode === 'text' && !editText.trim()) {
      setError('Please enter some text');
      return;
    }

    const baseEdit = { pageIndex: currentPage, x: xPos, y: yPos };

    const newEdit = editMode === 'text'
      ? { ...baseEdit, type: 'text', text: editText, fontSize, color: textColor }
      : { ...baseEdit, type: 'rectangle', width: rectWidth, height: rectHeight, color: rectColor };

    setEdits(prev => [...prev, newEdit]);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  // === Remove Edit ===
  const removeEdit = (index) => {
    setEdits(prev => prev.filter((_, i) => i !== index));
  };

  // === Download Edited PDF ===
  const downloadEditedPDF = async () => {
    if (edits.length === 0) {
      setError('Add at least one edit first');
      return;
    }

    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('editData', JSON.stringify({ edits }));

    try {
      const res = await fetch('http://localhost:5000/api/edit-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Edit failed on server');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError('Failed to apply edits. Check server console.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Edit PDF <span className="text-blue-600">Like a Pro</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Add text, draw rectangles, annotate — pixel-perfect and 100% free.
          </p>
        </div>
      </section>

      {/* Main Editor */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">

            {/* Upload Area */}
            {!file ? (
              <div className="p-12">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer
                    ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                  `}
                >
                  {/* Hidden Input with ref */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="pdf-upload-input"
                  />

                  {/* Clickable Label */}
                  <label htmlFor="pdf-upload-input" className="cursor-pointer block">
                    <div className="text-6xl mb-6">Edit</div>
                    <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Drop your PDF here or click to upload
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      Supports up to 100MB • No signup required
                    </p>
                  </label>
                </div>

                {isLoading && (
                  <div className="mt-8 text-center">
                    <div className="inline-block animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    <p className="mt-4 text-lg">Analyzing your PDF...</p>
                  </div>
                )}
              </div>
            ) : (
              /* Editor Interface */
              <div className="grid lg:grid-cols-3 gap-8 p-8">
                {/* Left Side */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Page Nav */}
                  {pageCount > 1 && (
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        ← Previous
                      </button>
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                        Page {currentPage + 1} of {pageCount}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))}
                        disabled={currentPage === pageCount - 1}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next →
                      </button>
                    </div>
                  )}

                  {/* Canvas */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-8">
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-inner cursor-crosshair border-2 border-gray-200 dark:border-gray-700"
                      style={{ minHeight: '640px' }}
                    />
                    <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Click anywhere → Position: <strong>({xPos}, {yPos})</strong>
                    </p>
                  </div>
                </div>

                {/* Right Side - Tools */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Tools</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setEditMode('text')}
                        className={`py-4 rounded-xl font-semibold transition ${editMode === 'text' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                      >
                        Text
                      </button>
                      <button
                        onClick={() => setEditMode('rectangle')}
                        className={`py-4 rounded-xl font-semibold transition ${editMode === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                      >
                        Rectangle
                      </button>
                    </div>
                  </div>

                  {/* Text Form */}
                  {editMode === 'text' && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 space-y-5">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="Enter text here"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="flex items-center gap-4">
                        <input type="range" min="8" max="72" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="flex-1" />
                        <span className="font-bold w-12 text-right">{fontSize}px</span>
                      </div>
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-14 rounded-lg cursor-pointer" />
                    </div>
                  )}

                  {/* Rectangle Form */}
                  {editMode === 'rectangle' && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" value={rectWidth} onChange={(e) => setRectWidth(+e.target.value)} placeholder="Width (px)" className="px-4 py-3 rounded-lg border" />
                        <input type="number" value={rectHeight} onChange={(e) => setRectHeight(+e.target.value)} placeholder="Height (px)" className="px-4 py-3 rounded-lg border" />
                      </div>
                      <input type="color" value={rectColor} onChange={(e) => setRectColor(e.target.value)} className="w-full h-14 rounded-lg cursor-pointer" />
                    </div>
                  )}

                  <button
                    onClick={addEdit}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl transition active:scale-95 shadow-lg"
                  >
                    Add to Page {currentPage + 1}
                  </button>

                  {/* Applied Edits */}
                  {edits.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
                      <h4 className="font-bold text-lg mb-3">Edits ({edits.length})</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {edits.map((edit, i) => (
                          <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg text-sm">
                            <div className="truncate flex-1">
                              <span className="font-medium">{edit.type === 'text' ? edit.text : 'Rectangle'}</span>
                              <span className="text-gray-500 ml-2">• Page {edit.pageIndex + 1}</span>
                            </div>
                            <button onClick={() => removeEdit(i)} className="text-red-600 hover:text-red-700 ml-3">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages & Actions */}
            {(error || success || file) && (
              <div className="p-8 border-t dark:border-gray-700 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
                    {file && !success ? 'PDF loaded successfully!' : 'Edit added!'}
                  </div>
                )}

                {file && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={downloadEditedPDF}
                      disabled={isProcessing || edits.length === 0}
                      className={`py-5 px-10 rounded-xl font-bold text-white text-lg transition-all ${isProcessing || edits.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg active:scale-95'}`}
                    >
                      {isProcessing ? 'Processing...' : `Download Edited PDF (${edits.length} edits)`}
                    </button>
                    <button
                      onClick={() => {
                        setFile(null); setEdits([]); setPageCount(0); setError(''); setSuccess(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="py-5 px-10 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition"
                    >
                      New PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-12 p-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">Pro Tips</h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li>• Click the canvas to place text or shapes precisely</li>
              <li>• Use page navigation for multi-page PDFs</li>
              <li>• All changes are applied when you download</li>
              <li>• Your file is automatically deleted after 1 hour</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Choose PDFPro Editor?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">
              <div className="text-5xl mb-4">Secure</div>
              <h3 className="font-bold text-xl mb-2">Private & Secure</h3>
              <p className="text-gray-600 dark:text-gray-400">Files deleted after 1 hour</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">
              <div className="text-5xl mb-4">Precise</div>
              <h3 className="font-bold text-xl mb-2">Pixel Perfect</h3>
              <p className="text-gray-600 dark:text-gray-400">Exact positioning control</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow">
              <div className="text-5xl mb-4">Free</div>
              <h3 className="font-bold text-xl mb-2">100% Free</h3>
              <p className="text-gray-600 dark:text-gray-400">No limits, no signup</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default EditPDF;