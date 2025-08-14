import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-xl border backdrop-blur-sm transition-all duration-300 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: 'bg-black/40 border-yellow-400/30 shadow-lg shadow-yellow-400/10',
        battle: 'bg-gradient-to-br from-red-900/20 to-black/40 border-red-500/40 shadow-lg shadow-red-500/20',
        victory: 'bg-gradient-to-br from-green-900/20 to-black/40 border-green-500/40 shadow-lg shadow-green-500/20',
        arena: 'bg-gradient-to-br from-gray-900/40 to-black/60 border-gray-500/30 shadow-lg shadow-gray-500/10',
        neon: 'bg-black/60 border-yellow-400/50 shadow-xl shadow-yellow-400/25',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof cardVariants> {
  glowEffect?: boolean;
  animated?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, glowEffect = false, animated = true, children, ...props }, ref) => {
    if (animated) {
      return (
        <motion.div
          className={clsx(cardVariants({ variant, size, className }))}
          ref={ref}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          {...(props as any)}
        >
          {/* Neon border glow effect */}
          {glowEffect && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1500" />
          )}
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-400/40" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-400/40" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-400/40" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-400/40" />
        </motion.div>
      );
    }

    return (
      <div
        className={clsx(cardVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {/* Neon border glow effect */}
        {glowEffect && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1500" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-400/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-400/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-400/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-400/40" />
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex flex-col space-y-1.5 pb-4 border-b border-yellow-400/20', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx('text-xl font-bold leading-none tracking-tight text-yellow-400', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx('text-sm text-gray-300', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx('pt-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex items-center pt-4 border-t border-yellow-400/20', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};