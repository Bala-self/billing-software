const ApiError = require("../utils/apiError");

const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose Bad ObjectId (CastError)
  if (err.name === "CastError") {
    const message = `Resource not found with ID of: ${err.value}`;
    error = new ApiError(404, message);
  }

  // Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for '${field}'. Please use another value.`;
    error = new ApiError(400, message);
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message).join(", ");
    error = new ApiError(400, message);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid authorization token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Authorization token has expired");
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
