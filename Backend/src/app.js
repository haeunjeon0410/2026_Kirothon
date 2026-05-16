require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const academicRoutes = require('./routes/academic.routes');
const aiRoutes = require('./routes/ai.routes');
const timetableRoutes = require('./routes/timetable.routes');
const courseRoutes = require('./routes/course.routes');
const agentRoutes = require('./routes/agent.routes');
const profileRoutes = require('./routes/profile.routes');
const uploadRoutes = require('./routes/upload.routes');
const advisorRoutes = require('./routes/advisor.routes');
const errorHandler = require('./middleware/errorHandler');
const normalizeUnicode = require('./middleware/normalizeUnicode');
const datasetService = require('./services/dataset.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Ensure UTF-8 encoding for all JSON request/response bodies
app.use(express.json({ limit: '10mb', defaultCharset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, defaultCharset: 'utf-8' }));

// Set UTF-8 charset on all JSON responses
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Normalize Unicode (NFC) in request bodies for consistent Korean matching
app.use(normalizeUnicode);

// Routes
app.use('/academic', academicRoutes);
app.use('/ai', aiRoutes);
app.use('/timetable', timetableRoutes);
app.use('/courses', courseRoutes);
app.use('/agent', agentRoutes);
app.use('/profile', profileRoutes);
app.use('/upload', uploadRoutes);
app.use('/advisor', advisorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Warm up the dataset cache at startup
datasetService.loadDataset();

app.listen(PORT, () => {
  console.log(`[SookMap] Server running on port ${PORT}`);
  console.log(`[SookMap] Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
