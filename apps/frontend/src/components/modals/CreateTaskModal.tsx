'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Flag } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { themeClasses } from '@/lib/theme';
import type { TaskPriority, CreateTaskPayload } from '@/types';

const priorityOptions: { value: TaskPriority; label: string; description: string }[] = [
    { value: 'low', label: 'Low', description: 'Can be done whenever' },
    { value: 'medium', label: 'Medium', description: 'Should be done soon' },
    { value: 'high', label: 'High', description: 'Important task' },
    { value: 'urgent', label: 'Urgent', description: 'Needs immediate attention' },
];

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate?: (task: CreateTaskPayload) => Promise<void>;
}

export function CreateTaskModal({
    open,
    onOpenChange,
    onCreate,
}: CreateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate('');
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setIsCreating(true);
        try {
            const payload: CreateTaskPayload = {
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            };
            await onCreate?.(payload);
            toast.success('Task created successfully');
            resetForm();
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to create task');
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Sticky Header */}
                <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg">Create New Task</DialogTitle>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="overflow-y-auto overflow-x-hidden px-6 py-4 space-y-5 flex-1">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="create-title" className="text-sm font-medium">
                            Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="create-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title..."
                            className="w-full"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="create-description" className="text-sm font-medium">
                            Description
                        </Label>
                        <Textarea
                            id="create-description"
                            placeholder="Add a description for this task..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[100px] w-full"
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label htmlFor="create-priority" className="text-sm font-medium flex items-center gap-1.5">
                            <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                            Priority <span className="text-destructive">*</span>
                        </Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col items-start">
                                            <span>{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label htmlFor="create-dueDate" className="text-sm font-medium flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            Due Date
                        </Label>
                        <Input
                            id="create-dueDate"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4 flex flex-row items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className={`${themeClasses.btnPrimary}`}
                    >
                        {isCreating ? 'Creating...' : 'Create Task'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
