const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
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

    console.log("write", dataName, base64Image.length);
    // Write file
    let file = fs.createWriteStream(`${userPath}/${dataName}${ext}`);
    file.write(response.data);
    file.end();

    return res.status(200).send({ message: 'Image uploaded successfully' });
});

app.listen(3000, () => console.log('Server started on port 3000'));
