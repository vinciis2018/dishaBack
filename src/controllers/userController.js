import User from '../models/userModel.js';

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private
export const getAllUsers = async (req, res, next) => {
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
    let dbQuery = User.find(query);

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
    const total = await User.countDocuments(query);

    dbQuery = dbQuery.skip(startIndex).limit(limit);

    // Executing query
    const users = await dbQuery;

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
      count: users.length,
      pagination,
      users
    });
  } catch (err) {
    next(err);
  }
};
