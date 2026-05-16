const { Router } = require('express');
const courseController = require('../controllers/course.controller');

const router = Router();

// GET /courses/departments - list available departments
router.get('/departments', courseController.listDepartments);

// GET /courses/major/:major - get all courses for a department
router.get('/major/:major', courseController.getCoursesByMajor);

module.exports = router;
