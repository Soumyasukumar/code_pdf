import React, { useState,useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function WordToPDF() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.docx')) {
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    } else {
      setError('Please upload a valid .docx file');
      setFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.docx')) {
      setFile(droppedFile);
      setError('');
      setSuccess(false);
    } else {
      setError('Please drop a valid .docx file');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
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

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.docx$/i, '.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      // Reset after success
      setFile(null);
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.message || 'Failed to convert. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

   // SET PAGE TITLE HERE
  useEffect(() => {
    document.title = "PDFPro | WORD TO PDF";
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Word to PDF <span className="text-blue-600">Converter</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert .docx files to PDF instantly. Preserves text, fonts, and layout.
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Upload Word File (.docx)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  } ${file ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-5xl mb-4">📝</div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : 'Drop your .docx file here or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Only .docx files • Up to 50MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
                  <span>Downloaded successfully!</span>
                  <span className="text-xs">Your PDF is ready.</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !file}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  isLoading || !file
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Converting to PDF...
                  </>
                ) : (
                  <>
                    Convert to PDF
                  </>
                )}
              </button>
            </form>

            {/* Tips */}
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Only <code className="bg-white dark:bg-gray-800 px-1 rounded">.docx</code> files are supported</li>
                <li>• Preserves fonts, headings, lists, and basic formatting</li>
                <li>• Images and tables may vary in rendering</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Convert Word to PDF with Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Secure & Private</div>
              <h3 className="font-bold text-lg mb-1">No Data Stored</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Files deleted after 1 hour. No storage.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">Instant Results</div>
              <h3 className="font-bold text-lg mb-1">Cloud-Powered</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Convert in seconds with high accuracy.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <div className="text-4xl mb-3">100% Free</div>
              <h3 className="font-bold text-lg mb-1">No Limits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">No sign-up. No ads. Unlimited use.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default WordToPDF;