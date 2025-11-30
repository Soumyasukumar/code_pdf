import React, { useState, useRef } from 'react';

// Define initial state for text watermark settings
const initialWatermarkSettings = {
  text: 'iLovePDF',
  fontFamily: 'Helvetica', // Default font
  fontSize: 50,
  textColor: '#CC3333', // Default color, similar to screenshot
  isBold: false,
  isItalic: false,
  isUnderline: false,
  positionKey: 'center-center', // e.g., 'top-left', 'center-center'
  isMosaic: false, // Tiling option
  opacity: 0.4, // Transparency
  rotation: 45,
  layer: 'foreground', // 'foreground' (above content) or 'background' (below content)
};

const AddWatermark = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' or 'image'
  const [watermarkSettings, setWatermarkSettings] = useState(initialWatermarkSettings);
  const [addedWatermarks, setAddedWatermarks] = useState([]); // List of watermarks to apply
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null); // Ref for image upload

  // Helper to update settings
  const handleSettingChange = (key, value) => {
    setWatermarkSettings(prev => ({ ...prev, [key]: value }));
  };

  // Function to add the configured watermark to the list
  const addWatermarkToList = () => {
    if (watermarkType === 'text') {
      if (!watermarkSettings.text.trim()) {
        alert('Please enter watermark text');
        return;
      }
      // Add a copy of the current settings to the list
      setAddedWatermarks([...addedWatermarks, {
        id: Date.now(),
        type: 'text',
        ...watermarkSettings
      }]);
      // Clear current text input, keep other settings for convenience
      setWatermarkSettings(prev => ({ ...prev, text: '' }));
    }
    // Image watermark list logic will need to be expanded here 
    // to include image settings like size, opacity, position etc.
  };

  const removeWatermark = (id) => {
    setAddedWatermarks(addedWatermarks.filter(w => w.id !== id));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // For simplicity, using default image settings, but these should also be configurable
        setAddedWatermarks([...addedWatermarks, {
          id: Date.now(),
          type: 'image',
          imageData: e.target.result,
          width: 150,
          height: 150,
          opacity: 0.4,
          rotation: 0,
          positionKey: 'center-center'
        }]);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!addedWatermarks.length) {
      alert('Please add at least one watermark');
      return;
    }

    const formData = new FormData();
    const fileInput = fileInputRef.current;
    if (!fileInput.files[0]) {
      alert('Please upload a PDF file');
      return;
    }

    formData.append('pdfFile', fileInput.files[0]);
    // Send the list of all configured watermarks
    formData.append('watermarkData', JSON.stringify({
      watermarks: addedWatermarks,
      // You should add startPage and endPage logic back if you need it, 
      // but the iLovePDF screenshot UI handles range per watermark if multiple are added, 
      // or simply applies to all pages. We'll skip range for this minimal example.
    }));

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
        
        // Clear form
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
            style={{ cursor: 'pointer', border: '1px solid #ccc', aspectRatio: '1/1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {/* Simple visual indicator */}
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: selectedPosition === pos ? '#e6323c' : '#ccc'
            }} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="section" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
      <div className="pdf-preview" style={{ flex: 1, border: '1px solid #ddd', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Mock PDF upload area (like the screenshot) */}
        <div style={{ padding: '50px', border: '1px dashed #ccc', textAlign: 'center' }}>
            <p>Drag and drop PDF here</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              required
              className="form-control"
              style={{ display: 'none' }}
            />
            <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-primary">
                Select PDF
            </button>
        </div>
      </div>

      <div className="watermark-options-panel" style={{ flex: 1, minWidth: '350px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h3>Watermark options</h3>
        <div className="toggle-group" style={{ display: 'flex', marginBottom: '20px' }}>
          <button
            type="button"
            className={`toggle-btn ${watermarkType === 'text' ? 'active-tab' : 'inactive-tab'}`}
            onClick={() => setWatermarkType('text')}
            style={{ flex: 1, padding: '10px', backgroundColor: watermarkType === 'text' ? '#f0f0f0' : '#fff', border: 'none', borderBottom: watermarkType === 'text' ? '2px solid #e6323c' : '1px solid #ddd' }}
          >
            A Place text
          </button>
          <button
            type="button"
            className={`toggle-btn ${watermarkType === 'image' ? 'active-tab' : 'inactive-tab'}`}
            onClick={() => setWatermarkType('image')}
            style={{ flex: 1, padding: '10px', backgroundColor: watermarkType === 'image' ? '#f0f0f0' : '#fff', border: 'none', borderBottom: watermarkType === 'image' ? '2px solid #e6323c' : '1px solid #ddd' }}
          >
            🖼️ Place image
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {watermarkType === 'text' && (
            <div className="watermark-text-options">
              <div className="form-group">
                <label>Text:</label>
                <input
                  type="text"
                  value={watermarkSettings.text}
                  onChange={(e) => handleSettingChange('text', e.target.value)}
                  placeholder="Enter watermark text..."
                  className="form-control"
                  style={{ padding: '8px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label>Text Format:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={watermarkSettings.fontFamily}
                    onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                    style={{ padding: '5px' }}
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
                    style={{ width: '60px', padding: '5px' }}
                  />
                  <input
                    type="color"
                    value={watermarkSettings.textColor}
                    onChange={(e) => handleSettingChange('textColor', e.target.value)}
                    style={{ width: '30px', height: '30px', padding: 0, border: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSettingChange('isBold', !watermarkSettings.isBold)}
                    style={{ fontWeight: watermarkSettings.isBold ? 'bold' : 'normal', padding: '5px 10px' }}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('isItalic', !watermarkSettings.isItalic)}
                    style={{ fontStyle: watermarkSettings.isItalic ? 'italic' : 'normal', padding: '5px 10px' }}
                  >
                    *I*
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={addWatermarkToList}
                className="btn btn-primary"
                style={{ padding: '10px', backgroundColor: '#e6323c', color: 'white', border: 'none', width: '100%', marginTop: '10px' }}
              >
                ADD TEXT
              </button>
            </div>
          )}

          {watermarkType === 'image' && (
             <div className="watermark-image-options">
                <div className="form-group">
                  <label>Upload Image:</label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="form-control"
                  />
                </div>
                {/* Additional image settings (size, opacity, position) should be added here */}
             </div>
          )}
          
          <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <div className="form-group">
              <label>Position:</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <PositionGrid
                  selectedPosition={watermarkSettings.positionKey}
                  onChange={(pos) => handleSettingChange('positionKey', pos)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                  <input
                    type="checkbox"
                    checked={watermarkSettings.isMosaic}
                    onChange={(e) => handleSettingChange('isMosaic', e.target.checked)}
                  />
                  Mosaic (Tiling)
                </label>
              </div>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Transparency:</label>
                <select
                  value={watermarkSettings.opacity}
                  onChange={(e) => handleSettingChange('opacity', parseFloat(e.target.value))}
                  className="form-control"
                  style={{ padding: '8px', border: '1px solid #ddd', width: '100%' }}
                >
                  <option value="0.9">No transparency</option>
                  <option value="0.7">Low</option>
                  <option value="0.5">Medium</option>
                  <option value="0.3">High</option>
                  <option value="0.1">Very High</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Rotation:</label>
                <select
                  value={watermarkSettings.rotation}
                  onChange={(e) => handleSettingChange('rotation', parseInt(e.target.value))}
                  className="form-control"
                  style={{ padding: '8px', border: '1px solid #ddd', width: '100%' }}
                >
                  <option value="0">Do not rotate</option>
                  <option value="45">45° Diagonal</option>
                  <option value="90">90°</option>
                  <option value="-45">-45° Diagonal</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Layer:</label>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <label>
                        <input
                            type="radio"
                            value="foreground"
                            checked={watermarkSettings.layer === 'foreground'}
                            onChange={() => handleSettingChange('layer', 'foreground')}
                        /> Above Content
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="background"
                            checked={watermarkSettings.layer === 'background'}
                            onChange={() => handleSettingChange('layer', 'background')}
                        /> Below Content
                    </label>
                </div>
            </div>
          </div>


          {/* Added Watermarks List */}
          {addedWatermarks.length > 0 && (
            <div className="watermark-list" style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              <h4>Added Watermarks ({addedWatermarks.length})</h4>
              <div className="watermark-items">
                {addedWatermarks.map((watermark) => (
                  <div key={watermark.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px dashed #eee' }}>
                    <span>
                      {watermark.type === 'text' 
                        ? `📝 ${watermark.text.substring(0, 20)}...` 
                        : '🖼️ Image'}
                      {watermark.isMosaic && ' (Mosaic)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWatermark(watermark.id)}
                      className="btn btn-danger btn-sm"
                      style={{ background: 'transparent', color: '#e6323c', border: 'none', cursor: 'pointer' }}
                    >
                      ❌ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || addedWatermarks.length === 0}
            className="btn btn-success btn-large"
            style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#e6323c', 
              color: 'white', 
              border: 'none', 
              width: '100%', 
              fontSize: '1.2em',
              borderRadius: '5px'
            }}
          >
            {isLoading ? '⏳ Adding Watermark...' : `💧 Add ${addedWatermarks.length} Watermark${addedWatermarks.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddWatermark;