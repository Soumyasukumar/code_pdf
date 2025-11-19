import React, { useState } from 'react';
import axios from 'axios';

function PDFtoWord() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid PDF file');
    }
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!file) {
    setError('Please select a PDF file');
    return;
  }

  const formData = new FormData();
  formData.append('pdfFile', file);

  try {
    const response = await axios.post(
      'http://localhost:5000/api/pdf-to-word',
      formData,
      { responseType: 'blob' }
    );

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${file.name.replace(/\.pdf$/i, '')}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setError('');
  } catch (err) {
    console.error('Conversion error:', err);
    setError(err.response?.data?.error || 'Failed to convert PDF to Word');
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
        <button type="submit">Convert to Word</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}

export default PDFtoWord;