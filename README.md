# Publicidad - Demo

Esta es una demo simple para mostrar imágenes y videos en un ciclo continuo.

## Comportamiento
- Si no configuras S3, el servidor listará los archivos en `public/media` (local).
- Si configuras `S3_BUCKET` (y opcionalmente `S3_REGION`), el servidor listará objetos desde ese bucket.
- Si `S3_PUBLIC=true`, el servidor devolverá URLs públicas tipo `https://{bucket}.s3.{region}/{key}`.
- Si `S3_PUBLIC` no está activado, el servidor intentará generar URLs presigned (requiere credenciales AWS configuradas mediante variables de entorno o rol).

## Variables de entorno (opciones)
- S3_BUCKET: nombre del bucket S3 (si no se provee, se usa la carpeta local `public/media`)
- S3_REGION: región del bucket (ej: `us-east-1`). Si no se da, se usará `AWS_REGION` si existe.
- S3_PREFIX: prefijo dentro del bucket (opcional)
- S3_PUBLIC: `true` si los objetos son públicos y se pueden servir con URL pública. Si no, se generarán URLs presigned (si se pueden).
- S3_SIGNED_EXPIRES: segundos que durará la URL firmada (por defecto 3600)

Si vas a usar URLs firmadas (presigned), asegúrate de tener configuradas las credenciales AWS en tu entorno (por ejemplo `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`, o usando el rol de la instancia/servicio).

## Cómo crear un bucket S3 rápido (CLI)
1. Instala y configura AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

2. Crear el bucket (ejemplo en `us-east-1`):

```powershell
aws s3 mb s3://mi-bucket-publicidad --region us-east-1
```

3. Subir archivos (ejemplo):

```powershell
aws s3 cp .\public\media s3://mi-bucket-publicidad/ --recursive --acl public-read
```

4. (Opcional) Si quieres que el bucket sea público para objetos, añade una política de bucket (cuidado: esto abre lectura pública):

```powershell
$policy = '{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::mi-bucket-publicidad/*"}]}'
aws s3api put-bucket-policy --bucket mi-bucket-publicidad --policy $policy
```

Reemplaza `mi-bucket-publicidad` por el nombre elegido.

## Qué información necesito de ti
Para conectar y probar la demo con tu bucket S3, pásame:
- Nombre del bucket (`S3_BUCKET`)
- Región (`S3_REGION`) — si lo sabes
- Indica si el bucket será público (`S3_PUBLIC=true`) o si prefieres usar URLs firmadas.
- Si prefieres usar URLs firmadas, proporcioname (por un canal seguro) credenciales IAM con permisos `s3:ListBucket` y `s3:GetObject`, o configura esas credenciales en el entorno donde se desplegará la app (ej. Render variables de entorno).

Ejemplos de variables para configurar en el servidor (Render, Heroku, etc):
- S3_BUCKET=mi-bucket-publicidad
- S3_REGION=us-east-1
- S3_PUBLIC=true

## Deploy / pruebas locales
1. Instala dependencias:

```powershell
npm install
```

2. Ejecuta localmente:

```powershell
npm start
```

3. Abre `http://localhost:3000` en tu navegador.

## Notas
- Para demos rápidas recomiendo usar `S3_PUBLIC=true` y subir los archivos con `--acl public-read`.
- Para producción, usa URLs firmadas o un CDN (CloudFront) y restringe acceso con políticas.

Si quieres, puedo crear una política IAM mínima y los comandos exactos para crear un usuario que solo tenga `s3:ListBucket` y `s3:GetObject` sobre tu bucket.



AWS S3
IMPORTANT: no incluyas claves de acceso en repositorios públicos.

Si por error subiste credenciales (Access Key / Secret) a este repositorio, debes rotarlas inmediatamente:

1. Entra a la consola de AWS IAM.
2. Localiza el usuario que corresponde a la Access Key comprometida.
3. Elimina o desactiva la Access Key expuesta.
4. Crea una nueva Access Key si la necesitas y configura esas credenciales como variables de entorno en el servidor (no en el repo).

Comandos útiles (AWS CLI) para eliminar una access key:

```powershell
# elimina una access key para un usuario IAM
aws iam delete-access-key --user-name <user-name> --access-key-id <ACCESS_KEY_ID>
```

Para probar la demo sin compartir credenciales, puedes usar un `manifest.json` público en tu bucket que liste las keys (o URLs) de los medios. Nuestro servidor soporta la variable de entorno `S3_MANIFEST_URL` para leer ese archivo público. Ejemplo de manifest (`manifest.json`):

```json
[
	"images/1.jpg",
	"videos/ad1.mp4",
	"images/2.png"
]
```

Si subes ese `manifest.json` al bucket y lo haces público, configura en el entorno del servidor:

```
S3_MANIFEST_URL=https://restaurante-joaos.s3.us-east-1.amazonaws.com/manifest.json
S3_BASE_URL=https://restaurante-joaos.s3.us-east-1.amazonaws.com/
```

Con eso el servidor descargará el manifest público y lo usará para la reproducción sin necesitar credenciales.