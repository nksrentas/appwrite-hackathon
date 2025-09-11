/**
 * @swagger
 * /api/calculation/carbon:
 *   post:
 *     tags:
 *       - Carbon Calculation
 *     summary: Calculate carbon footprint for an activity
 *     description: |
 *       Calculates the carbon footprint for a given activity using scientifically-backed methodologies.
 *       Supports multiple activity types including cloud computing, data transfer, electricity consumption, and git activities.
 *       
 *       The calculation engine uses:
 *       - EPA eGRID data for electricity grid factors
 *       - Conservative estimation methodology (+15% safety margin)
 *       - Multi-source validation for improved accuracy
 *       - Uncertainty quantification for transparency
 *       
 *       Response includes detailed methodology, data sources, confidence levels, and audit trails.
 *     operationId: calculateCarbon
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityData'
 *           examples:
 *             cloudCompute:
 *               summary: AWS EC2 instance
 *               value:
 *                 activityType: "cloud_compute"
 *                 timestamp: "2024-01-01T12:00:00Z"
 *                 location:
 *                   country: "US"
 *                   region: "us-east-1"
 *                   postalCode: "12345"
 *                 metadata:
 *                   provider: "aws"
 *                   region: "us-east-1"
 *                   instanceType: "medium"
 *                   duration: 3600
 *                   memoryGbHours: 4
 *             dataTransfer:
 *               summary: Internet data transfer
 *               value:
 *                 activityType: "data_transfer"
 *                 timestamp: "2024-01-01T12:00:00Z"
 *                 location:
 *                   country: "US"
 *                 metadata:
 *                   bytesTransferred: 1073741824
 *                   networkType: "internet"
 *                   protocol: "https"
 *             electricity:
 *               summary: Grid electricity consumption
 *               value:
 *                 activityType: "electricity"
 *                 timestamp: "2024-01-01T12:00:00Z"
 *                 location:
 *                   country: "US"
 *                   region: "CA"
 *                 metadata:
 *                   kWhConsumed: 10
 *                   source: "grid"
 *                   timeOfDay: "peak"
 *             gitCommit:
 *               summary: Git commit activity
 *               value:
 *                 activityType: "commit"
 *                 timestamp: "2024-01-01T12:00:00Z"
 *                 location:
 *                   country: "US"
 *                 metadata:
 *                   repository: "user/project"
 *                   branch: "main"
 *                   linesChanged: 50
 *     responses:
 *       200:
 *         description: Carbon calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CarbonCalculationResult'
 *             example:
 *               success: true
 *               data:
 *                 carbonKg: 0.001234
 *                 confidence: "high"
 *                 methodology:
 *                   name: "EcoTrace Scientific Carbon Calculation"
 *                   version: "1.0.0"
 *                   assumptions:
 *                     - "Conservative estimation bias applied (+15%)"
 *                     - "Temporal variations accounted for"
 *                   standards:
 *                     - "IPCC_AR6"
 *                     - "GHG_Protocol"
 *                 sources:
 *                   - name: "EPA eGRID"
 *                     type: "Government"
 *                     lastUpdated: "2024-01-01T00:00:00Z"
 *                     freshness: "recent"
 *                     reliability: 0.95
 *                 uncertaintyRange:
 *                   lower: 0.001048
 *                   upper: 0.001543
 *                 calculatedAt: "2024-01-01T12:00:00Z"
 *                 validUntil: "2024-01-02T12:00:00Z"
 *                 auditTrail:
 *                   - timestamp: "2024-01-01T12:00:00Z"
 *                     action: "calculate"
 *                     details:
 *                       version: "1.0.0"
 *                     systemInfo:
 *                       version: "1.0.0"
 *                       environment: "production"
 *                       requestId: "calc_123456789_abcd"
 *               timestamp: "2024-01-01T12:00:00Z"
 *               response_time_ms: 45
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/calculation/methodology:
 *   get:
 *     tags:
 *       - Carbon Calculation
 *     summary: Get calculation methodology information
 *     description: |
 *       Returns detailed information about the carbon calculation methodology,
 *       including standards used, assumptions made, and scientific backing.
 *     operationId: getMethodology
 *     responses:
 *       200:
 *         description: Methodology information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/CalculationMethodology'
 *                 - type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *             example:
 *               name: "EcoTrace Scientific Carbon Calculation"
 *               version: "1.0.0"
 *               emissionFactors: []
 *               conversionFactors: []
 *               assumptions:
 *                 - "Conservative estimation bias applied (+15%)"
 *                 - "Temporal variations accounted for"
 *                 - "Geographic sensitivity included"
 *                 - "Uncertainty quantification provided"
 *               standards:
 *                 - "IPCC_AR6"
 *                 - "GHG_Protocol"
 *                 - "SCI_Spec"
 *               timestamp: "2024-01-01T12:00:00Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/calculation/sources:
 *   get:
 *     tags:
 *       - Carbon Calculation
 *     summary: Get data sources information
 *     description: |
 *       Returns information about the data sources used in carbon calculations,
 *       including their coverage, update frequency, and confidence levels.
 *     operationId: getDataSources
 *     responses:
 *       200:
 *         description: Data sources information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       coverage:
 *                         type: string
 *                       updateFrequency:
 *                         type: string
 *                       confidence:
 *                         type: string
 *                       lastUpdated:
 *                         type: string
 *                         format: date-time
 *                 methodology:
 *                   type: string
 *                 totalSources:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               sources:
 *                 - name: "EPA eGRID"
 *                   description: "US Environmental Protection Agency eGRID database"
 *                   coverage: "United States"
 *                   updateFrequency: "Annual"
 *                   confidence: "high"
 *                   lastUpdated: "2024-01-01T00:00:00Z"
 *                 - name: "Electricity Maps"
 *                   description: "Real-time electricity carbon intensity data"
 *                   coverage: "Global"
 *                   updateFrequency: "Real-time"
 *                   confidence: "high"
 *                   lastUpdated: "2024-01-01T00:00:00Z"
 *               methodology: "Multi-source validation with conservative estimation"
 *               totalSources: 3
 *               timestamp: "2024-01-01T12:00:00Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/calculation/confidence:
 *   get:
 *     tags:
 *       - Carbon Calculation
 *     summary: Get confidence indicators
 *     description: |
 *       Returns information about how confidence levels are calculated,
 *       including the various factors and their weights.
 *     operationId: getConfidenceIndicators
 *     responses:
 *       200:
 *         description: Confidence indicators retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 indicators:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       weight:
 *                         type: number
 *                       thresholds:
 *                         type: object
 *                         properties:
 *                           high:
 *                             type: string
 *                           medium:
 *                             type: string
 *                           low:
 *                             type: string
 *                 overall_confidence_calculation:
 *                   type: string
 *                 conservative_bias:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/calculation/audit/{auditId}:
 *   get:
 *     tags:
 *       - Carbon Calculation
 *     summary: Get audit trail for a calculation
 *     description: |
 *       Retrieves the audit trail for a specific carbon calculation,
 *       providing transparency into the calculation process.
 *     operationId: getAuditTrail
 *     parameters:
 *       - name: auditId
 *         in: path
 *         required: true
 *         description: Unique identifier for the audit trail
 *         schema:
 *           type: string
 *           example: "calc_1704110400_abcd123"
 *     responses:
 *       200:
 *         description: Audit trail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     auditId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/calculation/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get carbon calculation service health
 *     description: |
 *       Returns the health status of the carbon calculation service,
 *       including all sub-services and performance metrics.
 *     operationId: getCalculationHealth
 *     responses:
 *       200:
 *         description: Health check successful - service is healthy or degraded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         health:
 *                           $ref: '#/components/schemas/HealthStatus'
 *                         service:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             version:
 *                               type: string
 *                             features:
 *                               type: array
 *                               items:
 *                                 type: string
 *             example:
 *               success: true
 *               data:
 *                 health:
 *                   overall: "healthy"
 *                   services:
 *                     calculationEngine: "healthy"
 *                     validation: "healthy"
 *                     audit: "healthy"
 *                     epaGrid: "healthy"
 *                     externalApis: "healthy"
 *                   performance:
 *                     averageResponseTime: 25
 *                     successRate: 0.99
 *                     errorRate: 0.01
 *                   lastUpdated: "2024-01-01T12:00:00Z"
 *                 service:
 *                   name: "EcoTrace Scientific Carbon Calculation Engine"
 *                   version: "1.0.0"
 *                   features:
 *                     - "Multi-modal carbon calculation"
 *                     - "EPA eGRID integration"
 *                     - "Conservative estimation methodology"
 *               timestamp: "2024-01-01T12:00:00Z"
 *               response_time_ms: 5
 *       503:
 *         description: Service unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/dashboard/carbon/{userId}:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get user carbon footprint data
 *     description: |
 *       Retrieves carbon footprint data for a specific user,
 *       including totals, averages, and historical data points.
 *     operationId: getUserCarbonData
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: Unique identifier for the user
 *         schema:
 *           type: string
 *           example: "user-123"
 *       - name: period
 *         in: query
 *         required: false
 *         description: Time period for data aggregation
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all_time]
 *           default: weekly
 *     responses:
 *       200:
 *         description: Carbon data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CarbonData'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/dashboard/activities/{userId}:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get user activities
 *     description: |
 *       Retrieves a paginated list of user activities with their carbon impact.
 *     operationId: getUserActivities
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: Unique identifier for the user
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of activities to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *       - name: offset
 *         in: query
 *         required: false
 *         description: Number of activities to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - name: type
 *         in: query
 *         required: false
 *         description: Filter by activity type
 *         schema:
 *           type: string
 *           enum: [commit, deployment, cloud_compute, data_transfer, electricity]
 *       - name: since
 *         in: query
 *         required: false
 *         description: Only return activities after this timestamp
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         activities:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/UserActivity'
 *                         total:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/dashboard/stats/{userId}:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get user statistics
 *     description: |
 *       Retrieves comprehensive statistics for a user including rankings,
 *       totals, and performance metrics.
 *     operationId: getUserStats
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         description: Unique identifier for the user
 *         schema:
 *           type: string
 *       - name: period
 *         in: query
 *         required: false
 *         description: Time period for statistics calculation
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all_time]
 *           default: weekly
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserStats'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /api/dashboard/leaderboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get leaderboard data
 *     description: |
 *       Retrieves the leaderboard showing users with the lowest carbon footprints.
 *     operationId: getLeaderboard
 *     parameters:
 *       - name: period
 *         in: query
 *         required: false
 *         description: Time period for leaderboard calculation
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all_time]
 *           default: weekly
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of entries to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: userId
 *         in: query
 *         required: false
 *         description: Include specific user rank even if not in top results
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leaderboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         leaderboard:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               emissions:
 *                                 type: number
 *                               rank:
 *                                 type: number
 *                         userRank:
 *                           type: object
 *                           properties:
 *                             userId:
 *                               type: string
 *                             rank:
 *                               type: number
 *                             emissions:
 *                               type: number
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get overall system health
 *     description: |
 *       Returns the overall health status of the EcoTrace backend system.
 *       This is a basic health check endpoint for monitoring and load balancers.
 *     operationId: getSystemHealth
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "EcoTrace Backend is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 version:
 *                   type: string
 *                   example: "2.0.0"
 *                 architecture:
 *                   type: string
 *                   example: "feature-based"
 *
 * /websocket/status:
 *   get:
 *     tags:
 *       - WebSocket
 *     summary: Get WebSocket connection status
 *     description: |
 *       Returns statistics about active WebSocket connections and real-time features.
 *     operationId: getWebSocketStatus
 *     responses:
 *       200:
 *         description: WebSocket status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 websocket:
 *                   type: object
 *                   properties:
 *                     totalConnections:
 *                       type: number
 *                     activeConnections:
 *                       type: number
 *                     totalMessages:
 *                       type: number
 *                     averageLatency:
 *                       type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

export {};