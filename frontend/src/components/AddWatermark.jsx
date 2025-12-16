import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const initialWatermarkSettings = {
  text: 'Add Watermark here',
  fontFamily: 'Helvetica',
  fontSize: 50,
  textColor: '#CC3333',
  isBold: false,
  isItalic: false,
  isUnderline: false,
  positionKey: 'center-center',
  isMosaic: false,
  opacity: 0.4,
  rotation: 45,
  layer: 'foreground',
};

function AddWatermark() {
  const [isLoading, setIsLoading] = useState(false);
  const [watermarkType, setWatermarkType] = useState('text');
  const [watermarkSettings, setWatermarkSettings] = useState(initialWatermarkSettings);
  const [addedWatermarks, setAddedWatermarks] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    document.title = "PDFPro | Add Watermark";
  }, []);

  const handleSettingChange = (key, value) => {
    setWatermarkSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addWatermarkToList = () => {
    if (watermarkType === 'text') {
      if (!watermarkSettings.text.trim()) {
        setError('Please enter watermark text');
        return;
      }

      setAddedWatermarks([
        ...addedWatermarks,
        {
          id: Date.now(),
          type: 'text',
          ...watermarkSettings,
        },
      ]);

      setWatermarkSettings((prev) => ({ ...prev, text: '' }));
    }
    setError('');
  };

  const removeWatermark = (id) => {
    setAddedWatermarks(addedWatermarks.filter((w) => w.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAddedWatermarks([
        ...addedWatermarks,
        {
          id: Date.now(),
          type: 'image',
          imageData: event.target.result,
          width: 150,
          height: 150,
          opacity: 0.4,
          rotation: 0,
          positionKey: 'center-center',
          isMosaic: false,
        },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
      setFile(null);
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
      setSuccess(false);
    } else {
      setError('Please drop a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please upload a PDF file');
      return;
    }
    if (!addedWatermarks.length) {
      setError('Please add at least one watermark');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('watermarkData', JSON.stringify({ watermarks: addedWatermarks }));

    try {
      const response = await fetch('http://localhost:5000/api/add-watermark', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add watermark');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_${file.name}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to add watermark. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const PositionGrid = ({ selectedPosition, onChange }) => {
    const positions = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center-center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right',
    ];

    return (
      <div className="grid grid-cols-3 gap-3">
        {positions.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${
              selectedPosition === pos
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full ${selectedPosition === pos ? 'bg-blue-600' : 'bg-gray-400'}`} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Add Watermark to <span className="text-blue-600">PDF</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Protect your documents with custom text or image watermarks — fully customizable.
          </p>
        </div>
      </section>

      {/* Main Tool */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* PDF Upload - FIXED */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Upload PDF File
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
                    ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                    ${file ? 'bg-green-50 dark:bg-green-900/10 border-green-500 dark:border-green-600' : ''}
                  `}
                >
                  {/* Hidden Input with proper ID */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-watermark-upload"
                  />

                  {/* Label now correctly linked */}
                  <label htmlFor="pdf-watermark-upload" className="block cursor-pointer">
                    <div className="text-6xl mb-4">Document</div>
                    <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : 'Drop your PDF here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Supports PDF up to 100MB • Secure & Private
                    </p>
                  </label>

                  {file && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              {/* Rest of your beautiful UI */}
              {/* Watermark Type Toggle */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    watermarkType === 'text'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Text Watermark
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    watermarkType === 'image'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Image Watermark
                </button>
              </div>

              {/* Text Options */}
              {watermarkType === 'text' && (
                <div className="space-y-6 p-8 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                  <input
                    type="text"
                    value={watermarkSettings.text}
                    onChange={(e) => handleSettingChange('text', e.target.value)}
                    placeholder="Your watermark text..."
                    className="w-full px-5 py-4 text-lg rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 outline-none"
                  />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Font Size</label>
                      <input
                        type="number"
                        value={watermarkSettings.fontSize}
                        onChange={(e) => handleSettingChange('fontSize', +e.target.value)}
                        min="10"
                        max="300"
                        className="w-full px-4 py-3 rounded-lg border dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Color</label>
                      <input
                        type="color"
                        value={watermarkSettings.textColor}
                        onChange={(e) => handleSettingChange('textColor', e.target.value)}
                        className="w-full h-12 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={watermarkSettings.opacity * 100}
                        onChange={(e) => handleSettingChange('opacity', e.target.value / 100)}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{Math.round(watermarkSettings.opacity * 100)}%</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rotation</label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={watermarkSettings.rotation}
                        onChange={(e) => handleSettingChange('rotation', +e.target.value)}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{watermarkSettings.rotation}°</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addWatermarkToList}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95"
                  >
                    Add Text Watermark
                  </button>
                </div>
              )}

              {/* Image Upload */}
              {watermarkType === 'image' && (
                <div className="p-10 bg-gray-50 dark:bg-gray-700 rounded-2xl text-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-watermark-upload"
                  />
                  <label htmlFor="image-watermark-upload" className="cursor-pointer">
                    <div className="text-6xl mb-4">Image</div>
                    <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
                      Click to upload image watermark
                    </p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG, SVG • Max 5MB</p>
                  </label>
                </div>
              )}

              {/* Position Grid */}
              <div className="bg-gray-50 dark:bg-gray-700 p-8 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">Position</h3>
                <PositionGrid
                  selectedPosition={watermarkSettings.positionKey}
                  onChange={(pos) => handleSettingChange('positionKey', pos)}
                />
                <div className="mt-6 flex items-center justify-center">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watermarkSettings.isMosaic}
                      onChange={(e) => handleSettingChange('isMosaic', e.target.checked)}
                      className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-lg font-medium">Tile as Mosaic (Repeat across page)</span>
                  </label>
                </div>
              </div>

              {/* Added Watermarks */}
              {addedWatermarks.length > 0 && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <h3 className="font-bold text-xl mb-4 text-blue-900 dark:text-blue-100">
                    Added Watermarks ({addedWatermarks.length})
                  </h3>
                  <div className="space-y-3">
                    {addedWatermarks.map((wm) => (
                      <div key={wm.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{wm.type === 'text' ? 'Text' : 'Image'}</span>
                          <div>
                            <p className="font-medium">
                              {wm.type === 'text' ? `"${wm.text}"` : 'Image watermark'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {wm.positionKey.replace(/-/g, ' ')} • {wm.isMosaic && 'Mosaic'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWatermark(wm.id)}
                          className="text-red-600 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {error && (
                <div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-center font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl text-center font-medium">
                  Watermark added successfully! PDF downloaded.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !file || addedWatermarks.length === 0}
                className={`w-full py-6 rounded-xl font-bold text-xl text-white transition-all duration-200 flex items-center justify-center gap-4
                  ${isLoading || !file || addedWatermarks.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl active:scale-95'
                  }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Adding Watermarks...
                  </>
                ) : (
                  <>
                    Add {addedWatermarks.length} Watermark{addedWatermarks.length !== 1 ? 's' : ''} to PDF
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-12 p-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">Pro Tips</h3>
              <ul className="space-y-3 text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-3">
                  <span className="text-2xl">Tip</span>
                  <span>Use opacity 30–50% for professional watermarks</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">Tip</span>
                  <span>Center + Mosaic = perfect background watermark</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">Tip</span>
                  <span>Add multiple layers: logo + "CONFIDENTIAL" + date</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Choose PDFPro Watermark?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
              <div className="text-5xl mb-4">Design</div>
              <h3 className="font-bold text-xl mb-2">Full Creative Control</h3>
              <p className="text-gray-600 dark:text-gray-400">Position, opacity, rotation, mosaic — everything.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
              <div className="text-5xl mb-4">Fast</div>
              <h3 className="font-bold text-xl mb-2">Instant Results</h3>
              <p className="text-gray-600 dark:text-gray-400">Add multiple watermarks in seconds.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
              <div className="text-5xl mb-4">Free</div>
              <h3 className="font-bold text-xl mb-2">100% Free Forever</h3>
              <p className="text-gray-600 dark:text-gray-400">No limits. No signup. No watermarks on watermarks</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default AddWatermark;