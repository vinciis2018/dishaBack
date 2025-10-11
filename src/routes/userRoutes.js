import express from 'express';
import { signup, login, getMe } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);

export default router;
