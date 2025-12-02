import React, { useState } from 'react';
import axios from 'axios';
import { FileText, RotateCw, RotateCcw, Download, X, Loader } from 'lucide-react';

const RotatePdf = () => {
  const [file, setFile] = useState(null);
  const [rotation, setRotation] = useState(0);
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
      setRotation(0); // Reset rotation on new file
      setError('');
      setSuccess(false);
    }
  };

  const handleRotation = (direction) => {
    if (!file) return;
    // direction: 90 (right) or -90 (left)
    setRotation((prev) => prev + direction);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a PDF file first.');
      return;
    }
    
    if (rotation === 0) {
      setError('Please select a rotation angle.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('angle', rotation); // Send total calculated rotation

    try {
      const response = await axios.post('http://localhost:5000/api/rotate-pdf', formData, {
        responseType: 'blob', // Important for file download
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rotated_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Failed to rotate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setRotation(0);
    setError('');
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Rotate PDF</h1>
          <p className="text-gray-500 mt-2">Permanently rotate your PDF pages</p>
        </div>

        {/* Upload Area */}
        {!file ? (
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload or drag and drop</p>
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
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={removeFile} className="p-1 hover:bg-blue-200 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Rotation Controls */}
            <div className="flex flex-col items-center justify-center space-y-4 py-6 border-t border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">Set Rotation Angle</p>
              
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => handleRotation(-90)}
                  className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition active:scale-95"
                >
                  <div className="p-3 bg-white border shadow-sm rounded-full mb-2">
                    <RotateCcw className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium">Left 90°</span>
                </button>

                <div className="text-xl font-bold text-gray-800 w-16 text-center">
                  {rotation}°
                </div>

                <button 
                  onClick={() => handleRotation(90)}
                  className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition active:scale-95"
                >
                  <div className="p-3 bg-white border shadow-sm rounded-full mb-2">
                    <RotateCw className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium">Right 90°</span>
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all
                ${loading 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Rotating...
                </>
              ) : (
                <>
                  <Download className="-ml-1 mr-2 h-5 w-5" />
                  Download Rotated PDF
                </>
              )}
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center">
             Success! Check your downloads folder.
          </div>
        )}
      </div>
    </div>
  );
};

export default RotatePdf;