"""Tasks API."""
from fastapi import APIRouter, Depends

from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.tasks.schemas import (
    CreateTaskRequest,
    TaskListResponse,
    TaskOut,
    UpdateTaskRequest,
)
from app.modules.tasks.service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(current_user=Depends(get_current_user)):
    tasks = await TaskService.list_tasks()
    return TaskListResponse(tasks=tasks, total=len(tasks))


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: CreateTaskRequest,
    current_user=Depends(require_role(["ADMIN"])),
):
    return await TaskService.create_task(
        body.model_dump(),
        created_by_id=current_user.id,
        creator_name=current_user.name,
    )


@router.patch("/{uuid}", response_model=TaskOut)
async def update_task(
    uuid: str,
    body: UpdateTaskRequest,
    current_user=Depends(require_role(["ADMIN"])),
):
    return await TaskService.update_task(uuid, body.model_dump(exclude_none=True))


@router.delete("/{uuid}")
async def delete_task(uuid: str, current_user=Depends(require_role(["ADMIN"]))):
    return await TaskService.delete_task(uuid)
