"""Clients API."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.modules.auth.dependencies import get_current_user
from app.modules.clients.schemas import (
    ClientListResponse,
    ClientOut,
    CreateClientRequest,
    UpdateClientRequest,
)
from app.modules.clients.service import ClientService

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    search: Optional[str] = None,
    archived: Optional[bool] = None,
    current_user=Depends(get_current_user),
):
    result = await ClientService.list_clients(search=search, archived=archived)
    return ClientListResponse(clients=result["clients"], total=result["total"])


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(body: CreateClientRequest, current_user=Depends(get_current_user)):
    return await ClientService.create_client(body.model_dump())


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: int, current_user=Depends(get_current_user)):
    return await ClientService.get_client(client_id)


@router.put("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: int,
    body: UpdateClientRequest,
    current_user=Depends(get_current_user),
):
    return await ClientService.update_client(client_id, body.model_dump(exclude_none=True))


@router.delete("/{client_id}")
async def delete_client(client_id: int, current_user=Depends(get_current_user)):
    return await ClientService.delete_client(client_id)