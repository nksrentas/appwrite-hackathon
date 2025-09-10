import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  User,
  Bot,
  GitBranch,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { cn } from '@shared/utils/cn';
import type { AuditTrailProps, AuditTrailEntry } from '@features/carbon/types';
import { carbonCalculationEngine } from '@features/carbon/services/calculation-engine.service';
import { useWebSocket } from '@features/carbon/services/websocket.service';

export const AuditTrail = ({
  entries: initialEntries = [],
  maxEntries = 50,
  showFilters = true,
  className
}: AuditTrailProps) => {
  const [entries, setEntries] = useState<AuditTrailEntry[]>(initialEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showAutomated, setShowAutomated] = useState(true);
  const [loading, setLoading] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(0);
  
  const { connectionState, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  useEffect(() => {
    if (connectionState === 'connected') {
      const handleNewAuditEntry = (data: any) => {
        const newEntry: AuditTrailEntry = {
          id: data.id || `audit-${Date.now()}-${Math.random()}`,
          timestamp: new Date(data.timestamp || Date.now()),
          action: data.action || 'calculation',
          version: data.version || '2.1.3',
          user: data.user,
          changes: data.changes || [],
          automated: data.automated || true
        };
        
        setEntries(prev => [newEntry, ...prev.slice(0, maxEntries - 1)]);
        setLiveUpdates(prev => prev + 1);
      };

      subscribe('carbon_updated', handleNewAuditEntry);
      subscribe('data_source_update', (data) => handleNewAuditEntry({
        ...data,
        action: 'data-refresh',
        changes: [`Data source ${data.sourceName} updated`]
      }));
      subscribe('health_status_change', (data) => handleNewAuditEntry({
        ...data,
        action: 'validation',
        changes: [`Service ${data.service} status changed to ${data.status}`]
      }));

      return () => {
        unsubscribe('carbon_updated', handleNewAuditEntry);
        unsubscribe('data_source_update', handleNewAuditEntry);
        unsubscribe('health_status_change', handleNewAuditEntry);
      };
    }
  }, [connectionState, subscribe, unsubscribe, maxEntries]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const auditData = carbonCalculationEngine.getAuditTrail();
      if (auditData && auditData.length > 0) {
        setEntries(auditData);
      } else if (initialEntries.length === 0) {
        
        const mockEntries: AuditTrailEntry[] = [
          {
            id: 'audit-1',
            timestamp: new Date(Date.now() - 300000),
            action: 'calculation',
            version: '2.1.3',
            changes: ['Carbon footprint calculated for GitHub Actions workflow'],
            automated: true
          },
          {
            id: 'audit-2',
            timestamp: new Date(Date.now() - 600000),
            action: 'data-refresh',
            version: '2.1.3',
            changes: ['EPA eGRID emission factors updated', 'Regional grid mix data refreshed'],
            automated: true
          },
          {
            id: 'audit-3',
            timestamp: new Date(Date.now() - 1200000),
            action: 'methodology-update',
            version: '2.1.2',
            user: 'System Admin',
            changes: ['Updated conservative factor from 10% to 15%', 'Added new validation checks'],
            automated: false
          }
        ];
        setEntries(mockEntries);
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    }
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'calculation':
        return <Settings className="h-4 w-4 text-primary-600" />;
      case 'methodology-update':
        return <GitBranch className="h-4 w-4 text-warning-600" />;
      case 'data-refresh':
        return <Download className="h-4 w-4 text-success-600" />;
      case 'validation':
        return <CheckCircle className="h-4 w-4 text-info-600" />;
      default:
        return <FileText className="h-4 w-4 text-carbon-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'calculation':
        return 'text-primary-700 bg-primary-50 border-primary-200';
      case 'methodology-update':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'data-refresh':
        return 'text-success-700 bg-success-50 border-success-200';
      case 'validation':
        return 'text-info-700 bg-info-50 border-info-200';
      default:
        return 'text-carbon-700 bg-carbon-50 border-carbon-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredEntries = entries
    .filter(entry => {
      const matchesSearch = 
        entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.user && entry.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.changes.some(change => change.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAction = filterAction === 'all' || entry.action === filterAction;
      const matchesAutomation = showAutomated || !entry.automated;
      
      return matchesSearch && matchesAction && matchesAutomation;
    })
    .slice(0, maxEntries)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const actionCounts = entries.reduce((acc, entry) => {
    acc[entry.action] = (acc[entry.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const automatedCount = entries.filter(e => e.automated).length;
  const manualCount = entries.length - automatedCount;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <FileText className="h-5 w-5 text-primary-600" />
            {connectionState === 'connected' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-h5 font-semibold text-carbon-900">
                Calculation Audit Trail
              </h3>
              {connectionState === 'connected' && (
                <Badge variant="outline" className="text-xs text-success-600 border-success-200">
                  Live Updates
                </Badge>
              )}
            </div>
            <p className="text-body-sm text-carbon-600">
              {entries.length} total events • {manualCount} manual • {automatedCount} automated
              {liveUpdates > 0 && ` • ${liveUpdates} live updates`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
          )}
          <Button variant="outline" size="sm" onClick={fetchAuditTrail}>
            <Download className="h-4 w-4 mr-1" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(actionCounts).slice(0, 4).map(([action, count]) => (
          <Card key={action}>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                {getActionIcon(action)}
              </div>
              <p className="text-h6 font-bold text-carbon-900">{count}</p>
              <p className="text-caption text-carbon-500 capitalize">
                {action.replace('-', ' ')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-carbon-400" />
            <Input
              placeholder="Search audit entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.keys(actionCounts).map(action => (
                <SelectItem key={action} value={action} className="capitalize">
                  {action.replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showAutomated ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAutomated(!showAutomated)}
            className="whitespace-nowrap"
          >
            <Bot className="h-4 w-4 mr-1" />
            Show Automated
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {filteredEntries.map((entry, index) => {
            const isExpanded = expandedEntry === entry.id;
            const hasDetails = entry.changes && entry.changes.length > 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  'transition-all duration-200',
                  isExpanded && 'ring-2 ring-primary-200'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-body-base font-medium text-carbon-900 capitalize">
                              {entry.action.replace('-', ' ')}
                            </h4>
                            <Badge className={getActionColor(entry.action)}>
                              v{entry.version}
                            </Badge>
                            {entry.automated && (
                              <Badge variant="outline" className="text-xs">
                                <Bot className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-caption text-carbon-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimeAgo(entry.timestamp)}</span>
                            </div>
                            {entry.user && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{entry.user}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-body-sm text-carbon-500">
                            <span>{entry.timestamp.toLocaleString()}</span>
                            {liveUpdates > 0 && entry.id.startsWith('audit-') && entry.timestamp.getTime() > Date.now() - 300000 && (
                              <Badge variant="outline" className="text-xs text-primary-600 border-primary-200">
                                Live
                              </Badge>
                            )}
                          </div>

                          {hasDetails && !isExpanded && entry.changes.length > 0 && (
                            <p className="text-body-sm text-carbon-600 mt-2 truncate">
                              {entry.changes[0]}
                              {entry.changes.length > 1 && ` +${entry.changes.length - 1} more`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (entry.id.startsWith('calc-') || entry.id.startsWith('audit-calc')) {
                              
                              console.log('View calculation details for:', entry.id);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && hasDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-carbon-100">
                            <h5 className="text-body-sm font-medium text-carbon-900 mb-3">
                              Changes Made:
                            </h5>
                            <div className="space-y-2">
                              {entry.changes.map((change, changeIndex) => (
                                <div key={changeIndex} className="flex items-start space-x-2 p-2 bg-carbon-50 rounded">
                                  <AlertCircle className="h-4 w-4 text-carbon-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-body-sm text-carbon-700">{change}</p>
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

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-carbon-300 mx-auto mb-4" />
          <h4 className="text-h6 font-medium text-carbon-600 mb-2">
            No audit entries found
          </h4>
          <p className="text-body-sm text-carbon-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {entries.length > maxEntries && (
        <div className="text-center pt-4">
          <Button variant="outline">
            Load More Entries
          </Button>
        </div>
      )}

      <div className="text-center pt-4 border-t border-carbon-200">
        <p className="text-caption text-carbon-500">
          Showing {filteredEntries.length} of {entries.length} audit entries • 
          Retention period: 2 years
        </p>
      </div>
    </div>
  );
};