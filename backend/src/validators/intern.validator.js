import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0]?.msg || 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
}

export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} format`),
  validate
];

export const updateInternValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid intern ID format'),
  body('status')
    .optional()
    .isIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status value. Must be upcoming, ongoing, completed, or cancelled'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date string'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date string')
    .custom((val, { req }) => {
      if (req.body.startDate && val) {
        if (new Date(req.body.startDate) > new Date(val)) {
          throw new Error('Start date cannot be after end date');
        }
      }
      return true;
    }),
  validate
];

export const assignTeamLeaderValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid intern ID format'),
  body('teamLeaderId')
    .notEmpty()
    .withMessage('teamLeaderId is required')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid teamLeaderId format'),
  validate
];

export const setPasswordValidator = [
  body('currentSecret')
    .trim()
    .notEmpty()
    .withMessage('Current secret or intern code is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  validate
];

export const updateProfileValidator = [
  body('mobileNo')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Mobile number must be a valid 10 to 15 digit phone number'),
  validate
];

export const submitCertificateRequestValidator = [
  body('certificateType')
    .trim()
    .notEmpty()
    .withMessage('Valid certificate type is required'),
  validate
];

export const reviewRequestTLValidator = [
  param('id')
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage('Invalid request ID format'),
  body('action')
    .trim()
    .isIn(['forward', 'reject'])
    .withMessage('action must be "forward" or "reject"'),
  body('rejectionReason')
    .if(body('action').equals('reject'))
    .trim()
    .notEmpty()
    .withMessage('rejectionReason is required when rejecting'),
  validate
];

export const templateValidator = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Template content is required'),
  validate
];

export const chatMessageValidator = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters long'),
  validate
];

