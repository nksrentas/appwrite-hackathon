import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, CheckCircle, Calendar, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import { useReducedMotion } from '@shared/utils/accessibility';
import { cn } from '@shared/utils/cn';

interface CarbonMethodology {
  name: string;
  version: string;
  standards: string[];
  description: string;
  emissionFactors: Array<{
    source: string;
    category: string;
    factor: number;
    unit: string;
    lastUpdated: string;
  }>;
  assumptions: string[];
}

interface MethodologyPanelProps {
  methodology?: CarbonMethodology | null;
  className?: string;
}

export const MethodologyPanel = ({
  methodology,
  className,
}: MethodologyPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    factors: false,
    assumptions: false,
    standards: true,
  });
  const prefersReducedMotion = useReducedMotion();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!methodology) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-carbon-500 space-y-2">
            <Book className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-body-md font-medium">Methodology information unavailable</p>
            <p className="text-caption">Please check your connection and try again</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStandardInfo = (standard: string) => {
    const standards: Record<string, { name: string; description: string; url?: string }> = {
      'IPCC_AR6': {
        name: 'IPCC AR6',
        description: 'Intergovernmental Panel on Climate Change Sixth Assessment Report',
        url: 'https://www.ipcc.ch/report/ar6/wg1/',
      },
      'GHG_Protocol': {
        name: 'GHG Protocol',
        description: 'Greenhouse Gas Protocol Corporate Standard',
        url: 'https://ghgprotocol.org/',
      },
      'SCI_Spec': {
        name: 'SCI Specification',
        description: 'Software Carbon Intensity Specification',
        url: 'https://github.com/Green-Software-Foundation/sci',
      },
      'EPA_eGRID': {
        name: 'EPA eGRID',
        description: 'Environmental Protection Agency Emissions & Generation Resource Integrated Database',
        url: 'https://www.epa.gov/egrid',
      },
    };

    return standards[standard] || { 
      name: standard, 
      description: `${standard} methodology standard` 
    };
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Book className="h-5 w-5 text-primary-500" />
          <span>Calculation Methodology</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <motion.div
          className="space-y-3"
          initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={!prefersReducedMotion ? { duration: 0.5 } : { duration: 0 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-body-lg font-semibold text-carbon-900">
              {methodology.name}
            </h3>
            <Badge variant="outline">v{methodology.version}</Badge>
          </div>
          <p className="text-body-sm text-carbon-600">
            {methodology.description}
          </p>
        </motion.div>

        {/* Standards */}
        <Collapsible 
          open={expandedSections.standards}
          onOpenChange={() => toggleSection('standards')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-body-sm font-medium text-carbon-900">
                Standards & Frameworks ({methodology.standards.length})
              </span>
              {expandedSections.standards ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {methodology.standards.map((standard, index) => {
                const standardInfo = getStandardInfo(standard);
                return (
                  <motion.div
                    key={standard}
                    className="p-3 rounded-lg border border-carbon-200 bg-carbon-50"
                    initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={!prefersReducedMotion ? { delay: index * 0.1 } : { duration: 0 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-primary-500 mt-0.5" />
                        <span className="text-body-sm font-medium text-carbon-900">
                          {standardInfo.name}
                        </span>
                      </div>
                      {standardInfo.url && (
                        <Button variant="ghost" size="sm" className="h-auto p-1" asChild>
                          <a href={standardInfo.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <p className="text-caption text-carbon-600">
                      {standardInfo.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Emission Factors */}
        <Collapsible 
          open={expandedSections.factors}
          onOpenChange={() => toggleSection('factors')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-body-sm font-medium text-carbon-900">
                Emission Factors ({methodology.emissionFactors.length})
              </span>
              {expandedSections.factors ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-3">
              {methodology.emissionFactors.map((factor, index) => (
                <motion.div
                  key={`${factor.source}-${factor.category}`}
                  className="p-3 rounded-lg border border-carbon-200"
                  initial={!prefersReducedMotion ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={!prefersReducedMotion ? { delay: index * 0.05 } : { duration: 0 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-body-sm font-medium text-carbon-900">
                        {factor.category}
                      </span>
                      <div className="text-caption text-carbon-600">
                        Source: {factor.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-body-sm font-medium text-carbon-900">
                        {factor.factor} {factor.unit}
                      </div>
                      <div className="flex items-center space-x-1 text-caption text-carbon-500">
                        <Calendar className="h-3 w-3" />
                        <span>Updated {new Date(factor.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Assumptions */}
        <Collapsible 
          open={expandedSections.assumptions}
          onOpenChange={() => toggleSection('assumptions')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-body-sm font-medium text-carbon-900">
                Key Assumptions ({methodology.assumptions.length})
              </span>
              {expandedSections.assumptions ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {methodology.assumptions.map((assumption, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-2 p-3 rounded-lg bg-carbon-50"
                  initial={!prefersReducedMotion ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={!prefersReducedMotion ? { delay: index * 0.05 } : { duration: 0 }}
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-carbon-400 flex-shrink-0" />
                  <p className="text-body-sm text-carbon-700">{assumption}</p>
                </motion.div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer */}
        <div className="pt-4 border-t border-carbon-200">
          <div className="flex items-center justify-between text-caption text-carbon-500">
            <span>Methodology version {methodology.version}</span>
            <span>Last reviewed: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};