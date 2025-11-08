import React, { useState } from 'react';
import axios from 'axios';

function MergePDFs() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length !== 2) {
      setError('Please select exactly two PDF files');
      return;
    }
    setFiles(selectedFiles);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length !== 2) {
      setError('Please select exactly two PDF files');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('pdfFiles', file));

    try {
      const response = await axios.post('http://localhost:5000/api/merge-pdfs', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'merged_output.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to merge PDFs');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" multiple onChange={handleFileChange} />
        <button type="submit">Merge PDFs</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}

export default MergePDFs;