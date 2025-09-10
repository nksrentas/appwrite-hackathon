import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Zap,
  GitCommit,
  GitPullRequest,
  Play,
  Package,
  Clock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Progress } from '@shared/components/ui/progress';

const timeFrames = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '1y', label: '1 Year' },
];

const carbonMetrics = {
  commits: { value: 0.45, trend: 'down', change: 12.5 },
  pullRequests: { value: 2.1, trend: 'up', change: 8.2 },
  ciRuns: { value: 15.8, trend: 'down', change: 22.1 },
  deployments: { value: 5.2, trend: 'stable', change: 2.1 },
};

const efficiencyMetrics = {
  codeQuality: 85,
  testCoverage: 78,
  buildTime: 320,
  bundleSize: 245,
};

export default function AnalyticsIndex() {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('30d');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-green-500';
      default:
        return 'text-carbon-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-carbon-900 mb-2">Carbon Footprint Analysis</h2>
          <p className="text-carbon-600">
            Detailed breakdown of your development activities impact
          </p>
        </div>

        <div className="flex space-x-2">
          {timeFrames.map((frame) => (
            <Button
              key={frame.id}
              variant={selectedTimeFrame === frame.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeFrame(frame.id)}
            >
              {frame.label}
            </Button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <GitCommit className="h-4 w-4 text-carbon-500" />
                  <span>Commits</span>
                </div>
                <Badge variant="outline" className={getTrendColor(carbonMetrics.commits.trend)}>
                  {getTrendIcon(carbonMetrics.commits.trend)} {carbonMetrics.commits.change}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-carbon-900 mb-1">
                {carbonMetrics.commits.value} kg CO₂
              </div>
              <p className="text-caption text-carbon-500">Average per commit: 0.08 kg</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <GitPullRequest className="h-4 w-4 text-carbon-500" />
                  <span>Pull Requests</span>
                </div>
                <Badge variant="outline" className={getTrendColor(carbonMetrics.pullRequests.trend)}>
                  {getTrendIcon(carbonMetrics.pullRequests.trend)} {carbonMetrics.pullRequests.change}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-carbon-900 mb-1">
                {carbonMetrics.pullRequests.value} kg CO₂
              </div>
              <p className="text-caption text-carbon-500">Average per PR: 0.32 kg</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <Play className="h-4 w-4 text-carbon-500" />
                  <span>CI Runs</span>
                </div>
                <Badge variant="outline" className={getTrendColor(carbonMetrics.ciRuns.trend)}>
                  {getTrendIcon(carbonMetrics.ciRuns.trend)} {carbonMetrics.ciRuns.change}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-carbon-900 mb-1">
                {carbonMetrics.ciRuns.value} kg CO₂
              </div>
              <p className="text-caption text-carbon-500">Average per run: 0.15 kg</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-carbon-500" />
                  <span>Deployments</span>
                </div>
                <Badge variant="outline" className={getTrendColor(carbonMetrics.deployments.trend)}>
                  {getTrendIcon(carbonMetrics.deployments.trend)} {carbonMetrics.deployments.change}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-carbon-900 mb-1">
                {carbonMetrics.deployments.value} kg CO₂
              </div>
              <p className="text-caption text-carbon-500">Average per deploy: 0.65 kg</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Carbon Trend Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-t from-primary-50 to-transparent rounded-lg flex items-end justify-center">
                <div className="text-carbon-600 text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Interactive chart would be rendered here</p>
                  <p className="text-caption mt-1">showing carbon emissions over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Efficiency Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Code Quality Score</span>
                  <span className="font-medium">{efficiencyMetrics.codeQuality}%</span>
                </div>
                <Progress value={efficiencyMetrics.codeQuality} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Test Coverage</span>
                  <span className="font-medium">{efficiencyMetrics.testCoverage}%</span>
                </div>
                <Progress value={efficiencyMetrics.testCoverage} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Build Time</span>
                  <span className="font-medium">{efficiencyMetrics.buildTime}s</span>
                </div>
                <Progress value={Math.max(0, 100 - (efficiencyMetrics.buildTime / 10))} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body-sm text-carbon-600">Bundle Size</span>
                  <span className="font-medium">{efficiencyMetrics.bundleSize}KB</span>
                </div>
                <Progress value={Math.max(0, 100 - (efficiencyMetrics.bundleSize / 5))} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Activity Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-carbon-50 rounded-lg">
                <div className="bg-primary-500 p-2 rounded-full">
                  <GitCommit className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-carbon-900">
                    Major refactoring in repository/main
                  </p>
                  <p className="text-caption text-carbon-500">2 hours ago • 0.12 kg CO₂ impact</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-3 bg-carbon-50 rounded-lg">
                <div className="bg-scientific-500 p-2 rounded-full">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-carbon-900">
                    CI pipeline completed successfully
                  </p>
                  <p className="text-caption text-carbon-500">4 hours ago • 0.08 kg CO₂ impact</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-3 bg-carbon-50 rounded-lg">
                <div className="bg-efficiency-500 p-2 rounded-full">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-carbon-900">
                    Production deployment successful
                  </p>
                  <p className="text-caption text-carbon-500">6 hours ago • 0.45 kg CO₂ impact</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}