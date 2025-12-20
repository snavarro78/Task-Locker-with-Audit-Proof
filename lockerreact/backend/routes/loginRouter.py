from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from pydantic import BaseModel
from models.database import db

# Crear un Router para las rutas
router = APIRouter()

# Modelo para el login
class LoginRequest(BaseModel):
    correo: str
    contraseña: str

# POST - Login de usuario
@router.post("/login")
async def login(credentials: LoginRequest):
    try:
        client = db.get_client()
        
        # Buscar usuario por correo y contraseña
        # NOTA: En producción deberías usar hash de passwords (bcrypt, etc)
        response = client.table("usuarios").select("*").eq("correo", credentials.correo).eq("contraseña", credentials.contraseña).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos"
            )
        
        user = response.data[0]
        
        # Retornar datos del usuario (sin la contraseña)
        user_data = {
            "user_id": user.get("user_id"),
            "nombre": user.get("nombre"),
            "correo": user.get("correo")
        }
        
        return {
            "success": True,
            "message": "Login exitoso",
            "user": user_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# GET - Obtener todos los registros de una tabla
@router.get("/{table_name}")
async def get_all(table_name: str):
    try:
        client = db.get_client()
        response = client.table(table_name).select("*").execute()
        return {
            "success": True,
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# GET - Obtener un registro por ID
@router.get("/{table_name}/{id}")
async def get_by_id(table_name: str, id: int):
    try:
        client = db.get_client()
        response = client.table(table_name).select("*").eq("id", id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro no encontrado"
            )
        
        return {
            "success": True,
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# POST - Crear un nuevo registro
@router.post("/{table_name}", status_code=status.HTTP_201_CREATED)
async def create(table_name: str, data: Dict[str, Any]):
    try:
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se proporcionaron datos"
            )
        
        client = db.get_client()
        response = client.table(table_name).insert(data).execute()
        
        return {
            "success": True,
            "data": response.data,
            "message": "Registro creado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# PUT - Actualizar un registro existente
@router.put("/{table_name}/{id}")
async def update(table_name: str, id: int, data: Dict[str, Any]):
    try:
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se proporcionaron datos"
            )
        
        client = db.get_client()
        response = client.table(table_name).update(data).eq("id", id).execute()
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro no encontrado"
            )
        
        return {
            "success": True,
            "data": response.data,
            "message": "Registro actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# DELETE - Eliminar un registro
@router.delete("/{table_name}/{id}")
async def delete(table_name: str, id: int):
    try:
        client = db.get_client()
        response = client.table(table_name).delete().eq("id", id).execute()
        
        return {
            "success": True,
            "message": "Registro eliminado exitosamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )