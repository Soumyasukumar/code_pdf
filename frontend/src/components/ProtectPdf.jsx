import React, { useState } from 'react';
import axios from 'axios';

const ProtectPdf = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Eye icon state
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
    if (!file) return setError('Please upload a PDF file.');
    if (!password) return setError('Please enter a password.');

    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('password', password);

    try {
      const response = await axios.post('http://localhost:5000/api/protect-pdf', formData, {
        responseType: 'blob', // Important
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `protected_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(true);
      setPassword('');
    } catch (err) {
      console.error(err);
      setError('Failed to protect PDF. Please try again.');
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
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Protect PDF</h1>
          <p className="text-gray-500 mt-2">Encrypt your PDF with a password</p>
        </div>

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-4xl mb-3">🔒</span>
              <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload PDF</p>
              <p className="text-xs text-gray-500">PDF files only (Max 50MB)</p>
            </div>
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📄</span>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter secure password"
                  className="block w-full pl-4 pr-14 py-3 rounded-md border border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 px-4 bg-red-600 hover:bg-red-700 text-white rounded-r-md transition-colors flex items-center justify-center"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

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
                  Protecting...
                </>
              ) : (
                <>
                  <span className="mr-2">🔒</span>
                  Protect & Download
                </>
              )}
            </button>
          </div>
        )}

        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center border border-red-200">{error}</div>}
        {success && <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center border border-green-200">✅ PDF protected and downloaded!</div>}
      </div>
    </div>
  );
};

export default ProtectPdf;