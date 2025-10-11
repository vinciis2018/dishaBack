import express from 'express';
import { getAllUsers } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/all', getAllUsers);

// // Protected routes
// router.get('/me', protect, getMe);

export default router;
