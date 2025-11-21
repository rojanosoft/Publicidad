const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Endpoint para obtener la lista de archivos multimedia
app.get('/api/media-files', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'public', 'media'));
        // Filtrar solo archivos de imagen y video
        const mediaFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].includes(ext);
        });
        res.json(mediaFiles);
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).send('Error reading media files');
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});