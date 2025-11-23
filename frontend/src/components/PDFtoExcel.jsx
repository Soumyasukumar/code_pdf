import React, { useState } from 'react';
import axios from 'axios';

const PDFtoExcel = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    setError('');
    setFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a PDF file first');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const response = await axios.post('/api/pdf-to-excel', formData, {
        responseType: 'blob',
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
        // crucial for error handling when expecting a blob but receiving JSON
        validateStatus: (status) => status >= 200 && status < 500, // Do not throw on 4xx/5xx
      });

      if (response.status !== 200) {
        // Handle non-200 responses (server error/400) which are JSON
        const errorJson = JSON.parse(await response.data.text());
        throw new Error(errorJson.error || 'Unknown conversion error.');
      }

      // SUCCESS PATH (Status 200 - Download file)
      const disposition = response.headers['content-disposition'];
      let filename = 'converted.xlsx';
      if (disposition) {
        const match = disposition.match(/filename="?(.*)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Conversion failed:', err);
      // Use the error message from the try block or a fallback
      setError(err.message || 'Conversion failed. Check server logs.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="pdf-to-excel">
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>{loading ? `Converting (${progress}%)` : 'Convert to Excel'}</button>
      </form>
      {loading && <div>Upload: {progress}%</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export default PDFtoExcel;