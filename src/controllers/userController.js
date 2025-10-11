import User from '../models/userModel.js';
import ErrorResponse from '../utils/errorResponse.js';


const blockedDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];

function isBlockedEmail(email) {
  return blockedDomains.some((domain) =>
    new RegExp(`^[A-Za-z0-9._%+-]+@${domain.replace(".", "\\.")}$`).test(email)
  );
}


// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const signup = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, password, confirmPassword, role } = req.body;

    if(password !== confirmPassword){
      return next(new ErrorResponse('Passwords do not match', 400));
    }

    const oldUser = await User.find({ email: email});
    if(oldUser.length > 0){
      return next(new ErrorResponse('User already exists', 400));
    }
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      role: role ? role : "default"
    });

    // if (isBlockedEmail(email)) {
    //   return res
    //     .status(403)
    //     .json({ error: "Personal email addresses are not allowed. Please use your official email." });
    // }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      expires_at: options.expires.getTime(),
      user
    });
};
