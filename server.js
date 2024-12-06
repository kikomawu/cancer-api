const express = require('express');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node');
const { v4: uuidv4 } = require('uuid');
const app = express();

const upload = multer({
    limits: { fileSize: 1000000 },
});

app.post('/predict', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'fail', message: 'File not uploaded' });
        }
        const imageBuffer = req.file.buffer;

        // Load model from Google Cloud Storage
        const model = await tf.loadLayersModel('https://storage.googleapis.com/rifki-bucket-model/model.json');

        // Preprocess the image
        const image = tf.node.decodeImage(imageBuffer).resizeNearestNeighbor([224, 224]).expandDims(0).toFloat();
        const prediction = model.predict(image).dataSync();

        const result = prediction[0] > 0.5 ? 'Cancer' : 'Non-cancer';
        const suggestion = result === 'Cancer' ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.';
        const response = {
            status: 'success',
            message: 'Model is predicted successfully',
            data: {
                id: uuidv4(),
                result,
                suggestion,
                createdAt: new Date().toISOString(),
            },
        };

        // Save response to Firestore
        saveToFirestore(response.data);

        res.json(response);
    } catch (error) {
        res.status(400).json({ status: 'fail', message: 'Terjadi kesalahan dalam melakukan prediksi' });
    }
});

app.listen(8080, () => console.log('Server running on port 8080'));
