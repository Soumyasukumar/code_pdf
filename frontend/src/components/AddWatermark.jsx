import React, { useState, useRef,useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const initialWatermarkSettings = {
  text: 'Sukumar PDF',
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
      a.download = `watermarked_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setAddedWatermarks([]);
      setWatermarkSettings(initialWatermarkSettings);
      setFile(null);
      fileInputRef.current.value = '';
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
      <div className="grid grid-cols-3 gap-2">
        {positions.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
              selectedPosition === pos
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                selectedPosition === pos ? 'bg-blue-600' : 'bg-gray-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };
    // SET PAGE TITLE HERE
    useEffect(() => {
      document.title = "PDFPro | Add Watermark";
    }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Add Watermark to <span className="text-blue-600">PDF</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Add text or image watermarks with full control over position, style, and opacity.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* PDF Upload */}
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
                  } ${file ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor={fileInputRef.current?.id} className="cursor-pointer">
                    <div className="text-5xl mb-4">Document</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : 'Drop your PDF here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supports PDF up to 50MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Watermark Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    watermarkType === 'text'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Text Watermark
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    watermarkType === 'image'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Image Watermark
                </button>
              </div>

              {/* Text Watermark Options */}
              {watermarkType === 'text' && (
                <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={watermarkSettings.text}
                      onChange={(e) => handleSettingChange('text', e.target.value)}
                      placeholder="Enter your watermark text..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Font</label>
                      <select
                        value={watermarkSettings.fontFamily}
                        onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                      >
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times-Roman">Times New Roman</option>
                        <option value="Courier">Courier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Size</label>
                      <input
                        type="number"
                        value={watermarkSettings.fontSize}
                        onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                        min="10"
                        max="200"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={watermarkSettings.textColor}
                        onChange={(e) => handleSettingChange('textColor', e.target.value)}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSettingChange('isBold', !watermarkSettings.isBold)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg border ${
                          watermarkSettings.isBold
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSettingChange('isItalic', !watermarkSettings.isItalic)}
                        className={`flex-1 py-2 text-sm italic rounded-lg border ${
                          watermarkSettings.isItalic
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addWatermarkToList}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                  >
                    Add Text Watermark
                  </button>
                </div>
              )}

              {/* Image Watermark Upload */}
              {watermarkType === 'image' && (
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label htmlFor={imageInputRef.current?.id}>
                    <div className="cursor-pointer inline-block">
                      <div className="text-6xl mb-3">Image</div>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Click to upload image watermark
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PNG, JPG, SVG • Up to 5MB
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Position & Mosaic */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Position
                  </label>
                  <PositionGrid
                    selectedPosition={watermarkSettings.positionKey}
                    onChange={(pos) => handleSettingChange('positionKey', pos)}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watermarkSettings.isMosaic}
                      onChange={(e) => handleSettingChange('isMosaic', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      Mosaic (Tile across page)
                    </span>
                  </label>
                </div>
              </div>

              {/* Added Watermarks List */}
              {addedWatermarks.length > 0 && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Added Water ingenuity ({addedWatermarks.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {addedWatermarks.map((wm) => (
                      <div
                        key={wm.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {wm.type === 'text' ? 'Text' : 'Image'}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                            {wm.type === 'text' ? wm.text : 'Image watermark'}
                            {wm.isMosaic && ' (Mosaic)'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWatermark(wm.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">
                  Watermark added and PDF downloaded!
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !file || addedWatermarks.length === 0}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading || !file || addedWatermarks.length === 0
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
                    Adding Watermarks...
                  </>
                ) : (
                  <>
                    Add {addedWatermarks.length} Watermark{addedWatermarks.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Pro Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use <strong>semi-transparent</strong> watermarks (opacity 0.3–0.5)</li>
                <li>• <strong>Center + Mosaic</strong> = full-page background</li>
                <li>• Add multiple layers: logo + text + date</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Add Watermarks with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Design</div>
              <h3 className="font-bold text-lg mb-1">Full Design Control</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Text, image, position, opacity, rotation, tiling.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Lightning</div>
              <h3 className="font-bold text-lg mb-1">Instant Processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add watermarks in seconds with cloud power.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Free</div>
              <h3 className="font-bold text-lg mb-1">100% Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No limits. No sign-up. No ads.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default AddWatermark;