const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const http = require('http');
const https = require('https');

let credentials;
try {

    let privateKey  = fs.readFileSync('./privkey.pem', 'utf8');
    let certificate = fs.readFileSync('./cert.pem', 'utf8');
    credentials = {key: privateKey, cert: certificate};
}catch (e) {
    console.log(e);
};

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb', extended: true })); // Adjust limit as needed
app.use("/", express.static("public"));

app.post('/upload', (req, res) => {
    const fileName = req.body.fileName;
    const dataName = req.body.dataName;
    const base64Image = req.body.image;
    const userId = req.body.userId;
    const mimeType = req.body.mimeType;

    if (!fileName || !dataName || !base64Image || !mimeType || !userId) {
        console.log(fileName, dataName, mimeType, userId);
        return res.status(400).send({ message: "Bad Request: missing fileName or image data." });
    }

    // Extract file extension
    let matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    let response = {};

    if (matches.length !== 3) {
        return new Error('Invalid image data');
    }

    response.type = matches[1];
    response.data = new Buffer.from(matches[2], 'base64');

    // Check file type (png or jpeg)
    let ext;
    if(mimeType === "image/png") ext = ".png";
    else if(mimeType === "image/jpeg") ext = ".jpg";
    else {
        console.log(mimeType);
        return res.status(400).send({ message: "Invalid image format: only .png and .jpg are accepted." });
    }

    // Check if directory exists and create if not
    let userPath = `./public/uploads/${userId}`;
    if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, {recursive: true});
    }

    console.log("write", userId, `${dataName}${ext}`, base64Image.length);
    // Write file
    let file = fs.createWriteStream(`${userPath}/${dataName}${ext}`);
    file.write(response.data);
    file.end();

    return res.status(200).send({ message: 'Image uploaded successfully' });
});

app.get('/users', (req, res) => {
    let userPath = `./public/uploads/`;
    fs.readdir(userPath, (err, files) => {
        if (err) {
            console.error('Failed to list files', err);
            res.status(500).json({error: 'Failed to list files'});
        } else {
            res.json(files);
        }
    });
});

app.get('/pictures/:userId', (req, res) => {
    const userId = req.params.userId;

    console.log("pictures for: ", userId);
    
    if (!userId) {
        return res.status(400).send({message: "Bad Request: missing userId."});
    }
    let userPath = `./public/uploads/${userId}`;
    fs.readdir(userPath, (err, files) => {
        if (err) {
            console.error('Failed to list files', err);
            res.status(500).json({error: 'Failed to list files'});
        } else {
            res.json(files);
        }
    });
});

let httpServer = http.createServer(app);
httpServer.listen(3000, () => console.log('Server started on port 3000'));

if (credentials) {
    console.log("also running https");
    let httpsServer = https.createServer(credentials, app);
    httpsServer.listen(3443, () => console.log('Server started on port 3443'));
}

