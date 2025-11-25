# Deployment Guide - Sistema de Publicidad

Este documento describe cómo desplegar la aplicación en Render.com.

## Requisitos Previos

- Cuenta en Render.com (free tier disponible)
- Repositorio en GitHub
- AWS S3 bucket con permisos configurados
- IAM user en AWS con credenciales de acceso

## Pasos de Despliegue

### 1. Preparar el repositorio en GitHub

```bash
# Clonar el repositorio localmente (si no lo tienes)
git clone https://github.com/tu-usuario/publicidad-display.git
cd publicidad-display

# Asegurate de que .env está en .gitignore (no debe commitearse)
echo ".env" >> .gitignore

# Hacer commit y push
git add .
git commit -m "Initial commit: production-ready setup"
git push origin main
```

### 2. Conectar a Render.com

1. **Crear nuevo Web Service en Render.com:**
   - Ve a https://dashboard.render.com/
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio GitHub
   - Selecciona el repositorio `publicidad-display`

2. **Configurar el servicio:**
   - **Name:** `publicidad-display`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (o Pro si necesitas more resources)

3. **Configurar Variables de Entorno:**
   En la sección "Environment", agrega estas variables:

   ```
   NODE_ENV=production
   PORT=3000
   S3_BUCKET=restaurante-joaos
   S3_REGION=us-east-1
   S3_PUBLIC=false
   S3_SIGNED_EXPIRES=3600
   AWS_ACCESS_KEY_ID=AKIAWUJDAZ2B4LO53MQM
   AWS_SECRET_ACCESS_KEY=<tu-secret-key>
   DEBUG=false
   ```

   ⚠️ **IMPORTANTE:** Usa variables de entorno para las credenciales. NO las hagas públicas.

### 3. Desplegar

Una vez guardadas las variables de entorno:
- Render.com automáticamente deployará la aplicación
- La URL será: `https://publicidad-display.onrender.com`
- En cada push a GitHub, Render redeploy automáticamente

### 4. Configuración de Dominio Personalizado (Opcional)

Si tienes un dominio personalizado:

1. Ve a "Settings" en el dashboard de Render
2. Scroll a "Custom Domains"
3. Agrega tu dominio (ej: `publicidad.tudominio.com`)
4. Sigue las instrucciones de DNS

## Troubleshooting

### La aplicación no carga media

1. Verifica que las credenciales AWS en `.env` sean correctas
2. Chequea que el bucket S3 existe y tiene los permisos correctos
3. Mira los logs en Render.com → "Logs"

### Error: "Access Denied" desde S3

Este error significa que el IAM user no tiene permisos. Asegurate que tiene:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::restaurante-joaos"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::restaurante-joaos/*"
    }
  ]
}
```

### Port binding error

Render asigna automáticamente un puerto. La app detecta `process.env.PORT`.
Si ves errores de puerto, verifica que no estés hard-codeando el puerto en el código.

## Monitoreo

En Render.com Dashboard:
- **Logs:** Ver logs en tiempo real
- **Metrics:** CPU, memoria, requests
- **Deploys:** Historial de deployments

## Desarrollo Local

Para probar localmente antes de deployar:

```bash
# Copiar .env.example a .env y llenar las variables
cp .env.example .env

# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Aplicación disponible en http://localhost:3000
```

## Actualización de Código

Para actualizar la aplicación después del despliegue inicial:

1. Haz cambios en el código localmente
2. Commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Tu mensaje de commit"
   git push origin main
   ```
3. Render.com automáticamente detectará los cambios y redeploy
4. Espera a que el deploy termine (2-3 minutos usualmente)

## Migración desde servidor.js a src/app.js

Si estás actualizando desde una versión anterior:

1. Los cambios ya están en el repositorio
2. El nuevo `package.json` apunta a `src/app.js`
3. La estructura está organizada en módulos:
   - `src/app.js` - Main application
   - `src/config.js` - Configuration
   - `src/routes/media.js` - API routes
   - `src/services/s3Service.js` - S3 operations
   - `public/js/app.js` - Frontend logic
   - `public/css/styles.css` - Frontend styles

## Soporte

Para problemas o dudas:
1. Revisa los logs en Render.com
2. Verifica que todas las variables de entorno están configuradas
3. Asegurate que el bucket S3 y IAM user están correctamente configurados

---

Última actualización: 2024
