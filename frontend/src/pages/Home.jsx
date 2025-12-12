import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ToolCard from '../components/ToolCard';
import Footer from '../components/Footer';

export const tools = [
  { title: 'Merge PDF', desc: 'Combine multiple PDFs into one', icon: '📑', path: '/merge', category: 'Organize PDF' },
  { title: 'Split PDF', desc: 'Extract pages from PDF', icon: '✂️', path: '/split', category: 'Organize PDF' },
  { title: 'Compress PDF', desc: 'Reduce file size quickly', icon: '🗜️', path: '/compress', category: 'Optimize PDF' },
  { title: 'Word to PDF', desc: 'Convert DOCX to PDF', icon: '📄', path: '/word-to-pdf', category: 'Convert PDF' },
  { title: 'PDF to Word', desc: 'Convert PDF to editable DOCX', icon: '📝', path: '/pdf-to-word', category: 'Convert PDF' },
  { title: 'PDF to PowerPoint', desc: 'Convert to editable slides', icon: '📊', path: '/pdf-to-ppt', category: 'Convert PDF' },
  { title: 'PowerPoint to PDF', desc: 'Convert PPT to PDF', icon: '📈', path: '/ppt-to-pdf', category: 'Convert PDF' },
  { title: 'Excel to PDF', desc: 'Convert spreadsheets to PDF', icon: '📊', path: '/excel-to-pdf', category: 'Convert PDF' },
  { title: 'PDF to Excel', desc: 'Extract tables from PDF', icon: '📉', path: '/pdf-to-excel', category: 'Convert PDF' },
  { title: 'JPG to PDF', desc: 'Convert images to PDF', icon: '🖼️', path: '/jpg-to-pdf', category: 'Convert PDF' },
  { title: 'PDF to JPG', desc: 'Export pages as images', icon: '🖼️', path: '/pdf-to-jpg', category: 'Convert PDF' },
  { title: 'Edit PDF', desc: 'Add text, images, annotations', icon: '✏️', path: '/edit', category: 'Edit PDF' },
  { title: 'Add Watermark', desc: 'Protect with text/image watermark', icon: '🔒', path: '/watermark', category: 'PDF Security' },
  { title: 'Rotate PDF', desc: 'Fix orientation of pages', icon: '🔄', path: '/rotate', category: 'Edit PDF' },
  { title: 'Unlock PDF', desc: 'Remove password protection', icon: '🔓', path: '/unlock', category: 'PDF Security' },
  { title: 'Protect PDF', desc: 'Add password encryption', icon: '🔐', path: '/protect', category: 'PDF Security' },
  { title: 'Organise PDF', desc: 'Reorder, insert, or delete pages in a PDF', icon: '🧹', path: '/organize', category: 'Organize PDF' },
  { title: 'Page Number PDF', desc: 'Insert page numbers into a PDF document', icon: '🔢', path: '/page-number', category: 'Edit PDF' },
  { title: 'Compare PDF', desc: 'Identify differences between two PDF files', icon: '🔍', path: '/compare', category: 'Organize PDF' },
  { title: 'Crop PDF', desc: 'Adjust PDF margins and crop pages', icon: '📐', path: '/crop', category: 'Edit PDF' },
];

const categories = ['All', 'Organize PDF', 'Optimize PDF', 'Convert PDF', 'Edit PDF', 'PDF Security'];

const Home = () => {
  const [filter, setFilter] = useState('All');
  const filteredTools = filter === 'All' ? tools : tools.filter(t => t.category === filter);

  return (
    <>
      <Navbar />

      {/* 1. Hero Fold */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">
            "Your PDFs. <span className="text-blue-600">Perfected.</span>"
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Merge, compress, convert, edit — all in one secure place.
          </p>
          <button className="btn-primary text-lg px-8 py-3">
            Explore All PDF Tools
          </button>
        </div>
      </section>

      {/* 2. Filterable Tools */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Powerful PDF Tools</h2>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-full font-medium transition ${
                  filter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTools.map(tool => (
              <ToolCard key={tool.path} {...tool} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Blogs */}
      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Latest from Blog</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">
                <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg mb-4"></div>
                <h3 className="font-bold text-lg mb-2">How to Reduce PDF Size Without Losing Quality</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Learn expert tips to compress PDFs effectively...</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose Us */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Choose PDFPro?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-bold text-xl mb-2">Bank-Level Security</h3>
              <p className="text-gray-600 dark:text-gray-400">Your files are encrypted and deleted after 1 hour.</p>
            </div>
            <div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-bold text-xl mb-2">Blazing Fast</h3>
              <p className="text-gray-600 dark:text-gray-400">Process files in seconds with cloud power.</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🆓</div>
              <h3 className="font-bold text-xl mb-2">Free Forever</h3>
              <p className="text-gray-600 dark:text-gray-400">No sign-up. No watermarks. Unlimited use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. All Features Grid */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">All PDF Tools in One Place</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tools.map(tool => (
              <Link
                key={tool.path}
                to={tool.path}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center hover:shadow-md transition border border-gray-200 dark:border-gray-700"
              >
                <div className="text-3xl mb-2">{tool.icon}</div>
                <p className="text-sm font-medium">{tool.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Home;