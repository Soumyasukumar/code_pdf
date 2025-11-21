import React, { useState } from 'react';

const JPGtoPDF = () => {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [status, setStatus] = useState(''); // 'uploading', 'success', 'error', ''
  const [errorMessage, setErrorMessage] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
    setStatus('');
    setErrorMessage('');
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMessage('Please select at least one image.');
      return;
    }

    setStatus('uploading');

    const formData = new FormData();
    // Loop through selected files and append them
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    try {
      // Adjust the URL if your backend port differs (e.g. localhost:5000)
      const response = await fetch('http://localhost:5000/api/jpg-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      // Handle the PDF Blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images-converted.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="container">
      <h2 className="title">JPG to PDF Converter</h2>
      <p className="subtitle">Convert your images into a single PDF document.</p>

     <div className="upload-card"> {/* This div needs to be there, as per your image. I will adjust the generic styles to make it look good with the .section styles */}
  <form onSubmit={handleSubmit}>
    <div className="file-input-wrapper"> {/* This is the wrapper for the custom input */}
      <input
        type="file"
        accept="image/jpeg, image/jpg, image/png"
        multiple
        onChange={handleFileChange}
        className="file-input" // Keep this class for actual input
        id="jpgFileSelect" // Add an ID for the label
      />
      <label htmlFor="jpgFileSelect" className="file-input-label"> {/* This is the new label */}
        Drag & Drop Images Here or Click to Browse
      </label>
    </div>

    {selectedFiles && (
      <div className="file-info">
        <p>{selectedFiles.length} image(s) selected</p>
        {/* Optional: Display selected file names */}
        {/* Array.from(selectedFiles).map((file, index) => (
          <span key={index} style={{display: 'block', fontSize: '0.9em'}}>{file.name}</span>
        )) */}
      </div>
    )}

    <button
      type="submit"
      disabled={status === 'uploading' || !selectedFiles || selectedFiles.length === 0}
      className="convert-btn" // This class will now be styled by the App.css button styles
    >
      {status === 'uploading' ? 'Converting...' : 'Convert to PDF'}
    </button>
  </form>

  {status === 'error' && (
    <div className="error-message">
      Error: {errorMessage}
    </div>
  )}

  {status === 'success' && (
    <div className="success-message">
      ✅ PDF Downloaded Successfully!
    </div>
  )}
</div>

      {/* Simple inline CSS for basic styling if you don't have a CSS file yet */}
      <style>{`
        .container { max-width: 600px; margin: 50px auto; text-align: center; font-family: sans-serif; }
        .upload-card { border: 2px dashed #ccc; padding: 40px; border-radius: 10px; background: #f9f9f9; }
        .title { color: #333; }
        .convert-btn { 
          margin-top: 20px; 
          padding: 12px 24px; 
          background-color: #e53935; 
          color: white; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px;
        }
        .convert-btn:disabled { background-color: #fab1a0; cursor: not-allowed; }
        .file-info { margin-top: 15px; font-weight: bold; }
        .error-message { color: red; margin-top: 15px; }
        .success-message { color: green; margin-top: 15px; }
      `}</style>
    </div>
  );
};

export default JPGtoPDF;