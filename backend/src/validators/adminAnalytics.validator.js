import { query, validationResult } from 'express-validator';

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Invalid query parameters',
      errors: errors.array()
    });
  }
  next();
}

export const analyticsQueryValidator = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('from parameter must be a valid ISO date (YYYY-MM-DD)'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('to parameter must be a valid ISO date (YYYY-MM-DD)')
    .custom((to, { req }) => {
      if (req.query.from && new Date(to) < new Date(req.query.from)) {
        throw new Error('to date must be on or after from date');
      }
      return true;
    }),
  query('range')
    .optional()
    .isIn(['7d', '30d', '6m', '12m', 'custom', 'all'])
    .withMessage('range must be one of: 7d, 30d, 6m, 12m, custom, all')
    .bail()
    .custom((range, { req }) => {
      if (range === 'custom' && (!req.query.from || !req.query.to)) throw new Error('custom range requires both from and to dates');
      return true;
    }),
  query('teamLeader').optional().isMongoId().withMessage('teamLeader must be a valid ID'),
  query('teamLeaderId').optional().isMongoId().withMessage('teamLeaderId must be a valid ID'),
  query('domain').optional().isString().trim().isLength({ max: 100 }).withMessage('domain must be 100 characters or fewer'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('groupBy must be one of: day, week, month'),
  validate
];

export const analyticsExportValidator = [
  ...analyticsQueryValidator.slice(0, -1),
  query('type')
    .optional()
    .isIn([
      'overview',
      'requests-trend',
      'certificate-types',
      'turnaround',
      'team-leaders',
      'domains',
      'pipeline',
      'stuck',
      'stuck-requests',
      'upcoming-completions'
    ])
    .withMessage('Invalid export type parameter'),
  query('format').optional().isIn(['csv', 'xlsx']).withMessage('format must be csv or xlsx'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be an integer between 1 and 365'),
  validate
];

export const analyticsDaysValidator = [
  ...analyticsQueryValidator.slice(0, -1),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be an integer between 1 and 365'),
  validate
];
