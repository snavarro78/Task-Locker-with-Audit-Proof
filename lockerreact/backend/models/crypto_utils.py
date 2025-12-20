#Archivo nuevo
"""
Utilidades criptográficas para el Locker Digital
Incluye: RSA, AES-256, firmas digitales y Merkle trees
"""

import hashlib
import os
import datetime
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Constantes
DEFAULT_OWNER = "estudiante"
LOCKER_DIR = "locker"
KEYS_DIR = "keys"  # Nueva carpeta para claves


def get_user_keys_dir(user_id: str) -> str:
    """Obtiene el directorio de claves para un usuario específico"""
    user_keys_path = os.path.join(KEYS_DIR, user_id)
    os.makedirs(user_keys_path, exist_ok=True)
    return user_keys_path


def generar_claves(user_id: str) -> tuple:
    """
    Genera un par de claves RSA 3072 bits para un usuario
    Retorna: (ruta_privada, ruta_publica)
    """
    user_keys_dir = get_user_keys_dir(user_id)
    
    priv_path = os.path.join(user_keys_dir, f"{user_id}_priv.pem")
    pub_path = os.path.join(user_keys_dir, f"{user_id}_pub.pem")
    
    # Si ya existen las claves, no generarlas de nuevo
    if os.path.exists(priv_path) and os.path.exists(pub_path):
        return priv_path, pub_path
    
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=3072
    )
    public_key = private_key.public_key()

    # Guardar clave privada
    with open(priv_path, "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=BestAvailableEncryption(b"clave-segura"),
            )
        )

    # Guardar clave pública
    with open(pub_path, "wb") as f:
        f.write(
            public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )
    
    return priv_path, pub_path


def obtener_rutas_claves(user_id: str) -> tuple:
    """
    Obtiene las rutas de las claves de un usuario, generándolas si no existen
    Retorna: (ruta_privada, ruta_publica)
    """
    return generar_claves(user_id)


def calcular_hash(data: bytes) -> str:
    """Calcula SHA-256 de los datos"""
    sha = hashlib.sha256()
    sha.update(data)
    return sha.hexdigest()


def firmar(hash_hex: str, priv_key_path: str) -> str:
    """Firma un hash con RSA"""
    with open(priv_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=b"clave-segura"
        )

    signature = private_key.sign(
        hash_hex.encode("utf8"),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return signature.hex()


def verificar(hash_hex: str, firma_hex: str, pub_key_path: str) -> bool:
    """Verifica una firma RSA"""
    with open(pub_key_path, "rb") as f:
        public_key = serialization.load_pem_public_key(f.read())

    try:
        public_key.verify(
            bytes.fromhex(firma_hex),
            hash_hex.encode("utf8"),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def cifrar_archivo_con_aes(data: bytes, pub_key_path: str):
    """
    Cifra un archivo con AES-256-GCM y cifra la clave AES con RSA
    Returns: (locker_filename, nonce_hex, aes_key_enc_hex)
    """
    # Generar clave AES aleatoria
    aes_key = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    
    # Cifrar contenido con AES
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, data, None)

    # Crear nombre único para el archivo cifrado
    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    locker_filename = f"{timestamp_str}_archivo.bin"

    # Guardar archivo cifrado
    os.makedirs(LOCKER_DIR, exist_ok=True)
    locker_path = os.path.join(LOCKER_DIR, locker_filename)
    with open(locker_path, "wb") as f:
        f.write(ciphertext)

    # Cifrar la clave AES con RSA
    with open(pub_key_path, "rb") as f:
        public_key = serialization.load_pem_public_key(f.read())

    aes_key_enc = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    return locker_filename, nonce.hex(), aes_key_enc.hex()


def descifrar_y_recalcular_hash(entrada: dict, priv_key_path: str, pub_key_path: str):
    """
    Descifra un archivo y recalcula su hash para verificación
    Returns: (hash_ok, firma_ok, hash_recalc)
    """
    if not all(k in entrada for k in ("locker_file", "aes_nonce", "aes_key_enc")):
        return False, False, None

    # Cargar clave privada RSA
    with open(priv_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=b"clave-segura"
        )

    # Descifrar la clave AES
    aes_key = private_key.decrypt(
        bytes.fromhex(entrada["aes_key_enc"]),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # Leer archivo cifrado
    nonce = bytes.fromhex(entrada["aes_nonce"])
    locker_path = os.path.join(LOCKER_DIR, entrada["locker_file"])
    
    if not os.path.exists(locker_path):
        return False, False, None
        
    with open(locker_path, "rb") as f:
        ciphertext = f.read()

    # Descifrar contenido
    aesgcm = AESGCM(aes_key)
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception:
        return False, False, None

    # Recalcular hash
    hash_recalc = calcular_hash(plaintext)
    
    # Verificar hash
    hash_ok = (hash_recalc == entrada.get("hash"))
    
    # Verificar firma
    firma_ok = verificar(entrada.get("hash"), entrada.get("firma"), pub_key_path)

    return hash_ok, firma_ok, hash_recalc


def merkle_root(hashes: list[str]) -> str | None:
    """Calcula la raíz del árbol de Merkle"""
    if not hashes:
        return None

    nivel = hashes[:]
    while len(nivel) > 1:
        siguiente = []
        for i in range(0, len(nivel), 2):
            izquierda = nivel[i]
            derecha = nivel[i + 1] if i + 1 < len(nivel) else izquierda
            combinado = (izquierda + derecha).encode("utf8")
            siguiente.append(hashlib.sha256(combinado).hexdigest())
        nivel = siguiente

    return nivel[0]