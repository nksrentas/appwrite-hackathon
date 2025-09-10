import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  ExternalLink,
  Globe,
  BookOpen,
  Building2,
  Github,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Calendar,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { cn } from '@shared/utils/cn';
import type { DataSourcesPanelProps, DataSource, ConfidenceLevel } from '@features/carbon/types';

export const DataSourcesPanel = ({
  dataSources,
  showQuality = true,
  className
}: DataSourcesPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterReliability, setFilterReliability] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'authority' | 'lastUpdated' | 'reliability'>('lastUpdated');

  const getSourceIcon = (type: string, reliability: ConfidenceLevel) => {
    const baseClasses = "h-5 w-5";
    const colorClasses = reliability === 'high' ? 'text-success-600' : 
                        reliability === 'medium' ? 'text-warning-600' : 'text-danger-600';
    
    switch (type) {
      case 'government':
        return <Globe className={cn(baseClasses, colorClasses)} />;
      case 'academic':
        return <BookOpen className={cn(baseClasses, colorClasses)} />;
      case 'commercial':
        return <Building2 className={cn(baseClasses, colorClasses)} />;
      case 'open-source':
        return <Github className={cn(baseClasses, colorClasses)} />;
      default:
        return <Database className={cn(baseClasses, colorClasses)} />;
    }
  };

  const getReliabilityBadge = (reliability: ConfidenceLevel) => {
    const baseClasses = "flex items-center space-x-1";
    switch (reliability) {
      case 'high':
        return (
          <Badge className={cn(baseClasses, 'bg-success-50 text-success-700 border-success-200')}>
            <CheckCircle className="h-3 w-3" />
            <span>High Confidence</span>
          </Badge>
        );
      case 'medium':
        return (
          <Badge className={cn(baseClasses, 'bg-warning-50 text-warning-700 border-warning-200')}>
            <AlertTriangle className="h-3 w-3" />
            <span>Medium Confidence</span>
          </Badge>
        );
      case 'low':
        return (
          <Badge className={cn(baseClasses, 'bg-danger-50 text-danger-700 border-danger-200')}>
            <XCircle className="h-3 w-3" />
            <span>Low Confidence</span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDataFreshness = (lastUpdated: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return { status: 'fresh', text: 'Today', color: 'text-success-600' };
    if (diffDays < 7) return { status: 'recent', text: `${diffDays}d ago`, color: 'text-success-600' };
    if (diffDays < 30) return { status: 'acceptable', text: `${diffDays}d ago`, color: 'text-warning-600' };
    if (diffDays < 90) return { status: 'stale', text: `${Math.floor(diffDays / 30)}mo ago`, color: 'text-warning-600' };
    return { status: 'expired', text: `${Math.floor(diffDays / 30)}mo ago`, color: 'text-danger-600' };
  };

  const filteredAndSortedSources = dataSources
    .filter(source => {
      const matchesSearch = source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          source.authority.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || source.type === filterType;
      const matchesReliability = filterReliability === 'all' || source.reliability === filterReliability;
      return matchesSearch && matchesType && matchesReliability;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'authority':
          return a.authority.localeCompare(b.authority);
        case 'lastUpdated':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'reliability':
          const reliabilityOrder = { high: 3, medium: 2, low: 1 };
          return reliabilityOrder[b.reliability] - reliabilityOrder[a.reliability];
        default:
          return 0;
      }
    });

  const sourceTypeStats = dataSources.reduce((acc, source) => {
    acc[source.type] = (acc[source.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const reliabilityStats = dataSources.reduce((acc, source) => {
    acc[source.reliability] = (acc[source.reliability] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="h-5 w-5 text-primary-600" />
          <div>
            <h3 className="text-h5 font-semibold text-carbon-900">
              Authoritative Data Sources
            </h3>
            <p className="text-body-sm text-carbon-600">
              {dataSources.length} sources • {reliabilityStats.high || 0} high confidence
            </p>
          </div>
        </div>
        {showQuality && (
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-caption text-carbon-500">Overall Quality</p>
              <div className="flex items-center space-x-1">
                {(reliabilityStats.high || 0) >= dataSources.length * 0.7 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-success-600" />
                    <span className="text-body-sm font-medium text-success-600">Excellent</span>
                  </>
                ) : (reliabilityStats.high || 0) >= dataSources.length * 0.5 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-warning-600" />
                    <span className="text-body-sm font-medium text-warning-600">Good</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-danger-600" />
                    <span className="text-body-sm font-medium text-danger-600">Needs Improvement</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Globe className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-h5 font-bold text-carbon-900">{sourceTypeStats.government || 0}</p>
            <p className="text-caption text-carbon-500">Government</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-h5 font-bold text-carbon-900">{sourceTypeStats.academic || 0}</p>
            <p className="text-caption text-carbon-500">Academic</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-h5 font-bold text-carbon-900">{sourceTypeStats.commercial || 0}</p>
            <p className="text-caption text-carbon-500">Commercial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Github className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-h5 font-bold text-carbon-900">{sourceTypeStats['open-source'] || 0}</p>
            <p className="text-caption text-carbon-500">Open Source</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-carbon-400" />
          <Input
            placeholder="Search data sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="open-source">Open Source</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterReliability} onValueChange={setFilterReliability}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quality</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastUpdated">Last Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="authority">Authority</SelectItem>
            <SelectItem value="reliability">Reliability</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAndSortedSources.map((source, index) => {
          const freshness = getDataFreshness(source.lastUpdated);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSourceIcon(source.type, source.reliability)}
                      <div className="flex-1">
                        <CardTitle className="text-body-base leading-tight">
                          {source.name}
                        </CardTitle>
                        <p className="text-body-sm text-carbon-600 mt-1">
                          {source.authority}
                        </p>
                      </div>
                    </div>
                    {getReliabilityBadge(source.reliability)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-caption text-carbon-500 mb-1">Type</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {source.type.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-caption text-carbon-500 mb-1">Last Updated</p>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-carbon-400" />
                        <span className={cn('text-caption font-medium', freshness.color)}>
                          {freshness.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {source.peerReviewed && (
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-success-600" />
                        <span className="text-body-sm text-success-700">Peer Reviewed</span>
                      </div>
                    )}
                    
                    {source.establishedDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-carbon-400" />
                        <span className="text-body-sm text-carbon-600">
                          Established {source.establishedDate.getFullYear()}
                        </span>
                      </div>
                    )}
                  </div>

                  {showQuality && (
                    <div className="border-t border-carbon-100 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p className="text-caption text-carbon-500">Freshness</p>
                          <div className={cn('font-medium text-caption', freshness.color)}>
                            {freshness.status}
                          </div>
                        </div>
                        <div>
                          <p className="text-caption text-carbon-500">Reliability</p>
                          <div className={cn(
                            'font-medium text-caption',
                            source.reliability === 'high' ? 'text-success-600' :
                            source.reliability === 'medium' ? 'text-warning-600' :
                            'text-danger-600'
                          )}>
                            {source.reliability}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1"
                      >
                        <span>View Source</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredAndSortedSources.length === 0 && (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-carbon-300 mx-auto mb-4" />
          <h4 className="text-h6 font-medium text-carbon-600 mb-2">
            No data sources found
          </h4>
          <p className="text-body-sm text-carbon-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      <div className="border-t border-carbon-200 pt-4">
        <p className="text-caption text-carbon-500 text-center">
          Showing {filteredAndSortedSources.length} of {dataSources.length} data sources • 
          Last verified: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};