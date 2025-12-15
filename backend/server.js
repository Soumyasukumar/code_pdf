require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const compressRoutes = require('./routes/compressRoutes');
const mergeRoutes = require('./routes/mergeRoutes');
const splitRoutes = require('./routes/splitRoutes');
const convertRoutes = require('./routes/convertRoutes');
const editRoutes = require('./routes/editRoutes');
const organizeRoutes = require('./routes/organizeRoutes');
const securityRoutes = require('./routes/securityRoutes');
const compareRoutes = require('./routes/compareRoutes');
// const thumbnailRoutes = require('./routes/thumbnailRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database
connectDB();

// Routes
app.use('/api', compressRoutes);
app.use('/api', mergeRoutes);
app.use('/api', splitRoutes);
app.use('/api', convertRoutes);
app.use('/api', editRoutes);
app.use('/api', organizeRoutes);
app.use('/api', securityRoutes);
app.use('/api', compareRoutes);
// app.use('/api', thumbnailRoutes);

// 404 & Error Handler
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});