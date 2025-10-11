import express from 'express';
import { createProduct, createMultipleProducts, getAllProducts, getProductDetails, updateProduct } from '../controllers/productController.js';

const router = express.Router();

// // Apply protect middleware to all routes
// router.use(protect);

// Site routes
router.post('/create', createProduct);
router.post('/create-multiple', createMultipleProducts);
router.post('/update/:productId', updateProduct);
router.get('/all', getAllProducts);

router.get('/:id', getProductDetails);





export default router;
