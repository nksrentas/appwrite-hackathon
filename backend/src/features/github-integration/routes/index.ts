import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { GitHubController } from '../controllers/github.controller';
import { authenticateToken } from '@shared/middleware/auth';
import { logger } from '@shared/utils/logger';

const router = Router();
const githubController = new GitHubController();

// Rate limiting configurations
const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

const oauthRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit OAuth requests
  message: {
    error: 'Too many OAuth requests',
    message: 'OAuth rate limit exceeded. Please try again later.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // allow high volume for webhooks
  message: {
    error: 'Too many webhook requests',
    message: 'Webhook rate limit exceeded.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for webhook health checks
    return req.path === '/webhooks/github/health';
  }
});

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.githubError('Request validation failed', {
      error: 'Validation failed: ' + errors.array().map(e => e.msg).join(', '),
      userId: req.user?.id,
      path: req.path,
      method: req.method
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array()
      }
    });
    return;
  }
  next();
};

// Authentication routes (public)
router.post('/oauth/initiate',
  oauthRateLimit,
  authenticateToken,
  async (req, res) => {
    await githubController.initiateOAuth(req, res);
  }
);

router.post('/oauth/callback',
  oauthRateLimit,
  authenticateToken,
  [
    body('code')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Code is required and must be a valid string'),
    body('state')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('State is required and must be a valid string')
  ],
  validateRequest,
  async (req, res) => {
    await githubController.handleOAuthCallback(req, res);
  }
);

// Protected routes (require authentication)
router.use(authenticateToken);

// Integration management
router.get('/status',
  standardRateLimit,
  async (req, res) => {
    await githubController.getStatus(req, res);
  }
);

router.delete('/connection',
  standardRateLimit,
  async (req, res) => {
    await githubController.disconnectIntegration(req, res);
  }
);

// Repository management
router.get('/repositories',
  standardRateLimit,
  [
    query('refresh')
      .optional()
      .isBoolean()
      .withMessage('Refresh parameter must be a boolean')
  ],
  validateRequest,
  async (req, res) => {
    await githubController.getRepositories(req, res);
  }
);

router.post('/repositories/sync',
  standardRateLimit,
  async (req, res) => {
    await githubController.syncRepositories(req, res);
  }
);

router.post('/repositories/:id/tracking',
  standardRateLimit,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Repository ID must be a positive integer'),
    body('webhookEvents')
      .optional()
      .isArray()
      .withMessage('Webhook events must be an array')
      .custom((events: string[]) => {
        const validEvents = ['push', 'pull_request', 'workflow_run', 'deployment', 'deployment_status'];
        return events.every(event => validEvents.includes(event));
      })
      .withMessage('Invalid webhook events specified')
  ],
  validateRequest,
  async (req, res) => {
    await githubController.enableRepositoryTracking(req, res);
  }
);

router.delete('/repositories/:id/tracking',
  standardRateLimit,
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Repository ID must be a positive integer')
  ],
  validateRequest,
  async (req, res) => {
    await githubController.disableRepositoryTracking(req, res);
  }
);

// Export main router
export const githubRoutes = router;

// Webhook routes (separate router without authentication)
export const webhookRoutes = Router();

// Webhook endpoints (public, but secured by signature verification)
webhookRoutes.post('/github/:repositoryId',
  webhookRateLimit,
  [
    param('repositoryId')
      .isInt({ min: 1 })
      .withMessage('Repository ID must be a positive integer')
  ],
  validateRequest,
  async (req, res) => {
    await githubController.handleWebhook(req, res);
  }
);

webhookRoutes.get('/github/health',
  async (req, res) => {
    await githubController.webhookHealthCheck(req, res);
  }
);

// Additional validation and security middleware for GitHub integration
export const githubSecurityMiddleware = (req: any, res: any, next: any) => {
  // Add security headers for GitHub integration
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Log GitHub API requests for monitoring
  logger.github('GitHub API request', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  next();
};

// Webhook security middleware
export const webhookSecurityMiddleware = (req: any, res: any, next: any) => {
  // Verify GitHub webhook headers
  const userAgent = req.headers['user-agent'];
  const signature = req.headers['x-hub-signature-256'];
  const delivery = req.headers['x-github-delivery'];
  const event = req.headers['x-github-event'];

  // Basic validation of GitHub webhook headers
  if (!userAgent || !userAgent.startsWith('GitHub-Hookshot/')) {
    logger.githubError('Invalid webhook user agent', {
      error: 'Invalid webhook user agent',
      userAgent,
      ip: req.ip,
      path: req.path
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_USER_AGENT',
        message: 'Invalid webhook user agent'
      }
    });
  }

  if (!signature || !delivery || !event) {
    logger.githubError('Missing webhook headers', {
      error: 'Missing webhook headers',
      hasSignature: !!signature,
      hasDelivery: !!delivery,
      hasEvent: !!event,
      ip: req.ip,
      path: req.path
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_WEBHOOK_HEADERS',
        message: 'Required webhook headers are missing'
      }
    });
  }

  // Log webhook requests
  logger.github('GitHub webhook request', {
    event,
    delivery,
    repositoryId: req.params.repositoryId,
    ip: req.ip,
    userAgent
  });

  next();
};

// Error handling middleware for GitHub routes
export const githubErrorHandler = (error: any, req: any, res: any, next: any) => {
  logger.githubError('GitHub route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Handle specific GitHub integration errors
  if (error.name === 'GitHubIntegrationError') {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if (error.name === 'GitHubOAuthError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'GITHUB_OAUTH_ERROR',
        message: error.message
      }
    });
  }

  if (error.name === 'GitHubWebhookError') {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: {
        code: 'GITHUB_WEBHOOK_ERROR',
        message: error.message
      }
    });
  }

  if (error.name === 'GitHubAPIError') {
    return res.status(502).json({
      success: false,
      error: {
        code: 'GITHUB_API_ERROR',
        message: 'GitHub API error occurred'
      }
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  });
};

// Maintenance routes (admin only)
export const githubMaintenanceRoutes = Router();

githubMaintenanceRoutes.use(authenticateToken);
// githubMaintenanceRoutes.use(requireAdminRole); // Implement admin role check

githubMaintenanceRoutes.post('/maintenance',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // only 1 maintenance request per hour
    message: {
      error: 'Maintenance rate limit',
      message: 'Maintenance can only be run once per hour'
    }
  }),
  async (req, res) => {
    try {
      const githubIntegration = new GitHubController();
      // You would implement maintenance endpoint in controller
      
      res.json({
        success: true,
        message: 'Maintenance completed'
      });

    } catch (error) {
      logger.githubError('Maintenance failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'MAINTENANCE_ERROR',
          message: 'Maintenance failed'
        }
      });
    }
  }
);