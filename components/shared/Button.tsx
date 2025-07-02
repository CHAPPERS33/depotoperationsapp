
import React, { ElementType, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// Base props common to all variants
interface ButtonBaseProps {
  children?: ReactNode; // Made children optional
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  isLoading?: boolean; // Prop to indicate loading state, passed from parent
  className?: string;
}

// Props for the component, making 'as' prop available to change the underlying element
// And inferring props based on the 'as' prop
type ButtonProps<C extends ElementType = 'button'> = ButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<C>, keyof ButtonBaseProps | 'as' | 'disabled'> & { // Omit disabled here as we handle it specially
    as?: C;
    disabled?: boolean; // Explicitly define disabled for the Button component itself
  };

const Button = <C extends ElementType = 'button'>({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  isLoading = false, // This is the Button's own loading state prop, passed from parent
  as,
  className = '',
  disabled: parentDisabled = false, // This is the disabled prop passed from parent, default to false
  ...restButtonProps // Other props for the underlying element
}: ButtonProps<C>) => {
  const Component = as || ('button' as ElementType);

  const baseStyles = "font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles: Record<NonNullable<ButtonBaseProps['variant']>, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
  };

  const sizeStyles: Record<NonNullable<ButtonBaseProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizeStyles: Record<NonNullable<ButtonBaseProps['size']>, number> = {
    sm: 14,
    md: 16,
    lg: 18,
  };
  
  // Determine the final disabled state for the underlying element
  const finalElementDisabledState = Boolean(isLoading || parentDisabled);

  // Prepare props for the underlying component
  // Start with restButtonProps and add className
  const componentProps: any = {
    ...restButtonProps,
    className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`,
  };

  // Apply disabled or aria-disabled based on the component type and final state
  if (Component === 'button') {
    componentProps.disabled = finalElementDisabledState;
  } else {
    // For non-button elements like <a>, use aria-disabled
    // Only add aria-disabled if it's actually true
    if (finalElementDisabledState) {
      componentProps['aria-disabled'] = true; // React converts true to "true" for ARIA attributes
    }
  }

  return (
    <Component {...componentProps}>
      {isLoading && (
        <svg className={`animate-spin h-5 w-5 ${LeftIcon || RightIcon ? (size === 'sm' ? 'mr-1' : 'mr-2') : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {LeftIcon && !isLoading && <LeftIcon size={iconSizeStyles[size]} className={size === 'sm' ? 'mr-1' : 'mr-2'} />}
      {children}
      {RightIcon && !isLoading && <RightIcon size={iconSizeStyles[size]} className={size === 'sm' ? 'ml-1' : 'ml-2'} />}
    </Component>
  );
};

export default Button;
