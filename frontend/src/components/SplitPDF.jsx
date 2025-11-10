import React, { useState } from 'react';
import axios from 'axios';

function SplitPDF() {
  const [file, setFile] = useState(null);
  const [pageRange, setPageRange] = useState(''); // e.g., "1-3" or "2"
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleRangeChange = (e) => {
    setPageRange(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    if (!pageRange.trim()) {
      setError('Please enter page range (e.g., 1-3 or 2)');
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('pageRange', pageRange.trim());

    try {
      const response = await axios.post('http://localhost:5000/api/split-pdf', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `split_${pageRange.replace(/[^0-9-]/g, '')}_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
          console.error(err.response || err);  // ADD THIS LINE
      setError(err.response?.data?.error || 'Failed to split PDF');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'block', marginBottom: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Page range (e.g., 1-3, 2, 1-5)"
            value={pageRange}
            onChange={handleRangeChange}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit">Split PDF</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}

export default SplitPDF;