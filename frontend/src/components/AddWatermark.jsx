import React, { useState, useRef } from 'react';
import './AddWatermark.css'; // import stylesheet

const initialWatermarkSettings = {
  text: 'iLovePDF',
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

const AddWatermark = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [watermarkType, setWatermarkType] = useState('text');
  const [watermarkSettings, setWatermarkSettings] = useState(initialWatermarkSettings);
  const [addedWatermarks, setAddedWatermarks] = useState([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleSettingChange = (key, value) => {
    setWatermarkSettings(prev => ({ ...prev, [key]: value }));
  };

  const addWatermarkToList = () => {
    if (watermarkType === 'text') {
      if (!watermarkSettings.text.trim()) {
        alert('Please enter watermark text');
        return;
      }

      setAddedWatermarks([...addedWatermarks, {
        id: Date.now(),
        type: 'text',
        ...watermarkSettings
      }]);

      setWatermarkSettings(prev => ({ ...prev, text: '' }));
    }
  };

  const removeWatermark = (id) => {
    setAddedWatermarks(addedWatermarks.filter(w => w.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAddedWatermarks([...addedWatermarks, {
        id: Date.now(),
        type: 'image',
        imageData: event.target.result,
        width: 150,
        height: 150,
        opacity: 0.4,
        rotation: 0,
        positionKey: 'center-center'
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!addedWatermarks.length) {
      alert('Please add at least one watermark');
      return;
    }

    const fileInput = fileInputRef.current;
    if (!fileInput.files[0]) {
      alert('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', fileInput.files[0]);
    formData.append('watermarkData', JSON.stringify({ watermarks: addedWatermarks }));

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/add-watermark', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watermarked_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setAddedWatermarks([]);
        setWatermarkSettings(initialWatermarkSettings);
        fileInput.value = '';
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Watermark error:', error);
      alert('Failed to add watermark');
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
      <div className="position-grid">
        {positions.map(pos => (
          <div
            key={pos}
            className={`position-cell ${selectedPosition === pos ? 'selected' : ''}`}
            onClick={() => onChange(pos)}
          >
            <span className={`position-dot ${selectedPosition === pos ? 'active-dot' : ''}`} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="watermark-container">
      {/* PDF Upload Section */}
      <div className="pdf-preview">
        <div className="pdf-drop-area">
          <p>Drag and drop PDF here</p>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            className="hidden-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="btn primary"
          >
            Select PDF
          </button>
        </div>
      </div>

      {/* Watermark Options Panel */}
      <div className="options-panel">
        <h3>Watermark options</h3>

        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${watermarkType === 'text' ? 'active' : ''}`}
            onClick={() => setWatermarkType('text')}
          >
            A Place text
          </button>
          <button
            type="button"
            className={`toggle-btn ${watermarkType === 'image' ? 'active' : ''}`}
            onClick={() => setWatermarkType('image')}
          >
            🖼️ Place image
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {watermarkType === 'text' && (
            <div className="text-options">
              <label>Text:</label>
              <input
                type="text"
                value={watermarkSettings.text}
                onChange={(e) => handleSettingChange('text', e.target.value)}
                placeholder="Enter watermark text..."
                className="input"
              />

              <div className="format-row">
                <select
                  value={watermarkSettings.fontFamily}
                  onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                  className="input"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                </select>

                <input
                  type="number"
                  value={watermarkSettings.fontSize}
                  onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                  min="10"
                  max="100"
                  className="input small"
                />

                <input
                  type="color"
                  value={watermarkSettings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  className="color-picker"
                />

                <button
                  type="button"
                  onClick={() => handleSettingChange('isBold', !watermarkSettings.isBold)}
                  className={`format-btn ${watermarkSettings.isBold ? 'active-format' : ''}`}
                >
                  B
                </button>

                <button
                  type="button"
                  onClick={() => handleSettingChange('isItalic', !watermarkSettings.isItalic)}
                  className={`format-btn ${watermarkSettings.isItalic ? 'active-format' : ''}`}
                >
                  I
                </button>
              </div>

              <button
                type="button"
                onClick={addWatermarkToList}
                className="btn danger full"
              >
                ADD TEXT
              </button>
            </div>
          )}

          {watermarkType === 'image' && (
            <div className="image-options">
              <label>Upload Image:</label>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="input"
              />
            </div>
          )}

          <div className="position-section">
            <label>Position:</label>
            <div className="position-row">
              <PositionGrid
                selectedPosition={watermarkSettings.positionKey}
                onChange={(pos) => handleSettingChange('positionKey', pos)}
              />

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={watermarkSettings.isMosaic}
                  onChange={(e) => handleSettingChange('isMosaic', e.target.checked)}
                />
                Mosaic (Tiling)
              </label>
            </div>
          </div>

          {/* Watermarks List */}
          {addedWatermarks.length > 0 && (
            <div className="watermark-list">
              <h4>Added Watermarks ({addedWatermarks.length})</h4>

              {addedWatermarks.map((watermark) => (
                <div key={watermark.id} className="watermark-item">
                  <span>
                    {watermark.type === 'text'
                      ? `📝 ${watermark.text.substring(0, 20)}...`
                      : '🖼️ Image'}
                    {watermark.isMosaic && ' (Mosaic)'}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeWatermark(watermark.id)}
                    className="remove-btn"
                  >
                    ❌ Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || addedWatermarks.length === 0}
            className="btn danger full submit-btn"
          >
            {isLoading ? '⏳ Adding Watermark...' : `💧 Add ${addedWatermarks.length} Watermark${addedWatermarks.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddWatermark;
