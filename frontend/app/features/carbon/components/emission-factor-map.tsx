import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Layers,
  Calendar,
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Slider } from '@shared/components/ui/slider';
import { cn } from '@shared/utils/cn';

interface EmissionFactor {
  region: string;
  regionCode: string;
  coordinates: [number, number];
  factor: number;
  unit: string;
  lastUpdated: Date;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'worsening';
  temporalVariation: {
    hour: number;
    season: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  gridMix: {
    renewables: number;
    fossil: number;
    nuclear: number;
    other: number;
  };
}

interface EmissionFactorMapProps {
  selectedRegion?: string;
  onRegionSelect?: (region: string) => void;
  showTemporal?: boolean;
  showGridMix?: boolean;
  className?: string;
}

export const EmissionFactorMap = ({
  selectedRegion,
  onRegionSelect,
  showTemporal = true,
  showGridMix = true,
  className
}: EmissionFactorMapProps) => {
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'current' | 'daily' | 'seasonal'>('current');
  const [selectedSource, setSelectedSource] = useState<'all' | 'epa' | 'electricitymaps'>('all');
  const [selectedHour, setSelectedHour] = useState<number[]>([12]);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const mockEmissionFactors: EmissionFactor[] = [
    {
      region: 'California (CAISO)',
      regionCode: 'CAISO',
      coordinates: [-119.4179, 36.7783],
      factor: 0.289,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 1800000),
      source: 'EPA eGRID',
      confidence: 'high',
      trend: 'improving',
      temporalVariation: { hour: 8, season: 15, timeOfDay: 'afternoon' },
      gridMix: { renewables: 45, fossil: 35, nuclear: 15, other: 5 }
    },
    {
      region: 'Texas (ERCOT)',
      regionCode: 'ERCT',
      coordinates: [-99.9018, 31.9686],
      factor: 0.434,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 900000),
      source: 'EPA eGRID',
      confidence: 'high',
      trend: 'improving',
      temporalVariation: { hour: 12, season: 8, timeOfDay: 'afternoon' },
      gridMix: { renewables: 28, fossil: 62, nuclear: 8, other: 2 }
    },
    {
      region: 'New York (NYISO)',
      regionCode: 'NYIS',
      coordinates: [-74.0060, 40.7128],
      factor: 0.315,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 1200000),
      source: 'EPA eGRID',
      confidence: 'high',
      trend: 'stable',
      temporalVariation: { hour: 6, season: 10, timeOfDay: 'afternoon' },
      gridMix: { renewables: 35, fossil: 38, nuclear: 25, other: 2 }
    },
    {
      region: 'Pacific Northwest',
      regionCode: 'NWPP',
      coordinates: [-120.5542, 47.0379],
      factor: 0.198,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 600000),
      source: 'EPA eGRID',
      confidence: 'high',
      trend: 'improving',
      temporalVariation: { hour: 4, season: 20, timeOfDay: 'afternoon' },
      gridMix: { renewables: 65, fossil: 15, nuclear: 15, other: 5 }
    },
    {
      region: 'Southeast (SERC)',
      regionCode: 'SERC',
      coordinates: [-84.3880, 33.7490],
      factor: 0.486,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 2100000),
      source: 'EPA eGRID',
      confidence: 'medium',
      trend: 'worsening',
      temporalVariation: { hour: 15, season: 5, timeOfDay: 'afternoon' },
      gridMix: { renewables: 18, fossil: 72, nuclear: 8, other: 2 }
    },
    {
      region: 'Midwest (MISO)',
      regionCode: 'MISO',
      coordinates: [-93.2650, 44.9778],
      factor: 0.512,
      unit: 'kg CO2e/kWh',
      lastUpdated: new Date(Date.now() - 1500000),
      source: 'EPA eGRID',
      confidence: 'high',
      trend: 'stable',
      temporalVariation: { hour: 10, season: 12, timeOfDay: 'afternoon' },
      gridMix: { renewables: 22, fossil: 58, nuclear: 18, other: 2 }
    }
  ];

  useEffect(() => {
    fetchEmissionFactors();
  }, [selectedSource]);

  const fetchEmissionFactors = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmissionFactors(mockEmissionFactors);
    } catch (error) {
      console.error('Failed to fetch emission factors:', error);
      setEmissionFactors(mockEmissionFactors);
    }
    setLoading(false);
  };

  const filteredFactors = useMemo(() => {
    let factors = emissionFactors;
    
    if (selectedSource !== 'all') {
      factors = factors.filter(factor => 
        factor.source.toLowerCase().includes(selectedSource)
      );
    }
    
    return factors.sort((a, b) => a.factor - b.factor);
  }, [emissionFactors, selectedSource]);

  const getFactorColor = (factor: number) => {
    if (factor < 0.3) return 'bg-success-500';
    if (factor < 0.4) return 'bg-yellow-500';
    if (factor < 0.5) return 'bg-orange-500';
    return 'bg-danger-500';
  };

  const getFactorIntensity = (factor: number) => {
    const max = Math.max(...filteredFactors.map(f => f.factor));
    const min = Math.min(...filteredFactors.map(f => f.factor));
    return ((factor - min) / (max - min)) * 0.8 + 0.2;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="h-3 w-3 text-success-600" />;
      case 'worsening':
        return <TrendingUp className="h-3 w-3 text-danger-600" />;
      default:
        return <TrendingUp className="h-3 w-3 text-carbon-400" />;
    }
  };

  const adjustFactorForTime = (baseFactor: number, temporalVariation: any) => {
    const hourAdjustment = (selectedHour[0] - 12) / 24 * (temporalVariation.hour / 100);
    return baseFactor * (1 + hourAdjustment);
  };

  const selectedEmissionFactor = filteredFactors.find(f => f.regionCode === selectedRegion);
  const hoveredEmissionFactor = filteredFactors.find(f => f.regionCode === hoveredRegion);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <span>Emission Factor Map</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEmissionFactors}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="daily">Daily Variation</SelectItem>
              <SelectItem value="seasonal">Seasonal Trends</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={(value: any) => setSelectedSource(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="epa">EPA eGRID</SelectItem>
              <SelectItem value="electricitymaps">Electricity Maps</SelectItem>
            </SelectContent>
          </Select>

          {showTemporal && selectedTimeframe === 'daily' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-carbon-600">Hour of Day</span>
                <span className="text-body-sm font-medium">{selectedHour[0]}:00</span>
              </div>
              <Slider
                value={selectedHour}
                onValueChange={setSelectedHour}
                max={23}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="relative bg-carbon-50 rounded-lg p-6 min-h-[400px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
              <AnimatePresence>
                {filteredFactors.map((factor) => {
                  const adjustedFactor = showTemporal && selectedTimeframe === 'daily'
                    ? adjustFactorForTime(factor.factor, factor.temporalVariation)
                    : factor.factor;
                  
                  const isSelected = factor.regionCode === selectedRegion;
                  const isHovered = factor.regionCode === hoveredRegion;
                  
                  return (
                    <motion.div
                      key={factor.regionCode}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, 
                        scale: isSelected || isHovered ? 1.05 : 1,
                        y: isSelected || isHovered ? -2 : 0
                      }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className={cn(
                        'relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                        isSelected 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-carbon-200 bg-white hover:border-primary-300',
                        'shadow-sm hover:shadow-md'
                      )}
                      onClick={() => onRegionSelect?.(factor.regionCode)}
                      onMouseEnter={() => setHoveredRegion(factor.regionCode)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className={cn(
                              'w-3 h-3 rounded-full',
                              getFactorColor(adjustedFactor)
                            )}
                            style={{ 
                              opacity: getFactorIntensity(adjustedFactor) 
                            }}
                          />
                          <span className="text-body-sm font-medium text-carbon-900">
                            {factor.regionCode}
                          </span>
                        </div>
                        {getTrendIcon(factor.trend)}
                      </div>
                      
                      <div className="text-2xl font-bold text-carbon-900 mb-1">
                        {adjustedFactor.toFixed(3)}
                      </div>
                      <div className="text-caption text-carbon-500 mb-2">
                        {factor.unit}
                      </div>
                      
                      <div className="text-caption text-carbon-600 truncate">
                        {factor.region}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-caption text-carbon-500">
                        <span>Conf: {factor.confidence}</span>
                        <Clock className="h-3 w-3" />
                      </div>
                      
                      {(isSelected || isHovered) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 pt-3 border-t border-carbon-200 space-y-1"
                        >
                          <div className="text-caption text-carbon-600">
                            Updated: {factor.lastUpdated.toLocaleTimeString()}
                          </div>
                          <div className="text-caption text-carbon-600">
                            Source: {factor.source}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-carbon-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-body-sm font-medium text-carbon-700">Emission Intensity:</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-success-500" />
              <span className="text-caption text-carbon-600">Low (&lt;0.3)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-caption text-carbon-600">Medium (0.3-0.4)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-caption text-carbon-600">High (0.4-0.5)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-danger-500" />
              <span className="text-caption text-carbon-600">Very High (&gt;0.5)</span>
            </div>
          </div>
        </div>

        {selectedEmissionFactor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-carbon-200 rounded-lg p-4 bg-carbon-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-body-base font-semibold text-carbon-900">
                {selectedEmissionFactor.region}
              </h4>
              <Badge className={cn(
                selectedEmissionFactor.confidence === 'high' 
                  ? 'bg-success-50 text-success-600 border-success-200'
                  : selectedEmissionFactor.confidence === 'medium'
                  ? 'bg-warning-50 text-warning-600 border-warning-200'
                  : 'bg-danger-50 text-danger-600 border-danger-200'
              )}>
                {selectedEmissionFactor.confidence} confidence
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {showTemporal && (
                <div>
                  <h5 className="text-body-sm font-medium text-carbon-700 mb-2">
                    Temporal Variation
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Hourly variation:</span>
                      <span className="text-caption text-carbon-900">
                        ±{selectedEmissionFactor.temporalVariation.hour}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Seasonal variation:</span>
                      <span className="text-caption text-carbon-900">
                        ±{selectedEmissionFactor.temporalVariation.season}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Current time of day:</span>
                      <span className="text-caption text-carbon-900">
                        {selectedEmissionFactor.temporalVariation.timeOfDay}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showGridMix && (
                <div>
                  <h5 className="text-body-sm font-medium text-carbon-700 mb-2">
                    Grid Mix Composition
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Renewables:</span>
                      <span className="text-caption text-carbon-900">
                        {selectedEmissionFactor.gridMix.renewables}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Fossil fuels:</span>
                      <span className="text-caption text-carbon-900">
                        {selectedEmissionFactor.gridMix.fossil}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-carbon-600">Nuclear:</span>
                      <span className="text-caption text-carbon-900">
                        {selectedEmissionFactor.gridMix.nuclear}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};