import Product from '../models/productModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new product
// @route   POST /api/v1/products/create
// @access  Private
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      formula,
      images,
      manufacturer,
      unitQuantity,
      availability,
      minOrderQuantity,
      mrp,
      ptr,
      packSize,
      description,
    } = req.body;

    // Validate required fields
    const requiredFields = ['name', 'formula', 'manufacturer', 'unitQuantity', 'availability', 'minOrderQuantity'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new ErrorResponse(`Please provide ${missingFields.join(', ')}`, 400));
    }

    // Create product
    const product = await Product.create({
      name,
      formula,
      images,
      manufacturer,
      unitQuantity,
      availability,
      minOrderQuantity,
      mrp,
      ptr,
      packSize,
      description
    });

    res.status(201).json({
      success: true,
      data: product
    });

  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'Product with this name already exists';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};


// @desc    Create multiple products
// @route   POST /api/v1/products/create-multiple
// @access  Private
export const createMultipleProducts = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { products } = req.body;

    // Validate input
    if (!Array.isArray(products) || products.length === 0) {
      return next(new ErrorResponse('Please provide an array of products', 400));
    }

    // Validate each product object
    const requiredFields = ['name', 'formula', 'manufacturer', 'unitQuantity', 'availability', 'minOrderQuantity'];
    const invalidProducts = [];
    
    products.forEach((product, index) => {
      const missingFields = requiredFields.filter(field => !product[field]);
      if (missingFields.length > 0) {
        invalidProducts.push({
          index,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    });

    if (invalidProducts.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Some products have invalid data',
        invalidProducts
      });
    }

    // Create products in bulk
    const createdProducts = await Product.insertMany(products, { session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      count: createdProducts.length,
      data: createdProducts
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'One or more products already exist with the same name';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
export const getAllProducts = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    
    // Extract search term if it exists
    const searchTerm = reqQuery.search;
    delete reqQuery.search;

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Start building the query
    let query = {};
    
    // If search term exists, add $or condition to search in multiple fields
    if (searchTerm) {
      query = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { formula: { $regex: searchTerm, $options: 'i' } },
          // { 'siteLocation.address': { $regex: searchTerm, $options: 'i' } },
        ]
      };
    }
    
    // Merge with other query parameters
    query = { ...query, ...JSON.parse(queryStr) };
    
    // Create the final query
    let dbQuery = Product.find(query);

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      dbQuery = dbQuery.sort(sortBy);
    } else {
      dbQuery = dbQuery.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 100) || 1;
    const limit = parseInt(req.query.limit, 100) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments(query);

    dbQuery = dbQuery.skip(startIndex).limit(limit);

    // Executing query
    const products = await dbQuery;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      products
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get product details
// @route   GET /api/v1/products/:id
// @access  Private
export const getProductDetails = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update product details
// @route   PUT /api/v1/products/update/:siteId
// @access  Private
export const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findOne({ _id: req.params.productId });

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404)
      );
    }

    // Extract fields to update
    const {
      name,
      formula,
      images,
      manufacturer,
      unitQuantity,
      availability,
      minOrderQuantity,
      mrp,
      ptr,
      packSize,
      description
    } = req.body;
    // Build update object
    const updateFields = {};
    
    // Only update fields that are provided in the request
    if (name) updateFields.name = name;
    if (formula) updateFields.formula = formula;
    if (images) updateFields.images = images;
    if (manufacturer) updateFields.manufacturer = manufacturer;
    if (unitQuantity) updateFields.unitQuantity = unitQuantity;
    if (availability) updateFields.availability = availability;
    if (minOrderQuantity) updateFields.minOrderQuantity = minOrderQuantity;
    if (mrp) updateFields.mrp = mrp;
    if (ptr) updateFields.ptr = ptr;
    if (packSize) updateFields.packSize = packSize;
    if (description) updateFields.description = description;
    
    // Find and update campaign
    await Product.findOneAndUpdate(
      { _id: req.params.productId },
      { $set: updateFields },
    );

    res.status(200).json({
      success: true,
      data: updateFields
    });
  } catch (err) {
    next(err);
  }
};