import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40',
        scout: 'bg-green-500/20 text-green-400 border border-green-500/40',
        sweeper: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
        inspector: 'bg-red-500/20 text-red-400 border border-red-500/40',
        fixer: 'bg-gray-500/20 text-gray-300 border border-gray-500/40',
        champion: 'bg-gradient-to-r from-yellow-400/30 to-red-500/30 text-yellow-300 border border-yellow-400/60',
        battle: 'bg-red-600/30 text-red-300 border border-red-500/50 animate-pulse',
        victory: 'bg-green-600/30 text-green-300 border border-green-500/50',
        defeat: 'bg-gray-600/30 text-gray-400 border border-gray-500/50',
        online: 'bg-green-500/20 text-green-400 border border-green-500/40',
        offline: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
        warning: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragEnd' | 'onDragStart'>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  glow?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, pulse = false, glow = false, children, ...props }, ref) => {
    return (
      <motion.div
        className={clsx(
          badgeVariants({ variant, size }),
          {
            'animate-pulse': pulse,
            'shadow-lg': glow,
          },
          className
        )}
        ref={ref}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        whileHover={{ scale: 1.05 }}
        {...(props as any)}
      >
        {/* Glow effect for special badges */}
        {glow && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 -skew-x-12 animate-pulse" />
        )}
        
        <span className="relative z-10">{children}</span>
      </motion.div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };