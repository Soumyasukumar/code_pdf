  import React, { useState } from 'react';

  const WordToPDF = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile);
        setError('');
        setSuccess(false);
      } else {
        setError('Please upload a .docx file');
        setFile(null);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!file) return;

      setLoading(true);
      setError('');
      setSuccess(false);

      const formData = new FormData();
      formData.append('wordFile', file);

      try {
        const res = await fetch('http://localhost:5000/api/word-to-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Conversion failed');
        }

        // Trigger download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.docx$/i, '.pdf');
        a.click();
        window.URL.revokeObjectURL(url);

        setSuccess(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="pdf-tool">
        <h3>Word to PDF Converter</h3>
        <p>Convert .docx files to PDF (preserves basic text & formatting)</p>

        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept=".docx"
            onChange={handleFileChange}
            required
          />
          <button type="submit" disabled={!file || loading}>
            {loading ? 'Converting...' : 'Convert to PDF'}
          </button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>Converted & downloaded successfully!</p>}
        {!file && <p style={{ color: '#666' }}>Upload a .docx file to begin</p>}
      </div>
    );
  };

  export default WordToPDF;