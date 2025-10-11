import express from 'express';
import { createOrder, updateOrder, getAllOrders, getOrderDetails } from '../controllers/orderController.js';

const router = express.Router();

// // Apply protect middleware to all routes
// router.use(protect);

// Order routes
router.post('/create', createOrder);
router.post('/update/:orderId', updateOrder);
router.get('/all', getAllOrders);

router.get('/:id', getOrderDetails);





export default router;
