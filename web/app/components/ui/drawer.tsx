import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "~/lib/utils"
import {
  Drawer,
  DrawerBackdrop as BaseDrawerBackdrop,
  DrawerClose as BaseDrawerClose,
  DrawerContent as BaseDrawerContent,
  DrawerDescription as BaseDrawerDescription,
  DrawerPortal,
  DrawerTitle as BaseDrawerTitle,
} from "./base/drawer"

const drawerContentVariants = cva(
  "scrollbar-subtle fixed z-50 flex flex-col overflow-y-auto border border-border bg-background shadow-2xl outline-none transform-gpu will-change-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 max-h-[88vh] rounded-t-[2rem] border-b-0 p-4 data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
        right:
          "inset-y-4 right-4 h-[calc(100vh-2rem)] w-[min(520px,calc(100vw-3rem))] rounded-[2rem] p-4 data-[starting-style]:translate-x-10 data-[ending-style]:translate-x-10",
      },
      desktopSide: {
        none: "",
        bottom:
          "xl:inset-x-0 xl:bottom-0 xl:max-h-[88vh] xl:rounded-t-[2rem] xl:border-b-0 xl:data-[starting-style]:translate-y-10 xl:data-[ending-style]:translate-y-10",
        right:
          "xl:inset-y-4 xl:right-4 xl:bottom-auto xl:left-auto xl:h-[calc(100vh-2rem)] xl:w-[min(520px,calc(100vw-3rem))] xl:max-h-[calc(100vh-2rem)] xl:rounded-[2rem] xl:border xl:data-[starting-style]:translate-x-10 xl:data-[starting-style]:translate-y-0 xl:data-[ending-style]:translate-x-10 xl:data-[ending-style]:translate-y-0",
      },
    },
    defaultVariants: {
      side: "bottom",
      desktopSide: "none",
    },
  },
)

interface DrawerProps extends React.ComponentProps<typeof Drawer> {}

function DrawerRoot(props: DrawerProps) {
  return <Drawer {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawerBackdrop>) {
  return (
    <BaseDrawerBackdrop
      className={cn(
        "fixed inset-0 z-40 bg-background/60 duration-200 ease-out xl:bg-background/70 xl:backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

interface DrawerContentProps
  extends React.ComponentProps<typeof BaseDrawerContent>,
    VariantProps<typeof drawerContentVariants> {}

function DrawerContent({
  className,
  side,
  desktopSide,
  ...props
}: DrawerContentProps) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <BaseDrawerContent
        className={cn(
          drawerContentVariants({ side, desktopSide }),
          className,
        )}
        {...props}
      />
    </DrawerPortal>
  )
}

function DrawerBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-4", className)} {...props} />
}

function DrawerHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "space-y-2 border-b border-border/80 pb-4",
        className,
      )}
      {...props}
    />
  )
}

function DrawerFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-t border-border/80 pt-4",
        className,
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawerTitle>) {
  return (
    <BaseDrawerTitle
      className={cn("text-xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDrawerDescription>) {
  return (
    <BaseDrawerDescription
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  )
}

function DrawerClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseDrawerClose>) {
  return (
    <BaseDrawerClose
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <X className="h-4 w-4" />}
    </BaseDrawerClose>
  )
}

export {
  DrawerRoot as Drawer,
  DrawerContent,
  DrawerBody,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
}
