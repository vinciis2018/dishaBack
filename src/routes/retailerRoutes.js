import express from 'express';
import { createRetailer, createMultipleRetailers, getAllRetailers, getRetailerDetails, getRetailerByOwnerId, updateRetailer } from '../controllers/retailerController.js';

const router = express.Router();

// // Apply protect middleware to all routes
// router.use(protect);

// Site routes
router.post('/create', createRetailer);
router.post('/create-multiple', createMultipleRetailers);
router.post('/update/:retailerId', updateRetailer);
router.get('/all', getAllRetailers);

router.get('/:id', getRetailerDetails);
router.get('/owner/:id', getRetailerByOwnerId);






export default router;
