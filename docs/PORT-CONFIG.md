# ⚙️ Configuración del Puerto - IMPORTANTE

## 🔴 CAMBIO CRÍTICO

El puerto **SOLO** se lee del archivo `.env` - **NO hay valores por defecto**.

### ✅ Configuración Correcta

1. **Crear archivo `.env`** (si no existe):
```bash
cp .env.example .env
```

2. **Editar `.env` y configurar el puerto**:
```env
PORT=3001
```

3. **Verificar configuración**:
```bash
node check-server.js
```

4. **Iniciar el servidor**:
```bash
npm run start:safe
```

---

## 📋 Archivos Modificados

### 1. **src/config.js**
```javascript
// ❌ ANTES (con fallback)
port: process.env.PORT || 3001

// ✅ AHORA (sin fallback)
port: process.env.PORT  // Must be set in .env

// Validación agregada:
if (!config.port) {
    console.error('❌ PORT is not set in .env!');
    process.exit(1);
}
```

### 2. **ecosystem.config.js**
```javascript
// ❌ ANTES (hardcoded)
env: {
  NODE_ENV: 'production',
  PORT: 3001  // ← Hardcoded
}

// ✅ AHORA (lee del .env)
env: {
  NODE_ENV: 'production'
  // PORT se hereda del .env del sistema
}
```

### 3. **start-safe.js**
```javascript
// ❌ ANTES
const PORT = process.env.PORT || 3001;

// ✅ AHORA
require('dotenv').config();
const PORT = process.env.PORT;

if (!PORT) {
    console.error('❌ PORT is not set in .env!');
    process.exit(1);
}
```

### 4. **kill-port.js**
```javascript
// ❌ ANTES
const port = process.argv[2] || process.env.PORT || 3001;

// ✅ AHORA
if (!process.argv[2]) {
    require('dotenv').config();
}
const port = process.argv[2] || process.env.PORT;

if (!port) {
    console.error('❌ No port specified!');
    process.exit(1);
}
```

---

## 🚀 Comandos Actualizados

### Desarrollo Local
```bash
# Setup inicial (solo una vez)
./setup.sh          # Linux/Mac
setup.bat           # Windows

# Iniciar servidor
npm run start:safe  # Recomendado (mata conflictos de puerto)
npm start           # Estándar

# Matar puerto manualmente
npm run kill-port        # Usa PORT del .env
npm run kill-port 3001   # Puerto específico
```

### Producción con PM2
```bash
# Asegúrate de tener .env configurado
cat .env | grep PORT

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## ⚠️ Errores Comunes

### Error 1: "PORT is not set in environment variables!"
```
❌ CRITICAL ERROR: PORT is not set in environment variables!
Please set PORT in your .env file (e.g., PORT=3001)
```

**Solución:**
```bash
echo "PORT=3001" >> .env
```

### Error 2: "EADDRINUSE: address already in use"
```
❌ ERROR: Port 3001 is already in use!
```

**Solución:**
```bash
npm run kill-port 3001
# O
npm run start:safe  # Auto-resuelve el conflicto
```

### Error 3: ".env file not found"
```
⚠️ .env file not found!
```

**Solución:**
```bash
cp .env.example .env
# Editar .env con tus valores
```

---

## 🔍 Verificación

### 1. Verificar que PORT está en .env
```bash
cat .env | grep PORT
# Debe mostrar: PORT=3001
```

### 2. Verificar que el servidor lee el puerto correctamente
```bash
node check-server.js
# Debe mostrar: PORT: SET ✓
```

### 3. Verificar que no hay puertos hardcodeados
```bash
grep -r "PORT.*3001" src/
# No debe encontrar nada (excepto en comentarios)
```

---

## 📝 Checklist de Migración

Si estás actualizando desde la versión anterior:

- [ ] Backup del código actual
- [ ] Actualizar todos los archivos modificados
- [ ] Verificar que `.env` existe y tiene `PORT=3001`
- [ ] Ejecutar `node check-server.js`
- [ ] Matar procesos anteriores: `npm run kill-port`
- [ ] Reiniciar con `npm run start:safe`
- [ ] Verificar que el servidor arranca en el puerto correcto
- [ ] Si usas PM2, actualizar con `pm2 restart publicidad`

---

## 🎯 Beneficios de este Cambio

1. **✅ Un solo lugar de configuración** - Solo `.env`
2. **✅ No hay puertos hardcodeados** - Fácil de cambiar
3. **✅ Validación estricta** - Falla rápido si falta configuración
4. **✅ Consistencia** - Mismo comportamiento en todos los scripts
5. **✅ Compatible con contenedores** - Puede pasar PORT como variable de entorno
6. **✅ Documentación clara** - Errores descriptivos

---

## 📞 Soporte

Si tienes problemas:

1. Ejecuta `node check-server.js` y revisa la salida
2. Verifica que `.env` existe: `ls -la .env`
3. Verifica el contenido: `cat .env`
4. Revisa los logs: `pm2 logs publicidad` (si usas PM2)

Para más información, consulta [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
