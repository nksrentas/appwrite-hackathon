import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  FileText,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip';
import { cn } from '@shared/utils/cn';
import type { SourceValidationProps, ValidationStatus } from '@features/carbon/types';

export const SourceValidation = ({
  sources,
  validationStatus,
  showConflicts = true,
  className
}: SourceValidationProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'lastValidated'>('status');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const getStatusInfo = (status: ValidationStatus) => {
    switch (status.status) {
      case 'validated':
        return {
          icon: ShieldCheck,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          label: 'Validated',
          description: 'Source verified and data integrity confirmed'
        };
      case 'pending':
        return {
          icon: ShieldAlert,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          label: 'Pending',
          description: 'Validation in progress'
        };
      case 'failed':
        return {
          icon: ShieldX,
          color: 'text-danger-600',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          label: 'Failed',
          description: 'Validation failed, issues detected'
        };
      default:
        return {
          icon: Shield,
          color: 'text-carbon-600',
          bgColor: 'bg-carbon-50',
          borderColor: 'border-carbon-200',
          label: 'Unknown',
          description: 'Validation status unknown'
        };
    }
  };

  const getValidationAge = (lastValidated?: Date) => {
    if (!lastValidated) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastValidated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getPriorityScore = (validation: ValidationStatus) => {
    let score = 0;
    if (validation.status === 'failed') score += 100;
    if (validation.status === 'pending') score += 50;
    if (validation.issues && validation.issues.length > 0) score += validation.issues.length * 10;
    if (!validation.lastValidated) score += 25;
    return score;
  };

  const filteredAndSortedValidations = sources
    .map(source => {
      const validation = validationStatus.find(v => v.sourceId === source.name) || {
        sourceId: source.name,
        status: 'pending' as const,
        issues: ['No validation performed']
      };
      return { source, validation };
    })
    .filter(({ source, validation }) => {
      const matchesSearch = source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          source.authority.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || validation.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.source.name.localeCompare(b.source.name);
        case 'status':
          return getPriorityScore(b.validation) - getPriorityScore(a.validation);
        case 'lastValidated':
          const aTime = a.validation.lastValidated?.getTime() || 0;
          const bTime = b.validation.lastValidated?.getTime() || 0;
          return bTime - aTime;
        default:
          return 0;
      }
    });

  const statusCounts = validationStatus.reduce((acc, status) => {
    acc[status.status] = (acc[status.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overallHealth = validationStatus.length > 0 
    ? Math.round(((statusCounts.validated || 0) / validationStatus.length) * 100)
    : 0;

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-h5 font-semibold text-carbon-900">
                Source Validation
              </h3>
              <p className="text-body-sm text-carbon-600">
                {sources.length} sources • {statusCounts.validated || 0} validated
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-caption text-carbon-500">System Health</p>
            <div className="flex items-center space-x-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                overallHealth >= 80 ? 'bg-success-500' :
                overallHealth >= 60 ? 'bg-warning-500' : 'bg-danger-500'
              )} />
              <span className={cn(
                'text-body-sm font-semibold',
                overallHealth >= 80 ? 'text-success-600' :
                overallHealth >= 60 ? 'text-warning-600' : 'text-danger-600'
              )}>
                {overallHealth}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-success-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <ShieldCheck className="h-5 w-5 text-success-600" />
              </div>
              <p className="text-h5 font-bold text-success-700">{statusCounts.validated || 0}</p>
              <p className="text-caption text-carbon-500">Validated</p>
            </CardContent>
          </Card>
          <Card className="border-warning-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-warning-600" />
              </div>
              <p className="text-h5 font-bold text-warning-700">{statusCounts.pending || 0}</p>
              <p className="text-caption text-carbon-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-danger-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <ShieldX className="h-5 w-5 text-danger-600" />
              </div>
              <p className="text-h5 font-bold text-danger-700">{statusCounts.failed || 0}</p>
              <p className="text-caption text-carbon-500">Failed</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-carbon-400" />
            <Input
              placeholder="Search sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-full sm:w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Priority</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="lastValidated">By Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredAndSortedValidations.map(({ source, validation }, index) => {
              const statusInfo = getStatusInfo(validation);
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedSource === source.name;
              const hasIssues = validation.issues && validation.issues.length > 0;

              return (
                <motion.div
                  key={source.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    'transition-all duration-200',
                    validation.status === 'failed' ? 'border-danger-200 bg-danger-50/30' :
                    validation.status === 'pending' ? 'border-warning-200 bg-warning-50/30' :
                    'border-success-200 bg-success-50/30'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={cn('mt-1', statusInfo.color)}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-body-base font-medium text-carbon-900 truncate">
                                {source.name}
                              </h4>
                              <Badge className={cn(statusInfo.bgColor, statusInfo.color, statusInfo.borderColor, 'text-xs')}>
                                {statusInfo.label}
                              </Badge>
                              {hasIssues && (
                                <Badge variant="outline" className="text-xs text-danger-600 border-danger-200">
                                  {validation.issues!.length} issues
                                </Badge>
                              )}
                            </div>
                            <p className="text-body-sm text-carbon-600 mb-2">{source.authority}</p>
                            <div className="grid grid-cols-2 gap-4 text-caption">
                              <div>
                                <span className="text-carbon-500">Last Validated:</span>
                                <span className="ml-1 text-carbon-700">
                                  {getValidationAge(validation.lastValidated)}
                                </span>
                              </div>
                              <div>
                                <span className="text-carbon-500">Reliability:</span>
                                <span className={cn(
                                  'ml-1 font-medium',
                                  source.reliability === 'high' ? 'text-success-600' :
                                  source.reliability === 'medium' ? 'text-warning-600' :
                                  'text-danger-600'
                                )}>
                                  {source.reliability}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Source</TooltipContent>
                          </Tooltip>

                          {hasIssues && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedSource(isExpanded ? null : source.name)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={validation.status === 'pending'}
                              >
                                <RefreshCw className={cn(
                                  'h-4 w-4',
                                  validation.status === 'pending' && 'animate-spin'
                                )} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {validation.status === 'pending' ? 'Validating...' : 'Re-validate'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && hasIssues && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-current/10">
                              <h5 className="text-body-sm font-medium text-carbon-900 mb-2">
                                Validation Issues:
                              </h5>
                              <div className="space-y-2">
                                {validation.issues!.map((issue, issueIndex) => (
                                  <div key={issueIndex} className="flex items-start space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-warning-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-body-sm text-carbon-700">{issue}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredAndSortedValidations.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-carbon-300 mx-auto mb-4" />
            <h4 className="text-h6 font-medium text-carbon-600 mb-2">
              No validation results found
            </h4>
            <p className="text-body-sm text-carbon-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {showConflicts && (
          <div className="border-t border-carbon-200 pt-6">
            <h4 className="text-body-base font-medium text-carbon-900 mb-4 flex items-center space-x-2">
              <Zap className="h-5 w-5 text-warning-600" />
              <span>Data Source Conflicts</span>
            </h4>
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning-600" />
                <span className="text-body-sm font-medium text-warning-900">
                  Cross-validation conflicts detected
                </span>
              </div>
              <p className="text-body-sm text-warning-700 mb-3">
                Some data sources provide conflicting values for the same parameters. 
                Our system automatically resolves these conflicts using conservative estimates.
              </p>
              <Button variant="outline" size="sm" className="text-warning-700 border-warning-300 hover:bg-warning-100">
                <FileText className="h-4 w-4 mr-1" />
                View Conflict Resolution Report
              </Button>
            </div>
          </div>
        )}

        <div className="text-center pt-4 border-t border-carbon-200">
          <p className="text-caption text-carbon-500">
            Last system validation: {new Date().toLocaleString()} • 
            Next scheduled validation in 6 hours
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};