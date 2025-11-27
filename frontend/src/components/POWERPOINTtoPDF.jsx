// src/components/POWERPOINTtoPDF.jsx
import React, { useState } from 'react';
import axios from 'axios';

const POWERPOINTtoPDF = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pptx')) {
      showMessage('Please upload a valid .pptx file', 'error');
      return;
    }
    setFile(selectedFile);
    showMessage('File ready! Click Convert to PDF', 'info');
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setMessage({ text: 'Converting your PowerPoint to PDF...', type: 'info' });

    const formData = new FormData();
    formData.append('pptFile', file);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/ppt-to-pdf',
        formData,
        {
          responseType: 'blob',
          timeout: 300000, // 5 minutes
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      // Success: Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.pptx$/i, '.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showMessage(`${file.name} → Converted & Downloaded!`, 'success');
      setFile(null);
      document.getElementById('file-input').value = '';

        } catch (error) {
      console.error('Conversion error:', error);

      let errorMessage = 'Conversion failed';

      if (error.response) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.error || json.message || errorMessage;
          } catch {
            errorMessage = 'Unknown server error';
          }
        } else {
          errorMessage = error.response.data?.error || errorMessage;
        }
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Conversion timed out – file may be too large';
      } else if (!error.response) {
        errorMessage = 'Cannot reach server. Is backend running on port 5000?';
      }

      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="powerpoint-converter">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          id="file-input"
          type="file"
          accept=".pptx"
          onChange={handleChange}
          disabled={loading}
          style={{ display: 'none' }}
        />

        {!file ? (
          <>
            <div className="upload-icon">Upload</div>
            <p>Drag & drop your <strong>.pptx</strong> file here</p>
            <p>or</p>
            <button
              className="browse-btn"
              onClick={() => document.getElementById('file-input').click()}
              disabled={loading}
            >
              Browse Files
            </button>
          </>
        ) : (
          <div className="file-preview">
            <div className="file-icon">PPT</div>
            <div className="file-info">
              <strong>{file.name}</strong>
              <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
            <button
              className="remove-file"
              onClick={() => {
                setFile(null);
                document.getElementById('file-input').value = '';
                setMessage({ text: '', type: '' });
              }}
              disabled={loading}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {file && (
        <button
          className="convert-btn"
          onClick={handleConvert}
          disabled={loading}
        >
          {loading ? 'Converting...' : 'Convert to PDF'}
        </button>
      )}

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' && 'Success'}
          {message.type === 'error' && 'Error'}
          {message.type === 'info' && 'Info'}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default POWERPOINTtoPDF;