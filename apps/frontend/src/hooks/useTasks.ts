'use client';

import useSWR, { mutate } from 'swr';
import { tasksApi, type TaskListResponse } from '@/lib/api';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '@/types';
import { useCallback } from 'react';

const TASKS_CACHE_KEY = 'tasks-data';

export function useTasks() {
    const { data, error, isLoading, mutate: mutateTasks } = useSWR<TaskListResponse>(
        TASKS_CACHE_KEY,
        () => tasksApi.getTasks(0, 100),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        }
    );

    const refresh = useCallback(() => {
        mutateTasks();
    }, [mutateTasks]);

    return {
        tasks: data?.tasks || [],
        total: data?.total || 0,
        isLoading,
        isError: error,
        refresh,
    };
}

export function useCreateTask() {
    return {
        mutateAsync: async (data: CreateTaskPayload) => {
            const newTask = await tasksApi.createTask(data);
            // Refresh the tasks list
            mutate(TASKS_CACHE_KEY);
            return newTask;
        },
    };
}

export function useUpdateTask() {
    return {
        mutateAsync: async ({ uuid, data }: { uuid: string; data: UpdateTaskPayload }) => {
            const updatedTask = await tasksApi.updateTask(uuid, data);
            // Refresh the tasks list
            mutate(TASKS_CACHE_KEY);
            return updatedTask;
        },
    };
}

export function useDeleteTask() {
    return {
        mutateAsync: async (uuid: string) => {
            const result = await tasksApi.deleteTask(uuid);
            // Refresh the tasks list
            mutate(TASKS_CACHE_KEY);
            return result;
        },
    };
}
