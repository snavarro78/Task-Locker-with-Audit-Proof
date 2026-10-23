import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class Database:
    _instance = None
    _client: Client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Inicializa la conexión con Supabase"""
        try:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")
            
            if not url or not key:
                raise ValueError("SUPABASE_URL y SUPABASE_KEY deben estar definidas en el archivo .env")
            
            self._client = create_client(url, key)
            print("✅ Conexión exitosa con Supabase")
        except Exception as e:
            print(f"❌ Error al conectar con Supabase: {str(e)}")
            raise
    
    def get_client(self) -> Client:
        """Retorna el cliente de Supabase"""
        return self._client

# Instancia singleton de la base de datos
db = Database()