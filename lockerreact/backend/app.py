#Archivo modificado
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.loginRouter import router as login_router
from routes.lockerRouter import router as locker_router

load_dotenv()

app = FastAPI(
    title="API Backend con FastAPI y Supabase",
    description="API REST con FastAPI y Supabase - Incluye Locker Digital",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IMPORTANTE: El orden importa
app.include_router(locker_router, prefix="/api")
app.include_router(login_router, prefix="/api")

@app.get("/")
async def home():
    return {
        "message": "API Backend - Locker Digital",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    print(f"🚀 Servidor corriendo en http://localhost:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)