import React, { useState } from 'react';

const PDFtoJPG = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(''); // 'uploading', 'success', 'error', ''
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        setSelectedFile(file);
        setStatus('');
        setErrorMessage('');
    } else {
        setSelectedFile(null);
        setErrorMessage('Please select a valid PDF file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage('Please select a PDF file.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      // Use the correct endpoint
      const response = await fetch('http://localhost:5000/api/pdf-to-jpg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // If the error response is JSON, parse it
        const contentType = response.headers.get('content-type');
        let errorText = 'Conversion failed';
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
        } else {
            // Otherwise, use the status text
            errorText = response.statusText || errorText;
        }
        throw new Error(errorText);
      }

      // Handle the ZIP Blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // The backend names the file like 'originalName_jpg_images.zip'
      a.download = `${selectedFile.name.replace(/\.pdf$/i, '')}_jpg_images.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setSelectedFile(null); // Clear file input after success
    } catch (error) {
      console.error('PDF to JPG Submission Error:', error);
      setStatus('error');
      setErrorMessage(`Failed to convert: ${error.message}`);
    }
  };

  // Helper to get the display name for the file input label
  const fileLabel = selectedFile ? selectedFile.name : 'Drag & Drop PDF Here or Click to Browse';

  return (
    <div className="pdf-to-jpg-section">
      <form onSubmit={handleSubmit}>
        <div className="file-input-wrapper">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file-input"
            id="pdfToJpgFileSelect"
          />
          <label htmlFor="pdfToJpgFileSelect" className="file-input-label">
            {fileLabel}
          </label>
        </div>

        {selectedFile && (
          <div className="file-info">
            <p>1 file selected: {selectedFile.name}</p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={status === 'uploading' || !selectedFile}
        >
          {status === 'uploading' ? 'Converting...' : 'Convert to JPG'}
        </button>
      </form>

      {status === 'error' && (
        <div className="error-message">
          Error: {errorMessage}
        </div>
      )}

      {status === 'success' && (
        <div className="success-message">
          ✅ ZIP file with JPG images downloaded!
        </div>
      )}
    </div>
  );
};

export default PDFtoJPG;