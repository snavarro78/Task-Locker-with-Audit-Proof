#archivo nuevo
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from typing import Dict, Any
from models.database import db
from models.crypto_utils import (
    calcular_hash,
    obtener_rutas_claves,
    firmar,
    verificar,
    cifrar_archivo_con_aes,
    descifrar_y_recalcular_hash,
    merkle_root
)
import datetime
import os
import json

# Crear un Router para las rutas del locker
router = APIRouter()

LOCKER_DIR = "locker"

def asegurar_locker():
    """Crea el directorio locker si no existe"""
    os.makedirs(LOCKER_DIR, exist_ok=True)


# Endpoint de prueba para verificar que el router funciona
@router.get("/ledger-test")
async def test_ledger():
    """Endpoint de prueba simple"""
    return {"status": "ok", "message": "El router del locker funciona"}


@router.get("/ledger")
async def get_ledger(user_id: str = None):
    """Obtiene todos los bloques del ledger desde Supabase filtrados por usuario"""
    print("=== Iniciando get_ledger ===")
    print(f"user_id recibido: {user_id}")
    try:
        print("Obteniendo cliente de DB...")
        client = db.get_client()
        print(f"Cliente obtenido: {client}")
        
        print("Ejecutando query a ledger_entries...")
        
        # Filtrar por user_id si se proporciona
        if user_id:
            response = client.table("ledger_entries").select("*").eq("user_id", user_id).order("timestamp", desc=False).execute()
        else:
            response = client.table("ledger_entries").select("*").order("timestamp", desc=False).execute()
            
        print(f"Response: {response}")
        
        # Si no hay datos, devolver array vacío
        if not response.data:
            print("No hay datos, devolviendo array vacío")
            return []
        
        print(f"Datos obtenidos: {len(response.data)} registros")
        return response.data
    except Exception as e:
        # Imprimir el error completo en consola para debugging
        print(f"❌ Error en get_ledger: {str(e)}")
        print(f"Tipo de error: {type(e).__name__}")
        import traceback
        print("Traceback completo:")
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener ledger: {str(e)}"
        )


@router.post("/register-file")
async def register_file(file: UploadFile = File(...), user_id: str = None):
    """Registra un nuevo archivo en el ledger"""
    try:
        # Validar que se proporcione user_id
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id es requerido"
            )
        
        # Leer contenido del archivo
        content = await file.read()
        
        # Calcular hash del contenido
        file_hash = calcular_hash(content)
        
        # Obtener o generar claves para este usuario
        priv_path, pub_path = obtener_rutas_claves(user_id)
        
        # Firmar el hash
        firma = firmar(file_hash, priv_path)
        
        # Cifrar archivo con AES
        locker_file, nonce_hex, aes_key_enc_hex = cifrar_archivo_con_aes(content, pub_path)
        
        # Obtener el último bloque para hash_prev (del mismo usuario)
        client = db.get_client()
        last_block = client.table("ledger_entries").select("block_hash").eq("user_id", user_id).order("timestamp", desc=True).limit(1).execute()
        
        hash_prev = last_block.data[0]["block_hash"] if last_block.data else None
        
        # Calcular el block_hash (hash del bloque completo)
        block_data = f"{file.filename}{file_hash}{firma}{hash_prev}".encode()
        block_hash = calcular_hash(block_data)
        
        # Timestamp actual
        timestamp = datetime.datetime.utcnow().isoformat()
        
        # Crear nuevo bloque en Supabase
        nuevo_bloque = {
            "archivo": file.filename,
            "hash": file_hash,
            "firma": firma,
            "timestamp": timestamp,
            "hash_prev": hash_prev,
            "block_hash": block_hash,
            "user_id": user_id,  # Asignar el user_id recibido
            "locker_file": locker_file,
            "aes_nonce": nonce_hex,
            "aes_key_enc": aes_key_enc_hex,
            "size": len(content),
            "content_type": file.content_type or "unknown"
        }
        
        response = client.table("ledger_entries").insert(nuevo_bloque).execute()
        
        return {
            "success": True,
            "message": "Archivo registrado correctamente",
            "block": response.data[0] if response.data else nuevo_bloque
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/verify-chain")
async def verify_chain(user_id: str = None):
    """Verifica la integridad de toda la cadena y calcula Merkle root"""
    try:
        client = db.get_client()
        
        # Filtrar por user_id si se proporciona
        if user_id:
            response = client.table("ledger_entries").select("*").eq("user_id", user_id).order("timestamp").execute()
        else:
            response = client.table("ledger_entries").select("*").order("timestamp").execute()
            
        ledger = response.data
        
        if not ledger:
            return {
                "success": False,
                "message": "El ledger está vacío",
                "total_blocks": 0,
                "merkle_root": None,
                "is_valid": False
            }
        
        # Verificar la cadena
        is_valid = True
        for i in range(1, len(ledger)):
            if ledger[i]["hash_prev"] != ledger[i - 1]["block_hash"]:
                is_valid = False
                break
        
        # Calcular Merkle root
        hashes = [b["hash"] for b in ledger]
        root = merkle_root(hashes)
        
        return {
            "success": True,
            "is_valid": is_valid,
            "merkle_root": root,
            "total_blocks": len(ledger),
            "message": "Cadena verificada correctamente" if is_valid else "Se detectó alteración en la cadena"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/verify-block/{index}")
async def verify_block(index: int):
    """Verifica un bloque específico"""
    try:
        client = db.get_client()
        response = client.table("ledger_entries").select("*").order("timestamp").execute()
        ledger = response.data
        
        if index < 0 or index >= len(ledger):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Índice de bloque inválido"
            )
        
        entrada = ledger[index]
        
        # Obtener las claves del usuario que subió el archivo
        user_id_block = entrada.get("user_id")
        if not user_id_block:
            return {
                "success": False,
                "message": "Bloque sin user_id asociado"
            }
        
        priv_path, pub_path = obtener_rutas_claves(user_id_block)
        
        # Verificar que el bloque tenga información de cifrado
        if not all(k in entrada for k in ("locker_file", "aes_nonce", "aes_key_enc")):
            return {
                "success": False,
                "message": "Bloque sin información de cifrado"
            }
        
        hash_ok, firma_ok, hash_recalc = descifrar_y_recalcular_hash(
            entrada, priv_path, pub_path
        )
        
        if hash_recalc is None:
            return {
                "success": False,
                "message": "Error al descifrar el archivo"
            }
        
        return {
            "success": True,
            "hash_ok": hash_ok,
            "firma_ok": firma_ok,
            "hash_stored": entrada["hash"],
            "hash_recalc": hash_recalc,
            "block": entrada,
            "message": "Bloque verificado correctamente" if (hash_ok and firma_ok) else "Problemas de integridad detectados"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/ledger")
async def clear_ledger():
    """Limpia todo el ledger"""
    try:
        client = db.get_client()
        
        # Eliminar todos los registros
        # Como usa UUID, necesitamos una condición que siempre sea verdadera
        response = client.table("ledger_entries").delete().not_.is_("id", "null").execute()
        
        return {
            "success": True,
            "message": "Ledger limpiado correctamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/download-keys/{user_id}")
async def download_keys(user_id: str):
    """Permite descargar las claves públicas del usuario"""
    try:
        priv_path, pub_path = obtener_rutas_claves(user_id)
        
        # Solo permitir descargar la clave pública por seguridad
        if not os.path.exists(pub_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Claves no encontradas"
            )
        
        return FileResponse(
            pub_path,
            media_type="application/x-pem-file",
            filename=f"{user_id}_public_key.pem"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/download-report/{user_id}")
async def download_report(user_id: str):
    """Genera y descarga un reporte JSON con todos los archivos del usuario"""
    try:
        client = db.get_client()
        response = client.table("ledger_entries").select("*").eq("user_id", user_id).order("timestamp").execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay archivos registrados para este usuario"
            )
        
        # Crear reporte
        reporte = {
            "user_id": user_id,
            "fecha_generacion": datetime.datetime.utcnow().isoformat() + "Z",
            "total_archivos": len(response.data),
            "archivos": []
        }
        
        for block in response.data:
            reporte["archivos"].append({
                "archivo": block["archivo"],
                "hash": block["hash"],
                "firma": block["firma"],
                "timestamp": block["timestamp"],
                "hash_prev": block["hash_prev"],
                "block_hash": block["block_hash"],
                "size": block.get("size", 0),
                "content_type": block.get("content_type", "unknown")
            })
        
        # Guardar temporalmente
        report_path = f"temp_report_{user_id}.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(reporte, f, indent=4, ensure_ascii=False)
        
        # Devolver archivo y eliminarlo después
        response = FileResponse(
            report_path,
            media_type="application/json",
            filename=f"locker_report_{user_id}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
        # Programar eliminación del archivo temporal
        import atexit
        atexit.register(lambda: os.remove(report_path) if os.path.exists(report_path) else None)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )