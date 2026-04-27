# 🔐 Hashlog — Locker Digital con Cadena de Integridad

> Plataforma web para custodia segura de archivos académicos. Cifra, firma y registra cada documento en un **ledger inmutable estilo blockchain** con verificación criptográfica de integridad mediante árboles de Merkle.

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow) ![Python](https://img.shields.io/badge/python-3.12+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-5-646cff) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E) ![Crypto](https://img.shields.io/badge/RSA--3072%20%2B%20AES--256-GCM-red)

---

## 🎓 Información académica

| | |
|---|---|
| **Universidad** | Universidad Latinoamericana de Ciencia y Tecnología (ULACIT) |
| **Carrera** | Ingeniería Informática |
| **Curso** | _[Nombre del curso]_ |
| **Profesor** | _[Nombre del profesor/a]_ |
| **Período** | 2026 — I cuatrimestre |
| **Tipo de entrega** | _[Proyecto final / integrador]_ |

### 👥 Equipo de desarrollo

| Nombre |
|---|
| Óscar David Charpentier Zúñiga |
| Sebastián Navarro Ortiz |
| Sebastián Herrera Rodríguez |
| Tomás Angulo Cordero |
| Ian Herrera Álvarez |

---

## 📋 Tabla de contenidos

- [Información académica](#-información-académica)
- [Resumen del proyecto](#-resumen-del-proyecto)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Modelo criptográfico](#-modelo-criptográfico)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración de la base de datos](#-configuración-de-la-base-de-datos)
- [Cómo ejecutar](#-cómo-ejecutar)
- [API endpoints](#-api-endpoints)
- [Variables de entorno](#-variables-de-entorno)
- [Solución de problemas](#-solución-de-problemas)

---

## 📖 Resumen del proyecto

**Hashlog** es una herramienta diseñada para combatir el plagio académico mediante la **custodia criptográfica verificable** de trabajos. Cada vez que un estudiante sube un documento, el sistema:

1. Calcula el **hash SHA-256** del archivo
2. Lo **firma digitalmente** con la clave privada RSA del usuario
3. **Cifra el archivo completo** con AES-256-GCM (clave aleatoria por archivo)
4. La clave AES se cifra con la clave pública RSA del usuario (cifrado híbrido)
5. Registra todo en un **ledger encadenado** (cada bloque referencia el `block_hash` del anterior)
6. Permite **verificar la integridad** de cualquier bloque y de toda la cadena con árboles de Merkle

El resultado: si alguien presenta un trabajo como propio, se puede demostrar **cuándo se subió originalmente** y por **quién**, con garantías matemáticas de que el archivo no ha sido alterado desde su registro.

---

## ✨ Características

### Autenticación de usuarios
- Registro y login con validación de email
- Persistencia de sesión en `localStorage`
- Cada usuario tiene su propio par de claves RSA

### Locker (custodia de archivos)
- Subida de archivos con cifrado automático
- Cada archivo queda **cifrado en disco** (no se almacena en texto plano)
- La clave de cifrado es única por archivo y queda protegida con RSA

### Ledger inmutable
- Cada archivo registrado genera un **bloque** con:
  - Hash del contenido (SHA-256)
  - Firma digital del hash
  - Timestamp UTC
  - Referencia al bloque anterior (`hash_prev`)
  - Hash del bloque actual (`block_hash`)
- Cualquier modificación en un bloque rompe la cadena de hashes

### Verificación de integridad
- **Verificar bloque individual**: descifra el archivo, recalcula su hash y compara con el almacenado
- **Verificar cadena completa**: recorre todos los bloques validando que cada `hash_prev` coincida con el `block_hash` del anterior
- **Cálculo de raíz Merkle**: huella criptográfica única de toda la cadena

### Reportes
- Descarga del reporte JSON completo con todos los archivos del usuario
- Descarga de la clave pública RSA del usuario (para auditoría externa)

---

## 🏗 Arquitectura

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Frontend       │  HTTPS  │    Backend       │  HTTPS  │    Supabase      │
│  React + Vite    │ ──────► │   FastAPI        │ ──────► │   PostgreSQL     │
│  React Router    │  REST   │                  │  REST   │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
       │                              │                            │
       │  - Hero / Landing            │  - JWT-style sessions      │  Tablas:
       │  - Register / Login          │  - Cifrado RSA + AES       │  - usuarios
       │  - Locker (upload + ledger)  │  - Firmas digitales        │  - ledger_entries
       │                              │  - Merkle tree             │
       │                              │                            │
       │                              ▼                            │
       │                     ┌──────────────────┐                  │
       │                     │  /locker/        │                  │
       │                     │  archivos        │                  │
       │                     │  cifrados (.bin) │                  │
       │                     │                  │                  │
       │                     │  /keys/{user_id}/│                  │
       │                     │  - priv.pem      │                  │
       │                     │  - pub.pem       │                  │
       │                     └──────────────────┘                  │
```

---

## 🔐 Modelo criptográfico

### Claves por usuario
- **Algoritmo**: RSA 3072 bits
- **Clave privada**: cifrada con passphrase (`PKCS8` + `BestAvailableEncryption`)
- **Clave pública**: en formato `SubjectPublicKeyInfo` PEM
- **Almacenamiento**: `keys/{user_id}/{user_id}_priv.pem` y `_pub.pem`

### Cifrado de archivos (esquema híbrido)
1. Se genera una clave AES-256 aleatoria por archivo
2. Se cifra el archivo con **AES-256-GCM** (autenticated encryption)
3. La clave AES se cifra con la **clave pública RSA** del usuario (`OAEP` + `SHA-256`)
4. Solo el dueño puede descifrar (con su clave privada)

### Firma digital
- Algoritmo: **RSA-PSS** con `SHA-256` y salt máximo
- Se firma el hash hexadecimal del contenido
- La verificación devuelve `True`/`False` sin lanzar excepciones

### Ledger encadenado
Cada bloque contiene:

```python
{
    "archivo": "tarea1.pdf",
    "hash": "<sha256 del contenido>",
    "firma": "<firma RSA-PSS del hash>",
    "timestamp": "2026-04-25T18:30:00Z",
    "hash_prev": "<block_hash del bloque anterior>",
    "block_hash": "<sha256(archivo + hash + firma + hash_prev)>",
    "user_id": "<uuid>",
    "locker_file": "20260425183000_archivo.bin",
    "aes_nonce": "<12 bytes hex>",
    "aes_key_enc": "<aes_key cifrada con RSA, hex>",
    "size": 12345,
    "content_type": "application/pdf"
}
```

### Árbol de Merkle
La función `merkle_root(hashes)` agrupa todos los hashes de archivos del usuario y produce una **raíz** que cambia si cualquier archivo es modificado. Útil para publicar una "huella" pública de toda la cadena sin exponer su contenido.

---

## 🛠 Stack tecnológico

### Backend
- **Python 3.12+**
- **FastAPI** — framework web asíncrono
- **Pydantic** — validación de datos
- **cryptography** — librería de cifrado (RSA, AES-GCM, hashes, firmas)
- **supabase-py** — cliente PostgreSQL via REST
- **uvicorn** — servidor ASGI
- **python-dotenv** — variables de entorno

### Frontend
- **React 18** — librería de UI
- **Vite 5** — build tool
- **React Router DOM** — ruteo SPA
- **TailwindCSS** — utilities CSS
- CSS custom para los componentes principales (Hero, Locker, Register)

### Base de datos
- **PostgreSQL** vía **Supabase**
- Tablas: `usuarios`, `ledger_entries`

### Almacenamiento local del backend
- `locker/` — archivos cifrados (.bin)
- `keys/{user_id}/` — pares de claves RSA por usuario

---

## 📁 Estructura del proyecto

```
hashlog/
├── backend/
│   ├── app.py                    # Punto de entrada FastAPI
│   ├── requirements.txt
│   ├── .env                      # ⚠️ NO subir a Git
│   ├── models/
│   │   ├── database.py           # Singleton de cliente Supabase
│   │   └── crypto_utils.py       # RSA, AES, firmas, Merkle
│   ├── routes/
│   │   ├── loginRouter.py        # Login + CRUD genérico
│   │   └── lockerRouter.py       # Locker, ledger, verificación
│   ├── locker/                   # Archivos cifrados (gitignored)
│   └── keys/                     # Claves RSA por usuario (gitignored)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── Logo.png
│   └── src/
│       ├── main.jsx              # Entry point con BrowserRouter
│       ├── App.jsx               # Definición de rutas
│       ├── App.css
│       ├── index.css             # TailwindCSS
│       ├── Pages/
│       │   ├── Hero.jsx          # Landing
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Locker.jsx        # Upload + ledger + verificación
│       └── styles/
│           ├── Hero.css
│           ├── Locker.css
│           └── Register.css
│
└── README.md
```

---

## 📦 Requisitos previos

- **Python 3.12 o 3.13** (no 3.14 — issues con `httpx` en Windows)
- **Node.js 20+** y **npm**
- **Cuenta de Supabase** con proyecto creado
- **Navegador moderno** (Chrome, Edge, Firefox)

---

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/snavarro78/hashlog.git
cd hashlog
```

### 2. Configurar el backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar el entorno
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

Si no tenés `requirements.txt`, las dependencias mínimas son:

```bash
pip install fastapi uvicorn supabase python-dotenv cryptography python-multipart pydantic[email]
```

### 3. Configurar el frontend

```bash
cd ../frontend
npm install
```

### 4. Variables de entorno del backend

Crear archivo `backend/.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_o_service_key_aqui
PORT=8000
```

> ⚠️ **Nunca subas `.env` a Git.** Asegurate de tener `.env` en `.gitignore`.

---

## 🗄 Configuración de la base de datos

En el SQL Editor de Supabase, corré:

```sql
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  contraseña TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla del ledger
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo TEXT NOT NULL,
  hash TEXT NOT NULL,
  firma TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  hash_prev TEXT,
  block_hash TEXT NOT NULL,
  user_id UUID REFERENCES usuarios(user_id),
  locker_file TEXT,
  aes_nonce TEXT,
  aes_key_enc TEXT,
  size INTEGER,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_ledger_user_timestamp
  ON ledger_entries(user_id, timestamp);
```

> 🔒 **Nota de seguridad académica:** este proyecto guarda contraseñas en texto plano por simplicidad pedagógica. En producción se debe usar **bcrypt** o **argon2** para hashear las contraseñas antes de guardarlas.

---

## 🚀 Cómo ejecutar

### Backend

```bash
cd backend
venv\Scripts\activate    # Windows
python app.py
```

O alternativamente:

```bash
uvicorn app:app --reload --port 8000
```

Disponible en `http://localhost:8000`. Documentación Swagger en `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm run dev
```

Disponible en `http://localhost:5173`.

---

## 🌐 API endpoints

### Autenticación (`/api`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/login` | Inicia sesión con `correo` y `contraseña` |
| `GET` | `/api/{table_name}` | Lista todos los registros de una tabla |
| `GET` | `/api/{table_name}/{id}` | Obtiene un registro por ID |
| `POST` | `/api/{table_name}` | Crea un registro genérico |
| `PUT` | `/api/{table_name}/{id}` | Actualiza un registro |
| `DELETE` | `/api/{table_name}/{id}` | Elimina un registro |

### Locker y Ledger (`/api`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/ledger?user_id=...` | Lista bloques del ledger del usuario |
| `POST` | `/api/register-file?user_id=...` | Sube y registra un archivo (multipart) |
| `POST` | `/api/verify-chain?user_id=...` | Valida integridad de toda la cadena + Merkle root |
| `POST` | `/api/verify-block/{index}` | Verifica un bloque específico (descifra y recalcula hash) |
| `DELETE` | `/api/ledger` | Limpia todo el ledger (peligroso) |
| `GET` | `/api/download-keys/{user_id}` | Descarga la clave pública RSA del usuario |
| `GET` | `/api/download-report/{user_id}` | Genera y descarga reporte JSON completo |
| `GET` | `/api/ledger-test` | Health check del router |

Documentación interactiva completa: `http://localhost:8000/docs`

---

## 🔐 Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `SUPABASE_KEY` | API key de Supabase | ✅ |
| `PORT` | Puerto del backend (default 8000) | ❌ |

---

## 🧰 Solución de problemas

### El frontend no se conecta al backend (CORS)
Verificá que el backend esté corriendo en `http://localhost:8000` y que el frontend apunte a esa URL en `Login.jsx`. El backend ya tiene CORS habilitado para todos los orígenes.

### "Error al conectar con Supabase"
Confirmá que tu archivo `.env` tenga `SUPABASE_URL` y `SUPABASE_KEY` correctos, y que el archivo esté en `backend/`, no en la raíz.

### Conflicto de rutas en el router
El `loginRouter` tiene rutas genéricas `/{table_name}` que pueden capturar cualquier path. Por eso en `app.py` se incluye **primero** el `locker_router` y después el `login_router`. No cambies ese orden.

### Las claves RSA se regeneran cada vez
La función `generar_claves()` ya verifica si las claves del usuario existen antes de crear nuevas. Si las regenera siempre, revisá los permisos de la carpeta `keys/`.

### La cadena se rompe después de borrar manualmente un bloque
Es lo esperado — el `hash_prev` del siguiente bloque ya no coincide. Eso es **la prueba de que el sistema funciona**: cualquier alteración en la BD se detecta en la verificación.

### `WinError 10035` en Python 3.14 + Windows
Bug conocido de `httpx` con HTTP/2. Bajá a Python 3.12 o 3.13.

### Recomendaciones para producción

- Hashear contraseñas con `bcrypt`
- No exponer `clear-ledger` en producción (eliminarlo o protegerlo con auth de admin)
- Restringir CORS a dominios específicos (no `*`)
- Mover las claves RSA fuera del filesystem (HSM, AWS KMS, etc.)
- Añadir rate limiting en endpoints de subida y login

---

## 📸 Capturas

> _Agregar capturas en `docs/img/`:_
>
> ```markdown
> ![Hero](docs/img/hero.png)
> ![Register](docs/img/register.png)
> ![Locker](docs/img/locker.png)
> ```

---

## 📄 Licencia

Proyecto desarrollado con fines **académicos** en la **Universidad Latinoamericana de Ciencia y Tecnología (ULACIT)** durante el I cuatrimestre de 2026. No tiene fines comerciales.

---

## 🙏 Reconocimientos

- **Profesor _[Nombre del profesor/a]_** — por la guía durante el desarrollo del proyecto
- [`cryptography`](https://cryptography.io/) — librería oficial de criptografía para Python
- [FastAPI](https://fastapi.tiangolo.com/) — framework web
- [Supabase](https://supabase.com/) — backend-as-a-service
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — frontend
- Concepto inspirado en blockchain ligero y árboles de Merkle (Bitcoin / Ethereum / IPFS)
