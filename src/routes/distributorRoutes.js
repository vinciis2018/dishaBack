import express from 'express';
import { createDistributor, createMultipleDistributors, getAllDistributors, getDistributorDetails, updateDistributor } from '../controllers/distributorController.js';

const router = express.Router();

// // Apply protect middleware to all routes
// router.use(protect);

// Site routes
router.post('/create', createDistributor);
router.post('/create-multiple', createMultipleDistributors);
router.post('/update/:distributorId', updateDistributor);
router.get('/all', getAllDistributors);

router.get('/:id', getDistributorDetails);





export default router;
