/*globals Cropper */

let fileInput;
let uploadButton;
let userId;

let user;

let nextSpot = 1;

let nextId = 0;

let crops = new Map();

function randomString() {
    return Math.floor(Math.random() * 36 ** 10).toString(36);
}

function setup() {
    fileInput = document.getElementById('fileInput');
    fileInput.addEventListener("change", evt => fileSelected(evt));

    uploadButton = document.getElementById('uploadButton');
    uploadButton.addEventListener("click", evt => uploadImages(evt));

    userId = document.getElementById('userId');
    user = randomString();
    userId.innerHTML = user;
}

function fileSelected(evt) {
    console.log(evt);
    const reader = new FileReader();
    reader.onloadend = function() {
        let id = nextId++;
        console.log(fileInput.files[0]);
        const imageBase64 = reader.result;
        let img = document.createElement("img");
        img.classList.add("my-image");
        let holder = document.getElementById(`image-holder-${nextSpot}`);
        nextSpot++;
        img.src = imageBase64;
        img.imageId = id;
        img.imageName = fileInput.files[0].name;
        holder.appendChild(img);
        new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            crop(event) {
                let {x, y, width, height} = event.detail;
                x = Math.round(x);
                y = Math.round(y);
                width = Math.round(width);
                height = Math.round(height);
                crops.set(id, {x, y, width, height});
                console.log(crops.get(id));
            },
        });
    }
    reader.readAsDataURL(fileInput.files[0]);
}

function uploadImages() {
    let promises = [...Array(9).keys()].map((zeroBase) => {
        let i = zeroBase + 1;
        let holder = document.getElementById(`image-holder-${i}`);
        let img = holder.querySelector("img");
        if (!img) {return Promise.resolve(true);}

        let canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        let crop = crops.get(img.imageId);
        let fileName = img.imageName;
        canvas.getContext("2d").drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, 1024, 1024);

        let dataURL = canvas.toDataURL("image/jpeg");

        return fetch('http://localhost:3000/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: fileName,
                dataName: `${i}`,
                userId: user,
                image: dataURL,
	        mimeType: "image/jpeg",
            })
        }).catch((error) => {console.error('Error:', error); return null;});
    });

    Promise.all(promises).then((array) => {
        let all = array.reduce((a, c) => a && c, true);
        if (!all) {
            throw Error("upload failed");
        }
        console.log("done");
    });
}

