import Order from '../models/orderModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new order
// @route   POST /api/v1/orders/create
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const {
      userId,
      username,
      deliveryAddress,
      products,
    } = req.body;

    // Validate required fields
    const requiredFields = ['userId', 'username'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new ErrorResponse(`Please provide ${missingFields.join(', ')}`, 400));
    }

    // Create order
    const order = await Order.create({
      userId,
      username,
      deliveryAddress,
      products,
      orderDate: new Date().toISOString(),
      orderStatus: "pending",
      expectedDeliveryDate: new Date().toISOString(),
      actualDeliveryDate: new Date().toISOString(),
      deliveryStatus: "pending",
      totalAmount: 0,
      paymentStatus: "pending",
      paymentId: "",
      paymentMethod: "",
      paymentDetails: {},
    });

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'Order with this name already exists';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};



// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
export const getAllOrders = async (req, res, next) => {
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
          { city: { $regex: searchTerm, $options: 'i' } },
          { address: { $regex: searchTerm, $options: 'i' } },
          { zipCode: { $regex: searchTerm, $options: 'i' } },
          { 'products.name': { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }
    
    // Merge with other query parameters
    query = { ...query, ...JSON.parse(queryStr) };
    
    // Create the final query
    let dbQuery = Order.find(query);

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
    const total = await Order.countDocuments(query);

    dbQuery = dbQuery.skip(startIndex).limit(limit);

    // Executing query
    const orders = await dbQuery;

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
      count: orders.length,
      pagination,
      orders
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get order details
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update order details
// @route   PUT /api/v1/orders/update/:orderId
// @access  Private
export const updateOrder = async (req, res, next) => {
  try {
    let order = await Order.findOne({ _id: req.params.orderId });

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.orderId}`, 404)
      );
    }

    // Extract fields to update
    const {
      name,
      address,
      latitude,
      longitude,
      city,
      state,
      country,
      zipCode,
      images,
      products,
      ordersPlaced,
    } = req.body;
    // Build update object
    const updateFields = {};
    
    // Only update fields that are provided in the request
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (latitude) updateFields.latitude = latitude;
    if (longitude) updateFields.longitude = longitude;
    if (city) updateFields.city = city;
    if (state) updateFields.state = state;
    if (country) updateFields.country = country;
    if (zipCode) updateFields.zipCode = zipCode;
    if (images) updateFields.images = images;
    if (products) updateFields.products = products;
    if (ordersPlaced) updateFields.ordersPlaced = ordersPlaced;
    
    // Find and update campaign
    await Order.findOneAndUpdate(
      { _id: req.params.orderId },
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