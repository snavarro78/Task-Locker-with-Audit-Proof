import React, { useState, useEffect } from 'react';
import { Lock, FileText, Shield, Search, RefreshCw, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const Locker = () => {
  const [ledger, setLedger] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    try {
      // Obtener user_id del localStorage
      const user_id = localStorage.getItem('user_id');
      
      // Construir URL con query param si existe user_id
      let url = `${API_URL}/api/ledger`;
      if (user_id) {
        url += `?user_id=${encodeURIComponent(user_id)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Error en la respuesta:', response.status);
        const errorText = await response.text();
        console.error('Detalle del error:', errorText);
        setLedger([]);
        return;
      }
      
      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      if (Array.isArray(data)) {
        setLedger(data);
      } else {
        console.error('Los datos no son un array:', data);
        setLedger([]);
      }
    } catch (error) {
      console.error('Error cargando ledger:', error);
      setLedger([]);
      alert('❌ Error al conectar con el servidor. ¿Está ejecutándose la API?');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Obtener user_id del localStorage
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
      alert('❌ Error: No se encontró user_id. Por favor inicia sesión nuevamente.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Enviar user_id como query parameter en la URL
      const response = await fetch(`${API_URL}/api/register-file?user_id=${encodeURIComponent(user_id)}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error desconocido');
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ "${file.name}" registrado con criptografía RSA + AES-256`);
        await loadLedger();
      } else {
        alert('❌ Error: ' + (data.detail || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al registrar archivo:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const validateChain = async () => {
    if (ledger.length === 0) {
      alert('⚠️ El ledger está vacío');
      return;
    }

    setLoading(true);
    try {
      const user_id = localStorage.getItem('user_id');
      
      // Enviar como query parameter
      let url = `${API_URL}/api/verify-chain`;
      if (user_id) {
        url += `?user_id=${encodeURIComponent(user_id)}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error desconocido');
      }
      
      const data = await response.json();

      const message = data.is_valid
        ? `✅ CADENA VÁLIDA\n\n${data.message}\n\n🌳 Raíz de Merkle:\n${data.merkle_root}\n\n📊 Total: ${data.total_blocks} bloques`
        : `❌ CADENA ALTERADA\n\n${data.message}\n\n🌳 Raíz de Merkle:\n${data.merkle_root}\n\n📊 Total: ${data.total_blocks} bloques`;

      alert(message);
    } catch (error) {
      alert('❌ Error al verificar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyBlock = async (index) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/verify-block/${index}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (!data.success) {
        alert('⚠️ ' + data.message);
        return;
      }

      const message = `📄 Archivo: ${data.block.archivo}
👤 User ID: ${data.block.user_id || 'No asignado'}

🔒 Hash almacenado:
${data.hash_stored}

🔒 Hash recalculado (tras descifrar):
${data.hash_recalc}

${data.hash_ok ? '✅' : '❌'} Hash: ${data.hash_ok ? 'CORRECTO' : 'INCORRECTO'}
${data.firma_ok ? '✅' : '❌'} Firma RSA: ${data.firma_ok ? 'VÁLIDA' : 'INVÁLIDA'}

${data.message}`;

      alert(message);
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLedger = async () => {
    if (!window.confirm('¿Eliminar todos los registros del ledger?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ledger`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ ' + data.message);
        await loadLedger();
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // 🆕 NUEVAS FUNCIONES PARA DESCARGAR
  const downloadPublicKey = () => {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
      alert('❌ Error: No se encontró el usuario. Por favor inicia sesión nuevamente.');
      return;
    }
    window.open(`${API_URL}/api/download-keys/${encodeURIComponent(user_id)}`, '_blank');
  };

  const downloadReport = () => {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
      alert('❌ Error: No se encontró el usuario. Por favor inicia sesión nuevamente.');
      return;
    }
    window.open(`${API_URL}/api/download-report/${encodeURIComponent(user_id)}`, '_blank');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #0d1b2a 25%, #1b263b 50%, #0d1b2a 75%, #0a0e27 100%)',
      color: '#e0f2fe',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 149, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 50%)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'linear-gradient(rgba(0, 149, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 149, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        pointerEvents: 'none'
      }}></div>

      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            textAlign: 'center'
          }}>
            <RefreshCw style={{ width: '3rem', height: '3rem', color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#7dd3fc' }}>Procesando...</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {!showAudit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Lock style={{ width: '3rem', height: '3rem', color: '#38bdf8', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))' }} />
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}>
                  🔐 LOCKER DIGITAL
                </h1>
              </div>
              <p style={{ color: '#bae6fd', maxWidth: '900px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
                Sistema con criptografía <strong>RSA 3072 bits</strong>, cifrado <strong>AES-256 GCM</strong>, 
                firmas digitales, blockchain y auditoría Merkle. Backend Python + FastAPI + Supabase.
              </p>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '8rem',
                border: '2px dashed rgba(56, 189, 248, 0.3)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'rgba(14, 165, 233, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)';
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)';
              }}>
                <Upload style={{ width: '2.5rem', height: '2.5rem', color: '#38bdf8', marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#7dd3fc' }}>
                  Seleccionar archivo para registrar
                </span>
                <span style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Se cifrará con AES-256 y se firmará con RSA
                </span>
                <input type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#38bdf8' }} />
                  Evidencias Registradas
                </h2>
                <span style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                }}>
                  {ledger.length} bloques
                </span>
              </div>

              <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
                {ledger.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#475569' }}>
                    <AlertCircle style={{ width: '3rem', height: '3rem', margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p>No hay evidencias registradas</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Array.isArray(ledger) && ledger.map((block, index) => (
                      <div key={index} style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(51, 65, 85, 0.6)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.6)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <FileText style={{ width: '1rem', height: '1rem', color: '#38bdf8' }} />
                              <span style={{ fontWeight: '600', color: '#e0f2fe' }}>{block.archivo}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                              <div>👤 User ID: {block.user_id || 'No asignado'} | 📦 {block.size || 0} bytes</div>
                              <div>🕐 {formatDate(block.timestamp)}</div>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                                🔒 {block.hash ? block.hash.substring(0, 32) + '...' : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <CheckCircle style={{ width: '1.5rem', height: '1.5rem', color: '#22c55e' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowAudit(true)} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                fontWeight: '600',
                padding: '1rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
              }}>
                <Search style={{ width: '1.25rem', height: '1.25rem' }} />
                Panel de Auditoría
              </button>
              <button onClick={loadLedger} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                color: 'white',
                fontWeight: '600',
                padding: '1rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)'
              }}>
                <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
                Actualizar
              </button>
            </div>

            {/* 🆕 NUEVOS BOTONES PARA DESCARGAR */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={downloadPublicKey} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                color: 'white',
                fontWeight: '600',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
              }}>
                🔑 Descargar Clave Pública
              </button>
              <button onClick={downloadReport} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                color: 'white',
                fontWeight: '600',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                📄 Descargar Reporte JSON
              </button>
            </div>

            {ledger.length > 0 && (
              <button onClick={clearLedger} style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                fontWeight: '600',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                Limpiar Ledger
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Shield style={{ width: '3rem', height: '3rem', color: '#22c55e', filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))' }} />
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #4ade80 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}>
                  Panel de Auditoría
                </h1>
              </div>
              <p style={{ color: '#bae6fd', maxWidth: '800px', margin: '0 auto' }}>
                Verifica integridad, calcula raíz de Merkle y valida cada bloque descifrando el archivo
              </p>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Bloques Registrados
              </h2>

              <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
                {ledger.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#475569' }}>
                    <p>El ledger está vacío</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Array.isArray(ledger) && ledger.map((block, index) => (
                      <div key={index} onClick={() => setSelectedBlock(index)} style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: selectedBlock === index ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(51, 65, 85, 0.6)',
                        background: selectedBlock === index ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          <div style={{ fontWeight: 'bold', color: '#22c55e' }}>#{index}</div>
                          <div style={{ color: '#e0f2fe' }}>📄 {block.archivo}</div>
                          <div style={{ color: '#94a3b8' }}>👤 User ID: {block.user_id || 'No asignado'}</div>
                          <div style={{ color: '#64748b' }}>🔒 {block.hash ? block.hash.substring(0, 16) + '...' : 'N/A'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={validateChain} style={{
                flex: 1,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                fontWeight: '600',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}>
                Validar Cadena
              </button>
              <button onClick={() => selectedBlock !== null && verifyBlock(selectedBlock)} disabled={selectedBlock === null} style={{
                flex: 1,
                background: selectedBlock === null ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #dc2626, #ef4444)',
                color: 'white',
                fontWeight: '600',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: selectedBlock === null ? 'not-allowed' : 'pointer',
                opacity: selectedBlock === null ? 0.5 : 1,
                fontSize: '1rem'
              }}>
                Verificar Bloque
              </button>
            </div>

            <button onClick={() => { setShowAudit(false); setSelectedBlock(null); }} style={{
              width: '100%',
              background: 'rgba(51, 65, 85, 0.5)',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              ← Volver
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Locker;