"use client";



import { cn } from "@/lib/utils";

import {

    Select,

    SelectContent,

    SelectItem,

    SelectTrigger,

    SelectValue,

} from "@/components/ui/select";



import type { ChannelFilter } from "@/lib/channel-filter";

export type { ChannelFilter };



interface ChannelFilterDropdownProps {

    value: ChannelFilter;

    onChange: (value: ChannelFilter) => void;

    className?: string;

}



export function ChannelFilterDropdown({

    value,

    onChange,

    className,

}: ChannelFilterDropdownProps) {

    const hasValue = Boolean(value);



    return (

        <div className={cn("relative shrink-0 w-[6.75rem] sm:w-[7.5rem]", className)}>

            <span

                className={cn(

                    "absolute left-2.5 z-10 pointer-events-none px-1 transition-all duration-200",

                    "text-xs font-medium floating-label-bg text-orange-500",

                    hasValue

                        ? ""

                        : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-normal"

                )}

                style={hasValue ? { top: 0, transform: "translateY(-50%)" } : undefined}

            >

                Channel

            </span>

            <Select value={value} onValueChange={(v) => onChange(v as ChannelFilter)}>

                <SelectTrigger

                    className={cn(

                        "h-10 w-full rounded-lg border-input bg-transparent px-3 pt-4 pb-1 text-sm shadow-xs",

                        "data-[state=open]:border-orange-500 focus-visible:border-orange-500"

                    )}

                    aria-label="Filter by channel"

                >

                    <SelectValue />

                </SelectTrigger>

                <SelectContent>

                    <SelectItem value="all">All</SelectItem>

                    <SelectItem value="whatsapp">WhatsApp</SelectItem>

                    <SelectItem value="email">Email</SelectItem>

                </SelectContent>

            </Select>

        </div>

    );

}



