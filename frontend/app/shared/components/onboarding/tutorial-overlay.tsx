import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Play,
  Pause,
  RotateCcw,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Card, CardContent } from '@shared/components/ui/card';
import { Progress } from '@shared/components/ui/progress';
import { cn } from '@shared/utils/cn';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'input' | 'scroll' | 'wait';
    element?: string;
    value?: string;
    duration?: number;
  };
  prerequisite?: () => boolean;
  validation?: () => boolean;
  optional?: boolean;
}

export interface TutorialProps {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
  autoPlay?: boolean;
  showProgress?: boolean;
  allowSkip?: boolean;
  className?: string;
}

export const TutorialOverlay = ({
  id,
  title,
  description,
  steps,
  isOpen,
  onClose,
  onComplete,
  onSkip,
  autoPlay = false,
  showProgress = true,
  allowSkip = true,
  className,
}: TutorialProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setHighlightedElement(element);
        
        const rect = element.getBoundingClientRect();
        const overlayRect = { width: 320, height: 200 }; // Approximate overlay size
        
        let x = rect.left + rect.width / 2 - overlayRect.width / 2;
        let y = rect.top - overlayRect.height - 20;

        switch (currentStep.position) {
          case 'bottom':
            y = rect.bottom + 20;
            break;
          case 'left':
            x = rect.left - overlayRect.width - 20;
            y = rect.top + rect.height / 2 - overlayRect.height / 2;
            break;
          case 'right':
            x = rect.right + 20;
            y = rect.top + rect.height / 2 - overlayRect.height / 2;
            break;
          case 'center':
            x = window.innerWidth / 2 - overlayRect.width / 2;
            y = window.innerHeight / 2 - overlayRect.height / 2;
            break;
        }

        x = Math.max(20, Math.min(x, window.innerWidth - overlayRect.width - 20));
        y = Math.max(20, Math.min(y, window.innerHeight - overlayRect.height - 20));

        setOverlayPosition({ x, y });
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightedElement(null);
      }
    } else {
      setHighlightedElement(null);
      setOverlayPosition({
        x: window.innerWidth / 2 - 160,
        y: window.innerHeight / 2 - 100,
      });
    }
  }, [currentStep, currentStepIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (highlightedElement) {
        const rect = highlightedElement.getBoundingClientRect();
        setOverlayPosition({
          x: rect.left + rect.width / 2 - 160,
          y: rect.top - 220,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [highlightedElement, isOpen]);

  const nextStep = () => {
    if (currentStep) {
      setCompletedSteps(prev => new Set(prev).add(currentStep.id));
    }
    
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    onSkip?.();
    onClose();
  };

  const restartTutorial = () => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  };

  const performAction = async () => {
    if (!currentStep?.action) return;

    const { type, element, value, duration } = currentStep.action;

    switch (type) {
      case 'click':
        if (element) {
          const target = document.querySelector(element);
          if (target instanceof HTMLElement) {
            target.click();
          }
        }
        break;
      case 'input':
        if (element && value) {
          const target = document.querySelector(element);
          if (target instanceof HTMLInputElement) {
            target.value = value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break;
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, duration || 2000));
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50">
          {highlightedElement && (
            <div
              className="absolute border-2 border-primary-400 rounded-lg shadow-lg bg-transparent"
              style={{
                left: highlightedElement.getBoundingClientRect().left - 4,
                top: highlightedElement.getBoundingClientRect().top - 4,
                width: highlightedElement.getBoundingClientRect().width + 8,
                height: highlightedElement.getBoundingClientRect().height + 8,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              }}
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn('absolute z-10', className)}
          style={{
            left: overlayPosition.x,
            top: overlayPosition.y,
          }}
        >
          <Card className="w-80 shadow-xl border-primary-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-primary-600" />
                    <Badge variant="outline" className="text-xs">
                      {title}
                    </Badge>
                  </div>
                  <h3 className="text-h6 font-semibold text-carbon-900">
                    {currentStep?.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 text-carbon-400 hover:text-carbon-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {showProgress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-carbon-600">
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                    <span className="text-xs text-carbon-600">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              )}

              <div className="mb-6">
                <p className="text-body-sm text-carbon-700 leading-relaxed">
                  {currentStep?.content}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={previousStep}
                    disabled={currentStepIndex === 0}
                    className="flex items-center space-x-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Back</span>
                  </Button>
                  
                  {allowSkip && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipTutorial}
                      className="text-carbon-500"
                    >
                      Skip
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {currentStep?.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={performAction}
                      className="flex items-center space-x-1"
                    >
                      <Play className="h-3 w-3" />
                      <span>Try it</span>
                    </Button>
                  )}
                  
                  <Button
                    onClick={nextStep}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    {isLastStep ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Finish</span>
                      </>
                    ) : (
                      <>
                        <span>Next</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isLastStep && (
                <div className="mt-4 pt-4 border-t border-carbon-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={restartTutorial}
                    className="w-full flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restart Tutorial</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export function useTutorial(tutorialId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`tutorial_completed_${tutorialId}`) === 'true';
    }
    return false;
  });

  const startTutorial = () => {
    setIsOpen(true);
  };

  const closeTutorial = () => {
    setIsOpen(false);
  };

  const completeTutorial = () => {
    setIsOpen(false);
    setHasCompleted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tutorial_completed_${tutorialId}`, 'true');
    }
  };

  const resetTutorial = () => {
    setHasCompleted(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tutorial_completed_${tutorialId}`);
    }
  };

  return {
    isOpen,
    hasCompleted,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
  };
}