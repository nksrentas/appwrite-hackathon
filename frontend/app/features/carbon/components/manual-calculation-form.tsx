import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  MapPin,
  Calendar,
  Zap,
  Car,
  Plane,
  Home,
  Factory,
  Trash2,
  Plus,
  Minus,
  Info,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Separator } from '@shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormInput,
  FormError,
  FormDescription,
  FormValidationSummary,
  ControlledFormInput,
  useFormField,
} from '@shared/components/ui/form';
import { toast } from '@shared/hooks/use-toast';
import {
  carbonCalculationSchema,
  validateForm,
  validateField,
  energyUsageSchema,
  distanceSchema,
  type CarbonCalculationFormData,
} from '@shared/utils/validation';
import { cn } from '@shared/utils/cn';
import type { ActivityType, CalculationRequest, GeographicLocation } from '@features/carbon/types';

interface ManualCalculationFormProps {
  onSubmit: (data: CalculationRequest) => Promise<void>;
  className?: string;
  defaultLocation?: GeographicLocation;
}

type CalculationCategory = 
  | 'energy' 
  | 'transportation' 
  | 'waste' 
  | 'digital' 
  | 'industrial' 
  | 'custom';

interface CalculationItem {
  id: string;
  category: CalculationCategory;
  activityType: string;
  description: string;
  amount: number;
  unit: string;
  date: Date;
  location?: GeographicLocation;
  additionalData?: Record<string, unknown>;
}

const CATEGORY_CONFIG = {
  energy: {
    icon: Zap,
    title: 'Energy Usage',
    description: 'Electricity, gas, heating, and cooling consumption',
    activities: [
      { type: 'electricity', label: 'Electricity Usage', units: ['kWh', 'MWh'] },
      { type: 'natural-gas', label: 'Natural Gas', units: ['m³', 'therms', 'BTU'] },
      { type: 'heating-oil', label: 'Heating Oil', units: ['liters', 'gallons'] },
      { type: 'coal', label: 'Coal', units: ['kg', 'tonnes'] },
      { type: 'renewable', label: 'Renewable Energy', units: ['kWh', 'MWh'] },
    ],
  },
  transportation: {
    icon: Car,
    title: 'Transportation',
    description: 'Vehicle fuel consumption, public transport, and travel',
    activities: [
      { type: 'gasoline', label: 'Gasoline Vehicle', units: ['km', 'miles', 'liters', 'gallons'] },
      { type: 'diesel', label: 'Diesel Vehicle', units: ['km', 'miles', 'liters', 'gallons'] },
      { type: 'aviation', label: 'Air Travel', units: ['km', 'miles', 'flights'] },
      { type: 'public-transport', label: 'Public Transport', units: ['km', 'miles', 'trips'] },
      { type: 'shipping', label: 'Freight/Shipping', units: ['tonne-km', 'kg-km'] },
    ],
  },
  waste: {
    icon: Trash2,
    title: 'Waste Management',
    description: 'Waste generation, recycling, and disposal',
    activities: [
      { type: 'municipal-waste', label: 'Municipal Waste', units: ['kg', 'tonnes'] },
      { type: 'recycling', label: 'Recycling', units: ['kg', 'tonnes'] },
      { type: 'composting', label: 'Composting', units: ['kg', 'tonnes'] },
      { type: 'hazardous-waste', label: 'Hazardous Waste', units: ['kg', 'tonnes'] },
    ],
  },
  digital: {
    icon: Calculator,
    title: 'Digital Services',
    description: 'Cloud computing, data centers, and digital infrastructure',
    activities: [
      { type: 'cloud-compute', label: 'Cloud Computing', units: ['CPU-hours', 'instance-hours'] },
      { type: 'data-storage', label: 'Data Storage', units: ['GB-month', 'TB-month'] },
      { type: 'data-transfer', label: 'Data Transfer', units: ['GB', 'TB'] },
      { type: 'github-actions', label: 'CI/CD Pipelines', units: ['build-minutes', 'jobs'] },
    ],
  },
  industrial: {
    icon: Factory,
    title: 'Industrial Processes',
    description: 'Manufacturing, production, and industrial activities',
    activities: [
      { type: 'manufacturing', label: 'Manufacturing', units: ['units', 'kg-product'] },
      { type: 'cement', label: 'Cement Production', units: ['tonnes'] },
      { type: 'steel', label: 'Steel Production', units: ['tonnes'] },
      { type: 'chemicals', label: 'Chemical Production', units: ['kg', 'tonnes'] },
    ],
  },
  custom: {
    icon: Plus,
    title: 'Custom Activity',
    description: 'Define your own activity type and emission factors',
    activities: [
      { type: 'custom', label: 'Custom Activity', units: ['units', 'kg', 'hours'] },
    ],
  },
};

export const ManualCalculationForm = ({
  onSubmit,
  className,
  defaultLocation,
}: ManualCalculationFormProps) => {
  const [activeCategory, setActiveCategory] = useState<CalculationCategory>('energy');
  const [calculationItems, setCalculationItems] = useState<CalculationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Array<{ field: string; message: string }>>([]);

  const activityTypeField = useFormField('', (value) => 
    validateField(energyUsageSchema, parseFloat(value) || 0)
  );
  const amountField = useFormField(0, (value) => 
    validateField(energyUsageSchema, value)
  );
  const unitField = useFormField('');
  const dateField = useFormField(new Date());
  const descriptionField = useFormField('');
  const locationField = useFormField(defaultLocation || {
    country: '',
    region: '',
    postalCode: '',
  });

  const addCalculationItem = () => {
    const categoryConfig = CATEGORY_CONFIG[activeCategory];
    const selectedActivity = categoryConfig.activities[0];

    if (!selectedActivity) return;

    const newItem: CalculationItem = {
      id: crypto.randomUUID(),
      category: activeCategory,
      activityType: selectedActivity.type,
      description: descriptionField.value || selectedActivity.label,
      amount: amountField.value,
      unit: unitField.value || selectedActivity.units[0],
      date: dateField.value,
      location: locationField.value,
    };

    setCalculationItems(prev => [...prev, newItem]);
    
    amountField.reset();
    descriptionField.reset();
    
    toast.success({
      title: 'Activity Added',
      description: `${selectedActivity.label} has been added to your calculation.`,
    });
  };

  const removeCalculationItem = (id: string) => {
    setCalculationItems(prev => prev.filter(item => item.id !== id));
    toast.info({
      title: 'Activity Removed',
      description: 'The activity has been removed from your calculation.',
    });
  };

  const calculateTotal = async () => {
    if (calculationItems.length === 0) {
      toast.error({
        title: 'No Activities',
        description: 'Please add at least one activity to calculate carbon footprint.',
      });
      return;
    }

    setIsSubmitting(true);
    setFormErrors([]);

    try {
      const calculationRequest: CalculationRequest = {
        activityType: 'generic' as ActivityType,
        metadata: {
          items: calculationItems,
          calculationType: 'manual',
          categories: Array.from(new Set(calculationItems.map(item => item.category))),
        },
        location: locationField.value,
        timestamp: new Date(),
        userPreferences: {
          conservativeApproach: true,
          uncertaintyDisplay: true,
          detailLevel: 'advanced',
        },
      };

      await onSubmit(calculationRequest);
      
      toast.success({
        title: 'Calculation Complete',
        description: 'Your carbon footprint has been calculated successfully.',
      });
      
      setCalculationItems([]);
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error({
        title: 'Calculation Failed',
        description: 'There was an error calculating your carbon footprint. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: CalculationCategory) => {
    const IconComponent = CATEGORY_CONFIG[category].icon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getTotalByCategory = (category: CalculationCategory) => {
    return calculationItems
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Manual Carbon Calculation</span>
          </CardTitle>
          <p className="text-body-sm text-carbon-600">
            Add your activities to calculate their carbon footprint using our scientific methodology.
          </p>
        </CardHeader>
        <CardContent>
          <FormValidationSummary errors={formErrors} className="mb-6" />
          
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as CalculationCategory)}>
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="flex items-center space-x-2">
                  {getCategoryIcon(key as CalculationCategory)}
                  <span className="hidden sm:inline">{config.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => (
              <TabsContent key={categoryKey} value={categoryKey} className="space-y-6 mt-6">
                <div className="text-center">
                  <config.icon className="h-12 w-12 text-primary-600 mx-auto mb-3" />
                  <h3 className="text-h5 font-semibold text-carbon-900 mb-2">{config.title}</h3>
                  <p className="text-body-sm text-carbon-600">{config.description}</p>
                </div>

                <Form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField>
                      <FormLabel htmlFor="activity-type" required>Activity Type</FormLabel>
                      <FormControl>
                        <Select value={activityTypeField.value} onValueChange={activityTypeField.setValue}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity type" />
                          </SelectTrigger>
                          <SelectContent>
                            {config.activities.map((activity) => (
                              <SelectItem key={activity.type} value={activity.type}>
                                {activity.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormError>{activityTypeField.error}</FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="unit" required>Unit</FormLabel>
                      <FormControl>
                        <Select value={unitField.value} onValueChange={unitField.setValue}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {config.activities
                              .find(activity => activity.type === activityTypeField.value)
                              ?.units.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              )) || []}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormError>{unitField.error}</FormError>
                    </FormField>

                    <ControlledFormInput
                      id="amount"
                      label="Amount"
                      type="number"
                      step="0.01"
                      min="0"
                      field={amountField}
                      onValueChange={(value) => amountField.setValue(parseFloat(value) || 0)}
                      onBlur={amountField.validate}
                      required
                      placeholder="Enter amount"
                    />

                    <FormField>
                      <FormLabel htmlFor="date" required>Date</FormLabel>
                      <FormControl>
                        <FormInput
                          id="date"
                          type="date"
                          value={dateField.value.toISOString().split('T')[0]}
                          onChange={(e) => dateField.setValue(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormError>{dateField.error}</FormError>
                    </FormField>

                    <div className="md:col-span-2">
                      <ControlledFormInput
                        id="description"
                        label="Description"
                        field={descriptionField}
                        onValueChange={descriptionField.setValue}
                        placeholder="Optional description of this activity"
                        description="Provide additional context for this activity"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={addCalculationItem}
                      disabled={!activityTypeField.value || !amountField.value || !unitField.value}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Activity</span>
                    </Button>
                  </div>
                </Form>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Calculation Items Summary */}
      {calculationItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Activities ({calculationItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
                const categoryItems = calculationItems.filter(item => item.category === categoryKey);
                if (categoryItems.length === 0) return null;

                return (
                  <Collapsible key={categoryKey}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-carbon-50 rounded-lg hover:bg-carbon-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(categoryKey as CalculationCategory)}
                        <span className="font-medium">{config.title}</span>
                        <Badge variant="secondary">{categoryItems.length} activities</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-3">
                        {categoryItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between p-3 border border-carbon-200 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-carbon-900">{item.description}</p>
                              <p className="text-body-sm text-carbon-600">
                                {item.amount} {item.unit} • {item.date.toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCalculationItem(item.id)}
                              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            <Separator className="my-6" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-base font-medium text-carbon-900">
                  Ready to calculate carbon footprint
                </p>
                <p className="text-body-sm text-carbon-600">
                  {calculationItems.length} activities across {Object.keys(CATEGORY_CONFIG).filter(key => getTotalByCategory(key as CalculationCategory) > 0).length} categories
                </p>
              </div>
              <Button
                onClick={calculateTotal}
                disabled={isSubmitting}
                size="lg"
                className="flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Calculator className="h-4 w-4" />
                    </motion.div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    <span>Calculate Carbon Footprint</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Settings */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center space-x-2 text-carbon-700 hover:text-carbon-900">
          <MapPin className="h-4 w-4" />
          <span>Location Settings (Optional)</span>
          <Info className="h-4 w-4 text-carbon-400" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField>
                  <FormLabel htmlFor="country">Country</FormLabel>
                  <FormControl>
                    <FormInput
                      id="country"
                      value={locationField.value.country}
                      onChange={(e) => locationField.setValue({
                        ...locationField.value,
                        country: e.target.value
                      })}
                      placeholder="e.g., United States"
                    />
                  </FormControl>
                  <FormDescription>
                    Used for region-specific emission factors
                  </FormDescription>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="region">State/Region</FormLabel>
                  <FormControl>
                    <FormInput
                      id="region"
                      value={locationField.value.region || ''}
                      onChange={(e) => locationField.setValue({
                        ...locationField.value,
                        region: e.target.value
                      })}
                      placeholder="e.g., California"
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="postal-code">Postal Code</FormLabel>
                  <FormControl>
                    <FormInput
                      id="postal-code"
                      value={locationField.value.postalCode || ''}
                      onChange={(e) => locationField.setValue({
                        ...locationField.value,
                        postalCode: e.target.value
                      })}
                      placeholder="e.g., 90210"
                    />
                  </FormControl>
                </FormField>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};