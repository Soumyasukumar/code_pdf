// src/components/ExcelToPDF.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';

const ExcelToPDF = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

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

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      showMessage('❌ Please upload a valid .xlsx or .xls file', 'error');
      return;
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) {
      showMessage('❌ File size too large. Maximum 50MB allowed.', 'error');
      return;
    }
    
    setFile(selectedFile);
    showMessage(`✅ ${selectedFile.name} ready for professional conversion!`, 'success');
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleConvert = async () => {
    if (!file) {
      showMessage('❌ Please select a file first', 'error');
      return;
    }

    setLoading(true);
    setProgress(0);
    showMessage('🔄 Preparing professional PDF conversion...', 'info');

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 8;
        });
      }, 800);

      const response = await axios.post(
        'http://localhost:5000/api/excel-to-pdf',
        formData,
        {
          responseType: 'blob',
          timeout: 120000,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.xlsx?$/i, '_Professional.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        showMessage(`✅ Professional PDF downloaded successfully!`, 'success');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Conversion error:', error);
      let errorMessage = '❌ Conversion failed';
      if (error.response?.data?.error) {
        errorMessage = `❌ ${error.response.data.error}`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '⏰ Conversion timed out';
      }
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        padding: '2.5rem',
        borderRadius: '20px',
        color: 'white',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>📊</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>
              Excel to Professional PDF
            </h2>
            <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '1.1rem' }}>
              Convert spreadsheets to beautifully formatted PDF documents
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        style={{
          border: dragActive ? '3px dashed #1e40af' : '3px dashed #d1d5db',
          borderRadius: '20px',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: dragActive 
            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
            : loading 
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : '#f8fafc',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          transform: dragActive ? 'scale(1.02)' : 'scale(1)',
          boxShadow: dragActive ? '0 10px 25px rgba(30, 64, 175, 0.15)' : '0 4px 15px rgba(0, 0, 0, 0.08)'
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          disabled={loading}
          style={{ display: 'none' }}
        />

        {!file ? (
          <div style={{ padding: '1rem' }}>
            <div style={{ 
              fontSize: '6rem', 
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📈
            </div>
            <h3 style={{ 
              margin: '0 0 1rem', 
              color: '#1f2937', 
              fontSize: '1.4rem', 
              fontWeight: 600 
            }}>
              Drop your Excel file here or click to browse
            </h3>
            <p style={{ 
              color: '#6b7280', 
              margin: '1rem 0 1.5rem', 
              fontSize: '0.95rem' 
            }}>
              <strong>Supported:</strong> .xlsx, .xls files • <strong>Max:</strong> 50MB
            </p>
            <button
              onClick={handleBrowseClick}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(30, 64, 175, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(30, 64, 175, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(30, 64, 175, 0.3)';
              }}
            >
              <span style={{ marginRight: '0.5rem' }}>📁</span>
              Browse Files
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '1.5rem',
            background: 'white',
            borderRadius: '15px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '2px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '3rem',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📊
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: 600, 
                color: '#1f2937', 
                marginBottom: '0.5rem', 
                fontSize: '1.1rem' 
              }}>
                {file.name}
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                color: '#6b7280', 
                fontSize: '0.9rem' 
              }}>
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <span>{new Date(file.lastModified).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setMessage({ text: '', type: '' });
              }}
              disabled={loading}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Convert Section */}
      {file && (
        <div style={{
          margin: '2rem 0',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '15px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #34d399)',
                borderRadius: '10px',
                transition: 'width 0.3s ease',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                width: `${progress}%`
              }}></div>
            </div>
            <span style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '0.5rem',
              fontWeight: 600,
              color: '#374151'
            }}>
              {Math.round(progress)}%
            </span>
          </div>
          <button
            onClick={handleConvert}
            disabled={loading}
            style={{
              width: '100%',
              background: loading 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #059669',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Converting to Professional PDF...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Convert to Professional PDF</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Message */}
      {message.text && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          margin: '1.5rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 500,
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
          background: message.type === 'success' 
            ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          color: message.type === 'success' ? '#166534' : '#dc2626',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`
        }}>
          <span style={{ fontSize: '1.2rem' }}>
            {message.type === 'success' ? '✅' : '❌'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Features */}
      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          textAlign: 'center',
          color: '#1f2937',
          marginBottom: '2rem',
          fontSize: '1.5rem',
          fontWeight: 700
        }}>
          🎯 Professional Features
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '15px',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
          >
            <div style={{
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: '45px',
              height: '45px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#1e40af',
              fontWeight: 'bold'
            }}>
              📋
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>
                Smart Tables
              </h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Automatic column detection with professional borders
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '15px',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
          >
            <div style={{
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: '45px',
              height: '45px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#1e40af',
              fontWeight: 'bold'
            }}>
              📄
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>
                Multiple Sheets
              </h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Each worksheet becomes a separate page
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '15px',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
          >
            <div style={{
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: '45px',
              height: '45px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#1e40af',
              fontWeight: 'bold'
            }}>
              📏
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>
                A4 Layout
              </h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Perfect A4 formatting with proper margins
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '15px',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
          >
            <div style={{
              fontSize: '2rem',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              width: '45px',
              height: '45px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#1e40af',
              fontWeight: 'bold'
            }}>
              📊
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937', fontSize: '1.1rem', fontWeight: 600 }}>
                Page Numbers
              </h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Professional headers and footers with pagination
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ExcelToPDF;