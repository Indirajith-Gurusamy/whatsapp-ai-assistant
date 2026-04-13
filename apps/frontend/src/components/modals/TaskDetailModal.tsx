'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Calendar, User, Flag, Clock } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { themeClasses } from '@/lib/theme';
import type { TaskDetail, TaskStatus, TaskPriority, UpdateTaskPayload } from '@/types';

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-600' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-600' },
];

interface TaskDetailModalProps {
    task: TaskDetail | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: (updatedTask: UpdateTaskPayload) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function TaskDetailModal({
    task,
    open,
    onOpenChange,
    onUpdate,
    onDelete,
}: TaskDetailModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<TaskStatus>('todo');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [dueDate, setDueDate] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Update local state when task changes
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setStatus(task.status);
            setPriority(task.priority);
            setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
        }
    }, [task]);

    const handleUpdate = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setIsUpdating(true);
        try {
            const payload: UpdateTaskPayload = {
                title: title.trim(),
                description: description.trim() || undefined,
                status,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            };
            await onUpdate?.(payload);
            toast.success('Task updated successfully');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to update task');
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        setIsDeleting(true);
        try {
            await onDelete?.();
            toast.success('Task deleted successfully');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to delete task');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!task) return null;

    const getStatusBadge = (taskStatus: TaskStatus) => {
        const option = statusOptions.find(s => s.value === taskStatus);
        return option ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
                {option.label}
            </span>
        ) : null;
    };

    const getPriorityBadge = (taskPriority: TaskPriority) => {
        const option = priorityOptions.find(p => p.value === taskPriority);
        return option ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
                {option.label}
            </span>
        ) : null;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Sticky Header */}
                <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-lg">Task Details</span>
                        <div className="flex items-center gap-2 ml-4">
                            {getStatusBadge(status)}
                            {getPriorityBadge(priority)}
                        </div>
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="overflow-y-auto overflow-x-hidden px-6 py-4 space-y-6 flex-1">
                    {/* Task Title */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Task Information
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter task title..."
                                    className="w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-sm font-medium flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                        Status
                                    </Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-1.5">
                                        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                                        Priority
                                    </Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {priorityOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    Due Date
                                </Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            {task.assigned_to && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-muted-foreground">Assigned to:</span>
                                    <span>{task.assigned_to}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Description */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Description
                        </h3>
                        <Textarea
                            placeholder="Add a description for this task..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px] w-full"
                        />
                    </section>

                    {/* Task Meta */}
                    <section className="space-y-3">
                        <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                            Task Timeline
                        </h3>
                        <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">Created:</span>
                            <span>{new Date(task.created_at).toLocaleString()}</span>
                            <span className="font-medium text-muted-foreground">Updated:</span>
                            <span>{new Date(task.updated_at).toLocaleString()}</span>
                            {task.created_by && (
                                <>
                                    <span className="font-medium text-muted-foreground">Created by:</span>
                                    <span>{task.created_by}</span>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Comments Section */}
                    {task.comments && task.comments.length > 0 && (
                        <section className="space-y-3">
                            <h3 className={`font-semibold text-sm border-b-2 ${themeClasses.borderPrimary} pb-2`}>
                                Comments ({task.comments.length})
                            </h3>
                            <div className="space-y-3">
                                {task.comments.map((comment) => (
                                    <div key={comment.id} className={`p-3 rounded-lg border ${themeClasses.cardPrimary}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm">{comment.user_name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sticky Footer */}
                <DialogFooter className="sticky bottom-0 z-10 bg-background border-t px-6 py-4 flex flex-row items-center justify-between gap-2">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || isUpdating}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Task'}
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating || isDeleting}
                            className={`${themeClasses.btnPrimary}`}
                        >
                            {isUpdating ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
