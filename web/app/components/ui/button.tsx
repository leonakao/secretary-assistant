import { cn } from '~/lib/utils';
import {
  Button as BaseButton,
  buttonVariants,
} from './base/button';
import type { VariantProps } from 'class-variance-authority';
import type { Button as ButtonPrimitive } from '@base-ui/react/button';

function Button({
  className,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <BaseButton className={cn('cursor-pointer', className)} {...props} />;
}

export { Button, buttonVariants };
