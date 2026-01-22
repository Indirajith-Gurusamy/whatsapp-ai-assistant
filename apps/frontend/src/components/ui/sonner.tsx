"use client"

import { useEffect } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps, toast } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  useEffect(() => {
    // Single click - dismiss the toast
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const toastElement = target.closest("[data-sonner-toast]")

      if (toastElement) {
        const toastId = toastElement.getAttribute("data-sonner-toast-id") || toastElement.getAttribute("data-id")
        if (toastId) {
          toast.dismiss(toastId)
        } else {
          toast.dismiss()
        }
      }
    }

    // Double click - select all text in the toast
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const toastElement = target.closest("[data-sonner-toast]")

      if (toastElement) {
        // Prevent the toast from being dismissed
        e.stopPropagation()

        // Select all text in the toast
        const range = document.createRange()
        range.selectNodeContents(toastElement)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("dblclick", handleDoubleClick, true)

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("dblclick", handleDoubleClick, true)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={false}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        className: "cursor-pointer select-text",
        unstyled: false,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
