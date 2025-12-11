import React from 'react';
import Navbar from '../components/Navbar';
import ToolCard from '../components/ToolCard';
import Footer from '../components/Footer';
import { tools } from './Home'; // Reuse same data

const AllTools = () => {
  return (
    <>
      <Navbar />
      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">All PDF Tools</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12">Everything you need to manage PDFs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tools.map(tool => (
              <ToolCard key={tool.path} {...tool} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AllTools;