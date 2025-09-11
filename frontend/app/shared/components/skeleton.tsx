import * as React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@shared/components/ui/card';
import { cn } from '@shared/utils/cn';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-carbon-100',
        className
      )}
      {...props}
    />
  );
};

export const ShimmerSkeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-carbon-100',
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ translateX: '200%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
};

export const PulseSkeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <motion.div
      className={cn('rounded-md bg-carbon-100', className)}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      {...props}
    />
  );
};

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: 'full' | '75%' | '50%' | '25%';
  className?: string;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  lastLineWidth = '75%',
  className,
}) => {
  const widthMap = {
    full: 'w-full',
    '75%': 'w-3/4',
    '50%': 'w-1/2',
    '25%': 'w-1/4',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4',
            index === lines - 1 ? widthMap[lastLineWidth] : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton
      className={cn('rounded-full', sizeClasses[size], className)}
    />
  );
};

interface ButtonSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  className?: string;
}

export const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({
  size = 'md',
  width = 'auto',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-11',
  };

  const widthClass = typeof width === 'string' ? width : `w-${width}`;

  return (
    <Skeleton
      className={cn(
        'rounded-md',
        sizeClasses[size],
        typeof width === 'string' ? width : `w-${width}`,
        className
      )}
    />
  );
};

interface CardSkeletonProps {
  showHeader?: boolean;
  headerLines?: number;
  contentLines?: number;
  showFooter?: boolean;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  headerLines = 2,
  contentLines = 4,
  showFooter = false,
  className,
}) => {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          {headerLines > 1 && <Skeleton className="h-4 w-1/2" />}
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        <TextSkeleton lines={contentLines} />
        {showFooter && (
          <div className="flex items-center space-x-2 pt-3">
            <ButtonSkeleton size="sm" width="w-20" />
            <ButtonSkeleton size="sm" width="w-16" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {showHeader && (
        <div className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-3/4" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
};

interface ChartSkeletonProps {
  type?: 'line' | 'bar' | 'pie' | 'area';
  height?: number;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'line',
  height = 300,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      
      <div className="relative" style={{ height }}>
        <Skeleton className="w-full h-full rounded-lg" />
        
        {type === 'line' && (
          <div className="absolute inset-4 space-y-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-0.5 w-full" />
            ))}
          </div>
        )}
        
        {type === 'bar' && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end space-x-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="flex-1 rounded-t"
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
            ))}
          </div>
        )}
        
        {type === 'pie' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-48 h-48 rounded-full" />
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center space-x-3">
          <ButtonSkeleton width="w-24" />
          <ButtonSkeleton width="w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton type="line" height={250} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton type="bar" height={250} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <AvatarSkeleton size="sm" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  itemHeight?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = true,
  showActions = true,
  itemHeight = 'md',
  className,
}) => {
  const heightClasses = {
    sm: 'py-3',
    md: 'py-4',
    lg: 'py-6',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center space-x-4 px-4 border-b border-carbon-100 last:border-b-0',
            heightClasses[itemHeight]
          )}
        >
          {showAvatar && <AvatarSkeleton size="md" />}
          
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <ButtonSkeleton size="sm" width="w-16" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface FormSkeletonProps {
  fields?: number;
  showSubmit?: boolean;
  columns?: 1 | 2;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 6,
  showSubmit = true,
  columns = 1,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className={cn(
        'space-y-4',
        columns === 2 && 'grid grid-cols-2 gap-6 space-y-0'
      )}>
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      
      {showSubmit && (
        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <ButtonSkeleton width="w-20" />
          <ButtonSkeleton width="w-24" />
        </div>
      )}
    </div>
  );
};

export const NavigationSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 px-3 py-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
};