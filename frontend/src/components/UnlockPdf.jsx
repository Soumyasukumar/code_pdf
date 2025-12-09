import React, { useState } from 'react';
import axios from 'axios';

const UnlockPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please upload a PDF file.');
      return;
    }
    if (!password) {
      setError('Please enter the document password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('password', password);

    try {
      const response = await axios.post('http://localhost:5000/api/unlock-pdf', formData, {
        responseType: 'blob', // Important for file download
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unlocked_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(true);
      setPassword(''); // Clear sensitive data
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError('❌ Incorrect Password. Please try again.');
      } else {
        setError('Failed to unlock PDF. The file might be corrupted or the server is busy.');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPassword('');
    setError('');
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Unlock PDF</h1>
          <p className="text-gray-500 mt-2">Remove password security from your PDF</p>
        </div>

        {/* Upload Area */}
        {!file ? (
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="text-4xl mb-3">🔓</span>
                <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload encrypted PDF</p>
                <p className="text-xs text-gray-500">PDF files only (Max 50MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="application/pdf" 
                onChange={handleFileChange} 
              />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info Card */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔒</span>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-gray-400 hover:text-red-500 font-bold px-2">
                ✕
              </button>
            </div>

            {/* Password Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Password</label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Document Password"
                className="block w-full px-4 py-3 rounded-md border border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all
                ${loading 
                  ? 'bg-yellow-400 cursor-not-allowed' 
                  : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'}`}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Unlocking...
                </>
              ) : (
                <>
                  <span className="mr-2">🔓</span>
                  Unlock & Download
                </>
              )}
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center border border-green-200">
             ✅ File unlocked and downloaded!
          </div>
        )}
      </div>
    </div>
  );
};

export default UnlockPdf;