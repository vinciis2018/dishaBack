import ErrorResponse from '../utils/errorResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Distributor from '../models/distributorModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a new distributor
// @route   POST /api/v1/distributors/create
// @access  Private
export const createDistributor = async (req, res, next) => {
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
      products,
      ordersRecieved,
      owner,
    } = req.body;

    // Validate required fields
    const requiredFields = ['name'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new ErrorResponse(`Please provide ${missingFields.join(', ')}`, 400));
    }

    if (!owner) {
      return next(new ErrorResponse('Please provide owner', 400));
    }
    
    const existingOwner = await Distributor.findOne({ ownerId: owner._id });
    if (existingOwner) {
      return next(new ErrorResponse('Owner already has a distributor', 400));
    }
    // Create distributor
    const distributor = await Distributor.create({
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
      ordersRecieved,
      ownerId: owner._id,
      ownerName: owner.username,
      ownerEmail: owner.email,
    });

    res.status(201).json({
      success: true,
      data: distributor
    });

  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'Distributor with this name already exists';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};


// @desc    Create multiple distributors
// @route   POST /api/v1/distributors/create-multiple
// @access  Private
export const createMultipleDistributors = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { distributors } = req.body;

    // Validate input
    if (!Array.isArray(distributors) || distributors.length === 0) {
      return next(new ErrorResponse('Please provide an array of distributors', 400));
    }

    // Validate each distributor object
    const requiredFields = ['name'];
    const invalidDistributors = [];
    
    distributors.forEach((distributor, index) => {
      const missingFields = requiredFields.filter(field => !distributor[field]);
      if (missingFields.length > 0) {
        invalidDistributors.push({
          index,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    });

    if (invalidDistributors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        error: 'Some distributors have invalid data',
        invalidDistributors
      });
    }

    // Create distributors in bulk
    const createdDistributors = await Distributor.insertMany(distributors, { session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      count: createdDistributors.length,
      data: createdDistributors
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const message = 'One or more distributors already exist with the same name';
      return next(new ErrorResponse(message, 400));
    }
    next(err);
  }
};

// @desc    Get all distributors
// @route   GET /api/v1/distributors
// @access  Private
export const getAllDistributors = async (req, res, next) => {
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
    let dbQuery = Distributor.find(query);

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
    const total = await Distributor.countDocuments(query);

    dbQuery = dbQuery.skip(startIndex).limit(limit);

    // Executing query
    const distributors = await dbQuery;

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
      count: distributors.length,
      pagination,
      distributors
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get distributor details
// @route   GET /api/v1/distributors/:id
// @access  Private
export const getDistributorDetails = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);

    if (!distributor) {
      return next(new ErrorResponse(`Distributor not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: distributor
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Update distributor details
// @route   PUT /api/v1/distributors/update/:siteId
// @access  Private
export const updateDistributor = async (req, res, next) => {
  try {
    let distributor = await Distributor.findOne({ _id: req.params.distributorId });

    if (!distributor) {
      return next(
        new ErrorResponse(`Distributor not found with id of ${req.params.distributorId}`, 404)
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
      ordersRecieved,
      owner,
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
    if (ordersRecieved) updateFields.ordersRecieved = ordersRecieved;
    if (owner) {
      updateFields.ownerId = owner._id;
      updateFields.ownerName = owner.username;
      updateFields.ownerEmail = owner.email;
    };
    
    // Find and update campaign
    await Distributor.findOneAndUpdate(
      { _id: req.params.distributorId },
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