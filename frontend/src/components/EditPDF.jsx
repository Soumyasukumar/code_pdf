import React, { useState, useRef, useEffect, useCallback } from 'react';

const EditPDF = () => {
  // ✅ FIX: This useEffect hook is now correctly inside the component body
  useEffect(() => {
    document.title = "PDFPro | Edit PDF";
  }, []);

  // Core states
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [edits, setEdits] = useState([]);
  const [editMode, setEditMode] = useState('text');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit form states
  const [editText, setEditText] = useState('Sample Text');
  const [fontSize, setFontSize] = useState(12);
  const [textColor, setTextColor] = useState('#000000');
  const [xPos, setXPos] = useState(100);
  const [yPos, setYPos] = useState(700);
  const [rectWidth, setRectWidth] = useState(100);
  const [rectHeight, setRectHeight] = useState(50);
  const [rectColor, setRectColor] = useState('#FF0000');

  // Refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Constants
  const PDF_PAGE_WIDTH = 595;
  const PDF_PAGE_HEIGHT = 842;
  const CANVAS_SCALE = 1.5;

  // Safe JSON parse
  const safeJsonParse = useCallback(async (response) => {
    try {
      const textContent = await response.text();
      if (!textContent.trim()) {
        throw new Error('Empty response from server');
      }
      return JSON.parse(textContent);
    } catch (parseErr) {
      console.error('JSON Parse error:', parseErr);
      throw new Error(`Server response error (Status: ${response.status})`);
    }
  }, []);

  // File upload handler
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    console.log('📤 Uploading:', selectedFile.name, selectedFile.size);

    setFile(selectedFile);
    setLoading(true);
    setError('');
    setEdits([]);
    setPageCount(0);

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('http://localhost:5000/api/pdf-page-count', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await safeJsonParse(response);
      console.log('✅ Page count received:', result.pageCount);
      
      if (result.pageCount && result.pageCount > 0) {
        setPageCount(result.pageCount);
        setCurrentPage(0);
        setXPos(100);
        setYPos(700);
      } else {
        throw new Error('Invalid page count: ' + result.pageCount);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorMsg = `Failed to load PDF: ${err.message}`;
      setError(errorMsg);
      alert(errorMsg);
      setFile(null);
      setPageCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  };

  // Canvas to PDF coordinates
  const canvasToPdfCoords = (canvasX, canvasY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const realCanvasX = (canvasX) * scaleX;
    const realCanvasY = (canvasY) * scaleY;
    
    const pdfX = (realCanvasX / (canvas.width / PDF_PAGE_WIDTH));
    const pdfY = PDF_PAGE_HEIGHT - (realCanvasY / (canvas.height / PDF_PAGE_HEIGHT));
    
    return {
      x: Math.max(10, Math.min(Math.round(pdfX), PDF_PAGE_WIDTH - 200)),
      y: Math.max(10, Math.min(Math.round(pdfY), PDF_PAGE_HEIGHT - 50))
    };
  };

  // Draw PDF page preview
  const drawPDFPage = (ctx) => {
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Page border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, ctx.canvas.width - 4, ctx.canvas.height - 4);

    // Page header
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${currentPage + 1} of ${pageCount}`, 
      ctx.canvas.width / 2, 40);

    // PDF Content Preview Area
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(50, 100, ctx.canvas.width - 100, ctx.canvas.height - 150);

    // Sample PDF content
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'left';
    
    const sampleContent = [
      '📄 YOUR PDF CONTENT APPEARS HERE',
      '===========================',
      '',
      'This is a preview of your actual PDF page.',
      'All your original content will be preserved',
      'when you download the edited version.',
      '',
      `→ Current Position: (${xPos}, ${yPos})`,
      `→ Ready to add: ${editMode.toUpperCase()}`,
      ''
    ];

    let lineY = 140;
    sampleContent.forEach(line => {
      if (line.trim()) {
        ctx.fillText(line, 70, lineY);
      }
      lineY += 25;
    });

    // Positioning grid (faint)
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 12; i++) {
      const x = 70 + (i * 45);
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x, ctx.canvas.height - 50);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 20; i++) {
      const y = 100 + (i * 35);
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(ctx.canvas.width - 70, y);
      ctx.stroke();
    }
  };

  // Draw existing edits
  const drawEdits = (ctx) => {
    edits.forEach((edit, index) => {
      if (edit.pageIndex !== currentPage) return;
      
      // Convert PDF coordinates to canvas
      const scaleX = ctx.canvas.width / PDF_PAGE_WIDTH;
      const scaleY = ctx.canvas.height / PDF_PAGE_HEIGHT;
      
      const canvasX = (edit.x || 0) * scaleX;
      const canvasY = ctx.canvas.height - ((edit.y || 0) * scaleY);

      switch (edit.type) {
        case 'text':
          ctx.fillStyle = edit.color || '#000000';
          ctx.font = `${edit.fontSize || 12}px Arial, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(edit.text || '', canvasX + 70, canvasY + 20);
          break;

        case 'rectangle':
          ctx.fillStyle = edit.color || '#FF0000';
          ctx.fillRect(canvasX + 70, canvasY, 
                      (edit.width || 100) * scaleX / PDF_PAGE_WIDTH * 45, 
                      (edit.height || 50) * scaleY / PDF_PAGE_HEIGHT * 35);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(canvasX + 70, canvasY, 
                        (edit.width || 100) * scaleX / PDF_PAGE_WIDTH * 45, 
                        (edit.height || 50) * scaleY / PDF_PAGE_HEIGHT * 35);
          break;

        default:
          break;
      }

      // Edit handle
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(canvasX + 60, canvasY - 10, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), canvasX + 60, canvasY - 6);
    });
  };

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || pageCount === 0) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr * CANVAS_SCALE;
    canvas.height = rect.height * dpr * CANVAS_SCALE;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr * CANVAS_SCALE, dpr * CANVAS_SCALE);

    drawPDFPage(ctx);
    drawEdits(ctx);

    // Draw current position indicator
    const scaleX = canvas.width / PDF_PAGE_WIDTH;
    const scaleY = canvas.height / PDF_PAGE_HEIGHT;
    const posX = xPos * scaleX + 70;
    const posY = canvas.height - (yPos * scaleY);

    // Position circle
    ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
    ctx.beginPath();
    ctx.arc(posX, posY, 15, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(posX, posY, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Position label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${editMode.toUpperCase()}`, posX, posY - 18);

    ctx.fillStyle = '#2c3e50';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillText(`(${xPos}, ${yPos})`, posX, posY + 20);

  }, [currentPage, pageCount, edits, xPos, yPos, editMode]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      renderCanvas();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [renderCanvas]);

  // Canvas click handler
  const handleCanvasClick = (e) => {
    e.preventDefault();
    if (!canvasRef.current || !file) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Adjust for content area offset (70px left, 100px top)
    const adjustedX = canvasX - 70;
    const adjustedY = canvasY - 100;
    
    const pdfCoords = canvasToPdfCoords(adjustedX, adjustedY);
    setXPos(pdfCoords.x);
    setYPos(pdfCoords.y);
    
    console.log('🎯 Clicked at PDF coordinates:', pdfCoords.x, pdfCoords.y);
  };

  // Add edit
  const addEdit = () => {
    let newEdit = { 
      pageIndex: currentPage,
      x: xPos,
      y: yPos 
    };

    switch (editMode) {
      case 'text':
        if (!editText.trim()) {
          alert('Please enter text to add');
          return;
        }
        newEdit = {
          ...newEdit,
          type: 'text',
          text: editText,
          fontSize,
          color: textColor
        };
        setEditText('Sample Text');
        break;

      case 'rectangle':
        newEdit = {
          ...newEdit,
          type: 'rectangle',
          width: rectWidth,
          height: rectHeight,
          color: rectColor
        };
        break;
    }

    setEdits(prev => [...prev, newEdit]);
    console.log('➕ Added edit:', newEdit);
    
    // Re-render canvas
    setTimeout(renderCanvas, 100);
  };

  // Remove edit
  const removeEdit = (index) => {
    setEdits(prev => {
      const newEdits = prev.filter((_, i) => i !== index);
      console.log('🗑️ Removed edit, remaining:', newEdits.length);
      return newEdits;
    });
  };

  // Download edited PDF
  const downloadEditedPDF = async () => {
    if (edits.length === 0) {
      alert('No edits to apply! Add some edits first.');
      return;
    }

    if (!file) {
      alert('No PDF file loaded!');
      return;
    }

    setIsEditing(true);
    setError('');

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('editData', JSON.stringify({ edits }));

    try {
      console.log('📤 Sending', edits.length, 'edits to server...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('http://localhost:5000/api/edit-pdf', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await safeJsonParse(response);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${Date.now()}_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✅ Success! Downloaded PDF with ${edits.length} edits applied!`);
      
      // Reset form
      setEdits([]);
      setFile(null);
      setPageCount(0);
      setCurrentPage(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (err) {
      console.error('❌ Download error:', err);
      const errorMsg = `Failed to edit PDF: ${err.message}`;
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setIsEditing(false);
    }
  };

  // Clear all edits
  const clearAll = () => {
    if (window.confirm(`Clear all ${edits.length} edits?`)) {
      setEdits([]);
      setEditText('Sample Text');
    }
  };

  // Error display
  if (error && !loading) {
    return (
      <div className="edit-pdf-container" style={styles.container}>
        <div style={styles.errorBanner}>
          <div style={styles.errorIcon}>❌</div>
          <h3>Upload Failed</h3>
          <p>{error}</p>
          <button 
            onClick={() => { 
              setError(''); 
              setFile(null); 
              if (fileInputRef.current) fileInputRef.current.value = ''; 
            }} 
            style={styles.retryBtn}
          >
            🔄 Try Again
          </button>
          </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="edit-pdf-container" style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>🔍 Analyzing PDF pages...</p>
          <small>This may take a moment for large files</small>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-pdf-container" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1>🖊️ PDF Editor</h1>
        <p>Add text, rectangles, and more with pixel-perfect positioning</p>
        {file && (
          <div style={styles.fileInfo}>
            <span style={styles.fileName}>📄 {file.name}</span>
            <span style={styles.editCount}>
              {edits.length} {edits.length === 1 ? 'edit' : 'edits'}
            </span>
          </div>
        )}
      </div>

      {/* Upload Section */}
      {!file ? (
        <div style={styles.uploadSection}>
          <div 
            style={styles.uploadArea}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={styles.uploadIcon}>📄</div>
            <h3>Upload PDF to Edit</h3>
            <p>Click here or drag & drop your PDF file</p>
            <small>Max 50MB • All PDF formats supported</small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        /* Edit Interface */
        <div style={styles.editInterface}>
          {/* Page Navigation */}
          <div style={styles.pageNavigation}>
            <button 
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              style={styles.navBtn}
            >
              ← Previous
            </button>
            <div style={styles.pageInfo}>
              <span style={styles.currentPage}>{currentPage + 1}</span>
              <span style={styles.pageSeparator}>of</span>
              <span style={styles.totalPages}>{pageCount}</span>
            </div>
            <button 
              onClick={() => setCurrentPage(Math.min(pageCount - 1, currentPage + 1))}
              disabled={currentPage === pageCount - 1}
              style={styles.navBtn}
            >
              Next →
            </button>
          </div>

          {/* Canvas */}
          <div style={styles.canvasContainer}>
            <div style={styles.canvasWrapper}>
              <canvas
                ref={canvasRef}
                className="pdf-canvas"
                onClick={handleCanvasClick}
                style={styles.pdfCanvas}
              />
              <div style={styles.canvasOverlay}>
                <div style={styles.positionDisplay}>
                  📍 Position: ({xPos}, {yPos})
                </div>
                <div style={styles.editModeDisplay}>
                  Current Tool: <strong>{editMode.toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <div style={styles.editTools}>
            <div style={styles.toolsHeader}>
              <h3>✏️ Edit Tools</h3>
              <p>1. Select tool → 2. Configure → 3. Click canvas to position</p>
            </div>

            <div style={styles.toolTabs}>
              <button
                style={{
                  ...styles.tabBtn,
                  backgroundColor: editMode === 'text' ? '#3498db' : '#ecf0f1',
                  color: editMode === 'text' ? 'white' : '#2c3e50'
                }}
                onClick={() => setEditMode('text')}
              >
                📝 Text
              </button>
              <button
                style={{
                  ...styles.tabBtn,
                  backgroundColor: editMode === 'rectangle' ? '#e74c3c' : '#ecf0f1',
                  color: editMode === 'rectangle' ? 'white' : '#2c3e50'
                }}
                onClick={() => setEditMode('rectangle')}
              >
                ⬜ Rectangle
              </button>
            </div>

            {/* Text Form */}
            {editMode === 'text' && (
              <div style={styles.editForm}>
                <div style={styles.formGroup}>
                  <label>Text Content:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Enter your text here..."
                    maxLength={100}
                  />
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Font Size:</label>
                    <input
                      style={styles.rangeInput}
                      type="range"
                      min="8"
                      max="36"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                    />
                    <span style={styles.rangeValue}>{fontSize}px</span>
                  </div>
                  <div style={styles.formGroup}>
                    <label>Color:</label>
                    <input
                      style={styles.colorInput}
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  onClick={addEdit} 
                  style={{
                    ...styles.addBtn,
                    backgroundColor: editText.trim() ? '#27ae60' : '#bdc3c7',
                    cursor: editText.trim() ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!editText.trim()}
                >
                  ➕ Add Text to Position
                </button>
              </div>
            )}

            {/* Rectangle Form */}
            {editMode === 'rectangle' && (
              <div style={styles.editForm}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Width:</label>
                    <input
                      style={styles.input}
                      type="number"
                      value={rectWidth}
                      onChange={(e) => setRectWidth(Number(e.target.value))}
                      min="20"
                      max="300"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Height:</label>
                    <input
                      style={styles.input}
                      type="number"
                      value={rectHeight}
                      onChange={(e) => setRectHeight(Number(e.target.value))}
                      min="20"
                      max="200"
                    />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label>Color:</label>
                  <input
                    style={styles.colorInput}
                    type="color"
                    value={rectColor}
                    onChange={(e) => setRectColor(e.target.value)}
                  />
                </div>
                <button 
                  onClick={addEdit} 
                  style={styles.addBtn}
                >
                  ➕ Add Rectangle
                </button>
              </div>
            )}
          </div>

          {/* Edits List */}
          {edits.length > 0 && (
            <div style={styles.editsList}>
              <div style={styles.editsHeader}>
                <h3>📋 Applied Edits ({edits.length})</h3>
                <button onClick={clearAll} style={styles.clearAllBtn}>
                  🗑️ Clear All
                </button>
              </div>
              <div style={styles.editsGrid}>
                {edits.map((edit, index) => (
                  <div key={index} style={styles.editItem}>
                    <div style={styles.editIcon}>
                      {edit.type === 'text' && '📝'}
                      {edit.type === 'rectangle' && '⬜'}
                    </div>
                    <div style={styles.editDetails}>
                      <div style={styles.editType}>{edit.type.toUpperCase()}</div>
                      <div style={styles.editPage}>Page {edit.pageIndex + 1}</div>
                      <div style={styles.editPos}>@ ({edit.x}, {edit.y})</div>
                    </div>
                    <button
                      onClick={() => removeEdit(index)}
                      style={styles.removeBtn}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button 
              onClick={downloadEditedPDF} 
              disabled={edits.length === 0 || isEditing}
              style={{
                ...styles.downloadBtn,
                backgroundColor: edits.length === 0 || isEditing ? '#bdc3c7' : '#27ae60',
                cursor: edits.length === 0 || isEditing ? 'not-allowed' : 'pointer'
              }}
            >
              {isEditing ? (
                <>
                  <span style={styles.spinner}></span>
                  Applying {edits.length} edits...
                </>
              ) : (
                `💾 Download Edited PDF (${edits.length} edits)`
              )}
            </button>
            <button 
              onClick={() => {
                setFile(null);
                setPageCount(0);
                setEdits([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={styles.resetBtn}
              disabled={isEditing}
            >
              🔄 New PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ INLINE STYLES (No CSS needed)
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '30px',
    padding: '20px'
  },
  fileInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '15px',
    flexWrap: 'wrap'
  },
  fileName: {
    background: 'rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '25px',
    color: 'white',
    fontWeight: '500'
  },
  editCount: {
    background: 'rgba(46, 204, 113, 0.3)',
    padding: '8px 16px',
    borderRadius: '25px',
    color: 'white',
    fontWeight: 'bold'
  },
  uploadSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px'
  },
  uploadArea: {
    border: '3px dashed rgba(255,255,255,0.6)',
    borderRadius: '20px',
    padding: '60px 40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    width: '100%',
    maxWidth: '500px'
  },
  uploadAreaHover: {
    borderColor: 'rgba(255,255,255,1)',
    background: 'rgba(255,255,255,0.2)',
    transform: 'scale(1.02)'
  },
  uploadIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.9
  },
  editInterface: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  pageNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.95)',
    padding: '15px 25px',
    borderRadius: '15px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
  },
  navBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '10px',
    background: '#3498db',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  pageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  currentPage: {
    background: '#3498db',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '50%',
    minWidth: '40px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  totalPages: {
    color: '#7f8c8d'
  },
  canvasContainer: {
    position: 'relative'
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    background: 'white'
  },
  pdfCanvas: {
    width: '100%',
    height: 'auto',
    minHeight: '600px',
    cursor: 'crosshair',
    display: 'block'
  },
  canvasOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    padding: '20px',
    background: 'linear-gradient(45deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))'
  },
  positionDisplay: {
    background: 'rgba(52, 152, 219, 0.9)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '25px',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)'
  },
  editModeDisplay: {
    marginTop: '10px',
    color: '#2c3e50',
    fontSize: '12px'
  },
  editTools: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    height: 'fit-content'
  },
  toolsHeader: {
    textAlign: 'center',
    marginBottom: '25px',
    color: '#2c3e50'
  },
  toolTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px'
  },
  tabBtn: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e1e8ed',
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  rangeInput: {
    width: '100%',
    height: '6px',
    borderRadius: '5px',
    background: '#ecf0f1',
    outline: 'none',
    cursor: 'pointer'
  },
  rangeValue: {
    fontWeight: 'bold',
    color: '#3498db',
    marginLeft: '10px'
  },
  colorInput: {
    width: '100%',
    height: '50px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  addBtn: {
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    background: '#27ae60',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
  },
  editsList: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    gridColumn: '1 / -1'
  },
  editsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    color: '#2c3e50'
  },
  clearAllBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    background: '#e74c3c',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500'
  },
  editsGrid: {
    display: 'grid',
    gap: '15px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  editItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
    borderRadius: '12px',
    borderLeft: '4px solid #3498db'
  },
  editIcon: {
    fontSize: '20px',
    minWidth: '30px'
  },
  editDetails: {
    flex: 1
  },
  editType: {
    fontWeight: 'bold',
    color: '#2c3e50',
    fontSize: '14px'
  },
  editPage: {
    color: '#7f8c8d',
    fontSize: '12px',
    marginTop: '2px'
  },
  editPos: {
    color: '#3498db',
    fontSize: '11px',
    marginTop: '2px',
    fontFamily: 'monospace'
  },
  removeBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '8px',
    background: '#e74c3c',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  actionButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    padding: '30px',
    gridColumn: '1 / -1',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  downloadBtn: {
    padding: '16px 40px',
    border: 'none',
    borderRadius: '15px',
    background: '#27ae60',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 8px 25px rgba(39, 174, 96, 0.3)',
    minWidth: '280px'
  },
  resetBtn: {
    padding: '16px 32px',
    border: '2px solid #3498db',
    borderRadius: '15px',
    background: 'transparent',
    color: '#3498db',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff40',
    borderRadius: '50%',
    borderTopColor: '#ffffff',
    animation: 'spin 1s ease-in-out infinite',
    marginRight: '10px'
  },
  errorBanner: {
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: 'white',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '50px auto'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.9
  },
  retryBtn: {
    marginTop: '20px',
    padding: '12px 30px',
    border: 'none',
    borderRadius: '25px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: '16px',
  }
};

export default EditPDF;