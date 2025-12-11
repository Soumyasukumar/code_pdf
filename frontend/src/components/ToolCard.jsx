import React from 'react';
import { Link } from 'react-router-dom';

const ToolCard = ({ title, desc, icon, path }) => {
  return (
    <Link
      to={path}
      className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg"
    >
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </Link>
  );
};

export default ToolCard;