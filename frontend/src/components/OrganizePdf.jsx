import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ==================== Sortable Thumbnail Item ====================
const SortableItem = ({ id, page, index, onRemove, onRotate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group flex flex-col items-center cursor-grab active:cursor-grabbing"
    >
      <div
        className={`relative p-2 rounded-lg border-2 transition-all bg-white shadow-sm
          ${isDragging
            ? 'border-red-500 shadow-xl scale-105 z-50'
            : 'border-transparent hover:border-red-300'
          }`}
      >
        <div className="relative overflow-hidden w-32 h-44 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center rounded">
          {page.src ? (
            <img
              src={page.src}
              alt={`Page ${index + 1}`}
              className="object-contain w-full h-full pointer-events-none select-none"
              style={{
                transform: `rotate(${page.rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
          ) : (
            <span className="text-gray-400 dark:text-gray-500 font-bold text-xl">
              {index + 1}
            </span>
          )}

          {/* Delete Button (Top Right) */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transform hover:scale-110 transition"
              title="Delete Page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Rotate Button (Center on Hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(id);
              }}
              className="pointer-events-auto bg-white text-gray-700 rounded-full p-3 shadow-xl hover:text-red-600 transform hover:rotate-90 transition-all duration-300"
              title="Rotate 90° clockwise"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Page Number Label */}
      <div className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-1 rounded-full border border-gray-200 dark:border-gray-600 shadow">
        {index + 1}
      </div>
    </div>
  );
};

// ==================== Main Component ====================
function OrganizePdf() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Sensors for drag & drop (mouse + touch support)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Set page title
  useEffect(() => {
    document.title = 'PDFPro | Organize PDF';
  }, []);

  // Handle file upload → generate thumbnails
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setError('');
    setPages([]);

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/get-pdf-thumbnails',
        formData,
        { timeout: 60000 }
      );

      const thumbnails = response.data.thumbnails.map((thumb, i) => ({
        ...thumb,
        id: `page-${i}`,
        originalIndex: i,
        rotation: 0,
      }));

      setPages(thumbnails);
    } catch (err) {
      console.error('Thumbnail fetch error:', err);
      setError('Failed to generate page previews. Make sure Poppler is installed on the server.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Drag end → reorder pages
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPages((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Remove page
  const handleRemove = (id) => {
    setPages((items) => items.filter((item) => item.id !== id));
  };

  // Rotate page 90° clockwise
  const handleRotate = (id) => {
    setPages((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, rotation: (item.rotation + 90) % 360 }
          : item
      )
    );
  };

  // Reset everything
  const handleReset = () => {
    setFile(null);
    setPages([]);
    setError('');
  };

  // Final organize → download reorganized PDF
  const handleOrganize = async () => {
    if (pages.length === 0) return;

    setProcessing(true);
    setError('');

    const pageOrder = pages.map((p) => ({
      originalIndex: p.originalIndex,
      rotate: p.rotation,
    }));

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('pageOrder', JSON.stringify(pageOrder));

    try {
      const response = await axios.post(
        'http://localhost:5000/api/organize-pdf',
        formData,
        { responseType: 'blob', timeout: 90000 }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `organized_${file.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Organize failed:', err);
      setError('Failed to organize PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Organize PDF <span className="text-red-600">Pages</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Drag to reorder, rotate, or delete pages — then download your perfectly organized PDF.
          </p>
        </div>
      </section>

      {/* Main Tool */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">

            {/* Upload State */}
            {!file ? (
              <div className="p-12 text-center">
                <label className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-72 border-2 border-dashed rounded-2xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-inner hover:shadow-lg group border-red-200 dark:border-red-700">
                  <div className="flex flex-col items-center justify-center pt-8 pb-10">
                    <div className="bg-red-100 dark:bg-red-900/40 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                      <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5.5 5.5 0 1119.5 8a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">Drop your PDF here</p>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">or click to select</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </label>

                {loading && (
                  <div className="mt-10 text-xl text-red-600 dark:text-red-400 font-medium animate-pulse">
                    Generating page previews...
                  </div>
                )}

                {error && (
                  <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}
              </div>
            ) : (

              /* Organize View */
              <div className="flex flex-col lg:flex-row min-h-[700px]">
                {/* Thumbnails Grid */}
                <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10 place-items-center">
                        {pages.map((page, i) => (
                          <SortableItem
                            key={page.id}
                            id={page.id}
                            index={i}
                            page={page}
                            onRemove={handleRemove}
                            onRotate={handleRotate}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {pages.length === 0 && (
                    <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl">
                      No pages remaining. Upload a new file to start over.
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-96 bg-gray-50 dark:bg-gray-700 p-8 space-y-8 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Summary</h3>
                    <button
                      onClick={handleReset}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove File
                    </button>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">PDF</div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Pages:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">{pages.length}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleOrganize}
                    disabled={processing || pages.length === 0}
                    className={`w-full py-5 rounded-xl text-white font-bold text-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3
                      ${processing || pages.length === 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                      }`}
                  >
                    {processing ? (
                      <>
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Download Organized PDF'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default OrganizePdf;