const { Router } = require('express');
const multer = require('multer');
const uploadController = require('../controllers/upload.controller');

const router = Router();

// Configure multer for in-memory PDF storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// POST /upload/transcript - Upload transcript and run full pipeline
router.post('/transcript', upload.single('file'), uploadController.uploadTranscript);

// POST /upload/transcript/parse-only - Parse transcript without pipeline
router.post('/transcript/parse-only', upload.single('file'), uploadController.parseOnly);

module.exports = router;
