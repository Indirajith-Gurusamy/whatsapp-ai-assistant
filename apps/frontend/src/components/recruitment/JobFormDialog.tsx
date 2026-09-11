'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { JobFormContents } from '@/components/recruitment/JobFormContents';
import type { JobItem } from '@/lib/recruitment';

interface JobFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    job: JobItem | null;
    onSaved?: () => void;
}

export function JobFormDialog({ open, onOpenChange, job, onSaved }: JobFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)]">
                <DialogHeader>
                    <DialogTitle>{job ? 'Edit Job' : 'New Job'}</DialogTitle>
                    <DialogDescription>
                        {job ? 'Update the job details.' : 'Create a job and start receiving candidates.'}
                    </DialogDescription>
                </DialogHeader>
                <JobFormContents
                    job={job}
                    onCancel={() => onOpenChange(false)}
                    onSaved={() => {
                        onOpenChange(false);
                        onSaved?.();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}