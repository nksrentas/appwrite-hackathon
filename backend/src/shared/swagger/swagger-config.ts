import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EcoTrace Carbon Footprint API',
    version: '2.0.0',
    description: `
      EcoTrace backend API provides comprehensive carbon footprint tracking and calculation services.
      
      ## Features
      - Real-time carbon footprint calculations for multiple activity types
      - Scientific methodology based on EPA eGRID, IPCC AR6, and GHG Protocol standards
      - Comprehensive dashboard analytics with user statistics and trends
      - Conservative estimation methodology with uncertainty quantification
      - Audit trails for calculation transparency
      - Multi-modal processing (cloud compute, data transfer, electricity, git activities)
      
      ## Authentication
      All endpoints require proper authentication. Contact the API administrator for access credentials.
      
      ## Rate Limiting
      API requests are rate-limited to ensure fair usage and system stability.
      
      ## Error Handling
      All errors follow a consistent format with descriptive messages and appropriate HTTP status codes.
    `,
    contact: {
      name: 'EcoTrace API Support',
      email: 'api-support@ecotrace.com',
      url: 'https://docs.ecotrace.com'
    },
    license: {
      name: 'MIT License',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.ecotrace.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authenticated requests'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service authentication'
      }
    },
    schemas: {
      ActivityData: {
        type: 'object',
        required: ['activityType', 'timestamp'],
        properties: {
          activityType: {
            type: 'string',
            enum: ['cloud_compute', 'data_transfer', 'storage', 'electricity', 'transport', 'commit', 'deployment'],
            description: 'Type of activity for carbon calculation'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO 8601 timestamp of when the activity occurred'
          },
          location: {
            $ref: '#/components/schemas/Location'
          },
          metadata: {
            type: 'object',
            description: 'Activity-specific metadata',
            additionalProperties: true
          }
        }
      },
      CloudComputeActivity: {
        allOf: [
          { $ref: '#/components/schemas/ActivityData' },
          {
            type: 'object',
            properties: {
              activityType: {
                type: 'string',
                enum: ['cloud_compute']
              },
              metadata: {
                type: 'object',
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['aws', 'azure', 'gcp', 'other'],
                    description: 'Cloud service provider'
                  },
                  region: {
                    type: 'string',
                    description: 'Cloud region identifier'
                  },
                  instanceType: {
                    type: 'string',
                    description: 'Instance type or size'
                  },
                  duration: {
                    type: 'number',
                    description: 'Runtime duration in seconds'
                  },
                  memoryGbHours: {
                    type: 'number',
                    description: 'Memory usage in GB-hours'
                  }
                }
              }
            }
          }
        ]
      },
      DataTransferActivity: {
        allOf: [
          { $ref: '#/components/schemas/ActivityData' },
          {
            type: 'object',
            properties: {
              activityType: {
                type: 'string',
                enum: ['data_transfer']
              },
              metadata: {
                type: 'object',
                properties: {
                  bytesTransferred: {
                    type: 'number',
                    description: 'Number of bytes transferred'
                  },
                  networkType: {
                    type: 'string',
                    enum: ['internet', 'cdn', 'internal'],
                    description: 'Type of network used for transfer'
                  },
                  protocol: {
                    type: 'string',
                    description: 'Protocol used (http, https, ftp, etc.)'
                  }
                }
              }
            }
          }
        ]
      },
      ElectricityActivity: {
        allOf: [
          { $ref: '#/components/schemas/ActivityData' },
          {
            type: 'object',
            properties: {
              activityType: {
                type: 'string',
                enum: ['electricity']
              },
              metadata: {
                type: 'object',
                properties: {
                  kWhConsumed: {
                    type: 'number',
                    description: 'Electricity consumed in kWh'
                  },
                  source: {
                    type: 'string',
                    enum: ['grid', 'renewable', 'mixed', 'fossil'],
                    description: 'Electricity source type'
                  },
                  timeOfDay: {
                    type: 'string',
                    enum: ['peak', 'off_peak', 'standard'],
                    description: 'Time of day for consumption'
                  }
                }
              }
            }
          }
        ]
      },
      Location: {
        type: 'object',
        properties: {
          country: {
            type: 'string',
            description: 'Country code (ISO 3166-1 alpha-2)'
          },
          region: {
            type: 'string',
            description: 'State, province, or region identifier'
          },
          postalCode: {
            type: 'string',
            description: 'Postal or ZIP code'
          },
          coordinates: {
            type: 'object',
            properties: {
              latitude: { type: 'number' },
              longitude: { type: 'number' }
            }
          }
        }
      },
      CarbonCalculationResult: {
        type: 'object',
        properties: {
          carbonKg: {
            type: 'number',
            description: 'Carbon emissions in kilograms CO2 equivalent'
          },
          confidence: {
            type: 'string',
            enum: ['very_high', 'high', 'medium', 'low'],
            description: 'Confidence level of the calculation'
          },
          methodology: {
            $ref: '#/components/schemas/CalculationMethodology'
          },
          sources: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataSource' }
          },
          uncertaintyRange: {
            type: 'object',
            properties: {
              lower: { type: 'number' },
              upper: { type: 'number' }
            }
          },
          calculatedAt: {
            type: 'string',
            format: 'date-time'
          },
          validUntil: {
            type: 'string',
            format: 'date-time'
          },
          auditTrail: {
            type: 'array',
            items: { $ref: '#/components/schemas/AuditEntry' }
          }
        }
      },
      CalculationMethodology: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          assumptions: {
            type: 'array',
            items: { type: 'string' }
          },
          standards: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      DataSource: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['Government', 'Industry', 'Academic', 'Custom']
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time'
          },
          freshness: {
            type: 'string',
            enum: ['real_time', 'recent', 'outdated']
          },
          reliability: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          coverage: {
            type: 'object',
            properties: {
              geographic: {
                type: 'array',
                items: { type: 'string' }
              },
              temporal: { type: 'string' },
              activities: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      },
      AuditEntry: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          action: { type: 'string' },
          details: {
            type: 'object',
            additionalProperties: true
          },
          systemInfo: {
            type: 'object',
            properties: {
              version: { type: 'string' },
              environment: { type: 'string' },
              requestId: { type: 'string' }
            }
          }
        }
      },
      CarbonData: {
        type: 'object',
        properties: {
          totalEmissions: {
            type: 'number',
            description: 'Total carbon emissions in kg CO2'
          },
          dailyAverage: {
            type: 'number',
            description: 'Daily average emissions'
          },
          weeklyTrend: {
            type: 'string',
            enum: ['increasing', 'decreasing', 'stable'],
            description: 'Weekly trend direction'
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                emissions: { type: 'number' }
              }
            }
          }
        }
      },
      UserActivity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          carbonKg: { type: 'number' },
          repository: { type: 'string' },
          metadata: {
            type: 'object',
            additionalProperties: true
          }
        }
      },
      UserStats: {
        type: 'object',
        properties: {
          totalEmissions: { type: 'number' },
          totalActivities: { type: 'number' },
          averageDaily: { type: 'number' },
          rank: { type: 'number' },
          improvementPercent: { type: 'number' }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          overall: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy']
          },
          services: {
            type: 'object',
            properties: {
              calculationEngine: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy']
              },
              validation: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy']
              },
              audit: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy']
              }
            }
          },
          performance: {
            type: 'object',
            properties: {
              averageResponseTime: { type: 'number' },
              successRate: { type: 'number' },
              errorRate: { type: 'number' }
            }
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          message: {
            type: 'string',
            description: 'Detailed error description'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          code: {
            type: 'string',
            description: 'Error code for programmatic handling'
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            description: 'Response data'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          response_time_ms: {
            type: 'number',
            description: 'Response time in milliseconds'
          }
        }
      }
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Validation failed',
              message: 'Required field activityType is missing',
              timestamp: '2024-01-01T12:00:00Z',
              code: 'VALIDATION_ERROR'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Resource not found',
              message: 'The requested resource could not be found',
              timestamp: '2024-01-01T12:00:00Z',
              code: 'NOT_FOUND'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Internal server error',
              message: 'An unexpected error occurred',
              timestamp: '2024-01-01T12:00:00Z',
              code: 'INTERNAL_ERROR'
            }
          }
        }
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
              timestamp: '2024-01-01T12:00:00Z',
              code: 'RATE_LIMIT_EXCEEDED'
            }
          }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] },
    { apiKey: [] }
  ],
  tags: [
    {
      name: 'Carbon Calculation',
      description: 'Carbon footprint calculation endpoints',
      externalDocs: {
        description: 'Carbon calculation methodology',
        url: 'https://docs.ecotrace.com/methodology'
      }
    },
    {
      name: 'Dashboard',
      description: 'User dashboard and analytics endpoints'
    },
    {
      name: 'Health',
      description: 'System health and monitoring endpoints'
    },
    {
      name: 'WebSocket',
      description: 'Real-time WebSocket connection status'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/main.ts',
    './src/features/**/*.ts',
    './src/shared/swagger/api-docs.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  const swaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #16a085 }
    `,
    customSiteTitle: 'EcoTrace API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      requestSnippetsEnabled: true,
      syntaxHighlight: {
        theme: 'tomorrow-night'
      }
    }
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};