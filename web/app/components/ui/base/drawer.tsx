import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

const Drawer = DrawerPrimitive.Root

const DrawerPortal = DrawerPrimitive.Portal

const DrawerBackdrop = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Backdrop>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Backdrop>
>(function DrawerBackdrop(props, ref) {
  return <DrawerPrimitive.Backdrop ref={ref} {...props} />
})

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>
>(function DrawerContent(props, ref) {
  return <DrawerPrimitive.Popup ref={ref} {...props} />
})

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(function DrawerTitle(props, ref) {
  return <DrawerPrimitive.Title ref={ref} {...props} />
})

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(function DrawerDescription(props, ref) {
  return <DrawerPrimitive.Description ref={ref} {...props} />
})

const DrawerClose = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Close>
>(function DrawerClose(props, ref) {
  return <DrawerPrimitive.Close ref={ref} {...props} />
})

export {
  Drawer,
  DrawerPortal,
  DrawerBackdrop,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
}
