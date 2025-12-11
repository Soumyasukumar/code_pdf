import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-4">PDFPro</h3>
          <p className="text-sm">Your all-in-one PDF solution. Free. Fast. Secure.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Tools</h4>
          <ul className="space-y-1 text-sm">
            <li><a href="/merge" className="hover:text-white">Merge PDF</a></li>
            <li><a href="/compress" className="hover:text-white">Compress</a></li>
            <li><a href="/convert" className="hover:text-white">Convert</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Company</h4>
          <ul className="space-y-1 text-sm">
            <li><a href="/about" className="hover:text-white">About</a></li>
            <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
            <li><a href="/terms" className="hover:text-white">Terms</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Support</h4>
          <ul className="space-y-1 text-sm">
            <li><a href="/help" className="hover:text-white">Help Center</a></li>
            <li><a href="/contact" className="hover:text-white">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center mt-10 text-sm">
        © 2025 PDFPro. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;