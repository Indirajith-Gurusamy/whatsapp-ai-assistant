'use client';

import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { DataTable } from '@/components/data/DataTable';
import { ListPageSkeleton } from '@/components/data/ListPageSkeleton';
import { ListPageShell } from '@/components/data/ListPageShell';
import { TaskDetailModal } from '@/components/modals/TaskDetailModal';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Calendar, User } from 'lucide-react';
import type { Task, TaskDetail, TaskStatus, CreateTaskPayload, UpdateTaskPayload } from '@/types';
import { taskFilterFields } from '@/lib/table-filter-presets';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; textColor: string }> = {
    todo: { label: 'To Do', color: 'bg-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    review: { label: 'Review', color: 'bg-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    completed: { label: 'Completed', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-500', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'bg-gray-400' },
    medium: { label: 'Medium', color: 'bg-blue-500' },
    high: { label: 'High', color: 'bg-orange-500' },
    urgent: { label: 'Urgent', color: 'bg-red-500' },
};

export default function TasksPage() {
    const { tasks, isLoading, refresh } = useTasks();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (tasks.length === 0) {
            toast.warning('No data available to export');
            return;
        }

        setIsExporting(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            const headers = [
                'ID',
                'Title',
                'Description',
                'Status',
                'Priority',
                'Due Date',
                'Assigned To',
                'Created At',
            ];

            const rows = tasks.map(task => [
                task.uuid,
                `"${(task.title || '').replace(/"/g, '""')}"`,
                `"${(task.description || '').replace(/"/g, '""')}"`,
                statusConfig[task.status]?.label || task.status,
                task.priority,
                task.due_date || '',
                task.assigned_to || '',
                task.created_at,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.setAttribute('href', url);
            link.setAttribute('download', `tasks_export_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate export file');
        } finally {
            setIsExporting(false);
        }
    };

    const handleRowClick = (task: Task) => {
        // Find full task details from filtered or all tasks
        const fullTask = tasks.find(t => t.uuid === task.uuid);
        if (fullTask) {
            // Convert Task to TaskDetail for the modal
            setSelectedTask({
                ...fullTask,
                comments: [],
            });
            setDetailModalOpen(true);
        }
    };

    const handleCreateTask = async (data: CreateTaskPayload) => {
        await createTask.mutateAsync(data);
        refresh();
    };

    const handleUpdateTask = async (data: UpdateTaskPayload) => {
        if (!selectedTask) return;
        await updateTask.mutateAsync({ uuid: selectedTask.uuid, data });
        refresh();
    };

    const handleDeleteTask = async () => {
        if (!selectedTask) return;
        await deleteTask.mutateAsync(selectedTask.uuid);
        refresh();
    };

    const getStatusBadge = (status: TaskStatus) => {
        const config = statusConfig[status];
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                {config.label}
            </span>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const config = priorityConfig[priority];
        if (!config) return null;
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium">
                <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return '-';
        }
    };

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const columns = [
        {
            key: 'title',
            header: 'Task',
            cell: (item: Task) => (
                <div className="font-medium max-w-[250px]">
                    <div className="truncate">{item.title}</div>
                    {item.description && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.description.substring(0, 60)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (item: Task) => getStatusBadge(item.status),
        },
        {
            key: 'priority',
            header: 'Priority',
            cell: (item: Task) => getPriorityBadge(item.priority),
        },
        {
            key: 'due_date',
            header: 'Due Date',
            cell: (item: Task) => (
                <div className={`flex items-center gap-1.5 text-sm ${isOverdue(item.due_date) && item.status !== 'completed' && item.status !== 'cancelled' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(item.due_date)}
                </div>
            ),
        },
        {
            key: 'assigned_to',
            header: 'Assigned',
            cell: (item: Task) => (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {item.assigned_to ? (
                        <>
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[100px]">{item.assigned_to}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground/50">Unassigned</span>
                    )}
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            cell: (item: Task) => (
                <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            ),
            className: 'hidden lg:table-cell',
        },
        {
            key: 'action',
            header: 'Action',
            cell: (item: Task) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRowClick(item)}>
                                View Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return <ListPageSkeleton columns={7} />;
    }

    return (
        <ListPageShell>
            <DataTable
                className="flex flex-1 flex-col min-h-0"
                data={tasks}
                columns={columns}
                onRowClick={(item) => handleRowClick(item as Task)}
                emptyMessage="No tasks found"
                searchPlaceholder="Search..."
                addLabel="New Task"
                onAdd={() => setCreateModalOpen(true)}
                onExport={handleExport}
                isExporting={isExporting}
                searchFields={['title', 'description'] as (keyof Task)[]}
                filterFields={taskFilterFields}
            />

            <TaskDetailModal
                task={selectedTask}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
            />

            <CreateTaskModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onCreate={handleCreateTask}
            />
        </ListPageShell>
    );
}
