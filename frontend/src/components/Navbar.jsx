import React, { useState } from 'react';
import LogoImage from '../assets/logo.png';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MoreVertical } from 'lucide-react';

const Navbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <img 
                src={LogoImage} 
                alt="PDFPro Logo" 
                className="w-full h-full object-contain p-1"
              />
            </div>
            <span className="font-bold text-xl">PDFPro</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/merge" className="hover:text-blue-600 transition">Merge PDF</Link>
            <Link to="/compress" className="hover:text-blue-600 transition">Compress PDF</Link>
            <Link to="/split" className="hover:text-blue-600 transition">Split PDF</Link>
            <Link to="/edit" className="hover:text-blue-600 transition">Edit PDF</Link>

            {/* Convert Dropdown */}
            <div className="relative">
              <button
                onClick={() => setConvertOpen(!convertOpen)}
                className="flex items-center space-x-1 hover:text-blue-600 transition"
              >
                <span>Convert PDF</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {convertOpen && (
                <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <Link to="/word-to-pdf" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Word to PDF</Link>
                  <Link to="/pdf-to-word" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">PDF to Word</Link>
                  <Link to="/ppt-to-pdf" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">PPT to PDF</Link>
                  <Link to="/pdf-to-ppt" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">PDF to PPT</Link>
                  <Link to="/excel-to-pdf" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Excel to PDF</Link>
                  <Link to="/pdf-to-excel" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">PDF to Excel</Link>
                  <Link to="/jpg-to-pdf" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">JPG to PDF</Link>
                  <Link to="/pdf-to-jpg" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">PDF to JPG</Link>
                </div>
              )}
            </div>

            {/* 3-dot Menu */}
            <Link to="/all-tools" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <MoreVertical className="w-5 h-5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2"
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/merge" className="block py-2">Merge PDF</Link>
            <Link to="/compress" className="block py-2">Compress PDF</Link>
            <Link to="/split" className="block py-2">Split PDF</Link>
            <Link to="/edit" className="block py-2">Edit PDF</Link>
            <div className="pl-4 space-y-1">
              <p className="font-semibold">Convert</p>
              <Link to="/word-to-pdf" className="block py-1 text-sm">Word → PDF</Link>
              <Link to="/pdf-to-word" className="block py-1 text-sm">PDF → Word</Link>
              {/* Add more */}
            </div>
            <Link to="/all-tools" className="block py-2 font-medium text-blue-600">All Tools →</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;