import Retailer from '../models/retailerModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new retailer
// @route   POST /api/v1/retailers/create
// @access  Private
export const createRetailer = async (req, res, next) => {
  try {
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
      ownerId, 
      ownerName,
      ownerEmail,
      createdBy,
      email,
      phone,
      pan,
      gst,
    } = req.body;

    // Validate required fields
    const requiredFields = ['name'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new ErrorResponse(`Please provide ${missingFields.join(', ')}`, 400));
    }

    // Create retailer
    const retailer = await Retailer.create({
      name,
      address,
      latitude,
      longitude,
      city,
      state,
      country,
      zipCode,
      images,
      ownerId,
      ownerName,
      ownerEmail,
      createdBy,
      phone,
      email,
      gst,
      pan
    });

    res.status(201).json({
      success: true,
      data: retailer
    });

  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'Retailer with this name already exists';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};


// @desc    Create multiple retailers
// @route   POST /api/v1/retailers/create-multiple
// @access  Private
export const createMultipleRetailers = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { retailers } = req.body;

    // Validate input
    if (!Array.isArray(retailers) || retailers.length === 0) {
      return next(new ErrorResponse('Please provide an array of retailers', 400));
    }

    // Validate each retailer object
    const requiredFields = ['name'];
    const invalidRetailers = [];
    
    retailers.forEach((retailer, index) => {
      const missingFields = requiredFields.filter(field => !retailer[field]);
      if (missingFields.length > 0) {
        invalidRetailers.push({
          index,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    });

    if (invalidRetailers.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Some retailers have invalid data',
        invalidRetailers
      });
    }

    // Create retailers in bulk
    const createdRetailers = await Retailer.insertMany(retailers, { session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      count: createdRetailers.length,
      data: createdRetailers
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'One or more retailers already exist with the same name';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};

// @desc    Get all retailers
// @route   GET /api/v1/retailers
// @access  Private
export const getAllRetailers = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };
    
    if (req.query.rte) {
      reqQuery.createdBy = reqQuery.rte
    }
    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search', 'rte'];
    
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
    query = {
      ...query,
      ...JSON.parse(queryStr),
    };

    // Create the final query
    let dbQuery = Retailer.find(query);

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
    const total = await Retailer.countDocuments(query);

    dbQuery = dbQuery.skip(startIndex).limit(limit);

    // Executing query
    const retailers = await dbQuery;

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
      count: retailers.length,
      pagination,
      retailers
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get retailer details
// @route   GET /api/v1/retailers/:id
// @access  Private
export const getRetailerDetails = async (req, res, next) => {
  try {
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return next(new ErrorResponse(`Retailer not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: retailer
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update retailer details
// @route   PUT /api/v1/retailers/update/:siteId
// @access  Private
export const updateRetailer = async (req, res, next) => {
  try {
    let retailer = await Retailer.findOne({ _id: req.params.retailerId });

    if (!retailer) {
      return next(
        new ErrorResponse(`Retailer not found with id of ${req.params.retailerId}`, 404)
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
      ownerId,
      ownerName,
      ownerEmail,
      products,
      ordersPlaced,
      phone,
      email,
      gst,
      pan
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
    if (ownerId) updateFields.ownerId = ownerId;
    if (ownerName) updateFields.ownerName = ownerName;
    if (ownerEmail) updateFields.ownerEmail = ownerEmail;
    if (phone) updateFields.phone = phone;
    if (email) updateFields.email = email;
    if (gst) updateFields.gst = gst;
    if (pan) updateFields.pan = pan;

    // Find and update campaign
    await Retailer.findOneAndUpdate(
      { _id: req.params.retailerId },
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