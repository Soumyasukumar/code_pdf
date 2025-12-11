import React, { useState } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Thumbnail Card ---
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
    touchAction: 'none', // Crucial for touch dragging
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners} // Drag listener attached to the whole card
      className="relative group flex flex-col items-center cursor-grab active:cursor-grabbing"
    >
      {/* Red Border on Hover/Drag */}
      <div 
        className={`relative p-2 rounded-lg border-2 transition-all bg-white shadow-sm
        ${isDragging ? 'border-red-500 shadow-xl scale-105 z-50' : 'border-transparent hover:border-gray-300'}
        `}
      >
        {/* The Image Thumbnail */}
        <div className="relative overflow-hidden w-32 h-44 bg-gray-100 border border-gray-200 flex items-center justify-center">
            {page.src ? (
                <img 
                    src={page.src} 
                    alt={`Page ${index + 1}`} 
                    className="object-contain w-full h-full pointer-events-none select-none"
                    style={{ transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.3s' }}
                />
            ) : (
                <span className="text-gray-400 font-bold text-xl">{index + 1}</span>
            )}

            {/* Hover Overlay Controls */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                <button 
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
                    onClick={(e) => { e.stopPropagation(); onRemove(id); }}
                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transform hover:scale-110 transition-transform"
                    title="Delete Page"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            {/* Rotate Button (Centered on hover) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                 <button 
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { e.stopPropagation(); onRotate(id); }}
                    className="pointer-events-auto bg-white text-gray-700 rounded-full p-2 shadow-lg hover:text-red-500 transform hover:rotate-90 transition-all"
                    title="Rotate 90°"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
            </div>
        </div>
      </div>
      
      {/* Page Number Label */}
      <div className="mt-2 text-sm font-medium text-gray-500 bg-white px-3 py-0.5 rounded-full border border-gray-100 shadow-sm">
        {index + 1}
      </div>
    </div>
  );
};

// --- Main Organize Component ---
const OrganizePdf = () => {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // 🛠️ FIXED SENSORS: Enables reliable clicking AND dragging
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 }, // Drag only starts after moving 5px
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('pdfFile', selectedFile);

      try {
        // Fetch visual thumbnails
        const response = await axios.post('http://localhost:5000/api/get-pdf-thumbnails', formData);
        setPages(response.data.thumbnails);
      } catch (err) {
        console.error(err);
        setError('Failed to load PDF preview. Is Poppler installed correctly?');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemove = (id) => setPages((items) => items.filter((item) => item.id !== id));

  const handleRotate = (id) => {
    setPages((items) => 
      items.map(item => 
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const handleReset = () => {
    setFile(null);
    setPages([]);
  };

  const handleOrganize = async () => {
    setProcessing(true);
    const pageOrder = pages.map(p => ({
        originalIndex: p.originalIndex,
        rotate: p.rotation
    }));

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('pageOrder', JSON.stringify(pageOrder));

    try {
        const response = await axios.post('http://localhost:5000/api/organize-pdf', formData, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `organized_${file.name}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        alert("Failed to organize PDF");
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold text-gray-800">Organize PDF</h1>
        {file && (
             <button onClick={handleReset} className="text-red-500 hover:text-red-700 font-medium text-sm">
                ✕ Remove File
             </button>
        )}
      </div>

      {!file ? (
        // UPLOAD VIEW
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <label className="flex flex-col items-center justify-center w-full max-w-2xl h-64 border-2 border-red-100 border-dashed rounded-2xl cursor-pointer bg-white hover:bg-red-50 transition-all shadow-sm hover:shadow-md group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-red-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    </div>
                    <p className="mb-2 text-xl text-gray-700 font-bold">Select PDF file</p>
                    <p className="text-sm text-gray-500">or drop PDF here</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
            {loading && <div className="mt-8 flex items-center text-red-600 font-medium animate-pulse"><span className="text-2xl mr-2">⚙️</span> Generating Page Previews...</div>}
            {error && <div className="mt-8 text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>}
        </div>
      ) : (
        // ORGANIZE VIEW (Split Screen)
        <div className="flex-1 flex overflow-hidden">
            {/* Main Grid Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
                <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 place-items-center">
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
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No pages left. Please upload a new file.
                    </div>
                )}
            </div>

            {/* Right Sidebar (Controls) */}
            <div className="w-80 bg-white shadow-xl border-l border-gray-200 p-6 flex flex-col z-20">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
                
                <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-100">
                     <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">📄</span>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size/1024/1024).toFixed(2)} MB</p>
                        </div>
                     </div>
                </div>

                <div className="space-y-4 mb-auto">
                    <div className="flex justify-between text-sm text-gray-600 border-b pb-2">
                        <span>Total Pages:</span>
                        <span className="font-bold">{pages.length}</span>
                    </div>
                </div>

                <button 
                    onClick={handleOrganize} 
                    disabled={processing || pages.length === 0}
                    className={`w-full py-4 text-lg font-bold text-white rounded-xl shadow-lg transition-all transform hover:scale-105
                    ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30'}
                    `}
                >
                    {processing ? 'Processing...' : 'Organize →'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrganizePdf;