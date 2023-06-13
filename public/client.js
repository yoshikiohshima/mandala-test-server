/*globals Cropper */

let fileInput;

let chooseButton;

let uploadButton;
let getUsersButton;
let userNameField;
let userId;

let baseUrl;

let user;

let nextId = 0;

let crops = new Map();
let croppers = new Map(); // index to cropper instance;

function randomString() {
    return Math.floor(Math.random() * 36 ** 10).toString(36);
}

function setup() {
    fileInput = document.getElementById('fileInput');
    fileInput.addEventListener("change", evt => handleFileSectionAndClear(evt));

    chooseButton = document.getElementById("chooseButton");
    chooseButton.addEventListener("click", () => fileInput.click());

    uploadButton = document.getElementById('uploadButton');
    uploadButton.addEventListener("click", evt => uploadImages(evt));

    getUsersButton = document.getElementById('getUsersButton');
    getUsersButton.addEventListener("click", evt => getUsers(evt));

    userNameField = document.getElementById('userNameField');
    userNameField.addEventListener("keydown", evt => {
        if (evt.key === "Enter") {
            getPictures(userNameField.value);
        }
    });

    userId = document.getElementById('userId');
    user = randomString();
    userId.innerHTML = user;

    for (let i = 0; i < 9; i++) {
        let holder = document.body.querySelector(`#image-holder-${i + 1}`);
        if (holder) {
            holder.style.gridRow = `${Math.floor(i / 3) + 2}`;
            holder.style.gridColumn = `${(i % 3) + 1}`;

            let buttonRow = document.createElement("div");
            buttonRow.classList.add("button-row");
            buttonRow.style.setProperty("visibility", "hidden");
            holder.appendChild(buttonRow);
        }
    }

    baseUrl = window.location.protocol + '//' + window.location.hostname +
        (window.location.port ? ':' + window.location.port : '');
}

function findNextSpot() {
    for (let i = 0; i < 9; i++) {
        let holder = document.getElementById(`image-holder-${i + 1}`);
        if (!holder.querySelector("img") && !holder.querySelector("canvas")) {
            return holder;
        }
    }
    return null;
}

function handleFileSectionAndClear() {
    fileSelected().then(() => {
        fileInput.value = "";
    });
}

function fileSelected() {
    let files = [...fileInput.files];
    let promises = files.map((file) => {
        let holder = findNextSpot();
        let img = document.createElement("img");
        img.classList.add("my-image");
        holder.appendChild(img);
        return new Promise((resolve, _reject) => {
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                let id = nextId++;
                console.log(file);
                const imageBase64 = reader.result;

                img.src = imageBase64;
                img.imageId = id;
                img.imageName = file.name;
                let cropper = new Cropper(img, {
                    aspectRatio: 1,
                    viewMode: 1,
                    crop(event) {
                        let {x, y, width, height} = event.detail;
                        x = Math.round(x);
                        y = Math.round(y);
                        width = Math.round(width);
                        height = Math.round(height);
                        crops.set(id, {x, y, width, height});
                        // console.log(crops.get(id));
                    },
                });

                croppers.set(img.imageId, cropper);

                let buttonRow = holder.querySelector(".button-row");
                buttonRow.style.removeProperty("visibility");

                let deleteButton = document.createElement("div");
                deleteButton.classList.add("image-button");
                deleteButton.classList.add("delete-button");
                buttonRow.appendChild(deleteButton);
                deleteButton.addEventListener("click", () => {
                    let c = croppers.get(img.imageId);
                    if (c) {
                        c.destroy();
                        croppers.delete(img.imageId);
                    }
                    while (buttonRow.lastChild) {
                        buttonRow.lastChild.remove();
                    }

                    let toBeDeleted = holder.querySelector(".my-image");
                    if (toBeDeleted) {
                        toBeDeleted.remove();
                    }
                });

                let okButton = document.createElement("div");
                okButton.classList.add("image-button");
                okButton.classList.add("ok-button");
                buttonRow.appendChild(okButton);
                okButton.addEventListener("click", () => {
                    let canvas = document.createElement("canvas");
                    canvas.width = 1024;
                    canvas.height = 1024;
                    canvas.classList.add("my-image");
                    let crop = crops.get(img.imageId);
                    canvas.getContext("2d").drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, 1024, 1024);

                    canvas.imageName = img.imageName;
                    let c = croppers.get(img.imageId);
                    if (c) {
                        c.destroy();
                        croppers.delete(img.imageId);
                    }
                    img.remove();
                    okButton.remove();
                    holder.appendChild(canvas);
                });
                resolve(file);
            }
        });
    });
    return Promise.all(promises);
}

function uploadImages() {
    for (let i = 1; i <= 9; i++)  {
        let holder = document.getElementById(`image-holder-${i}`);
        let img = holder.querySelector("img");
        if (img) {
            console.log("confirm all images");
            return;
        }
    }

    let promises = [...Array(9).keys()].map((zeroBase) => {
        let i = zeroBase + 1;
        let holder = document.getElementById(`image-holder-${i}`);

        let canvas = holder.querySelector("canvas");
        if (!canvas) {return Promise.resolve(true);}
        let dataURL = canvas.toDataURL("image/jpeg");

        let baseUrl = window.location.protocol + '//' + window.location.hostname +
            (window.location.port ? ':' + window.location.port : '');

        let uploadUrl = baseUrl + '/upload/';

        return fetch(uploadUrl, {
            method: 'POST',
            mode: "cors",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: canvas.imageName,
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

function getUsers() {
    let url = baseUrl + '/users/';

    fetch(url, {
        method: 'GET',
        mode: "cors",
    })
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((error) => {console.error('Error:', error); return null;});
}

function getPictures(userId) {
    let url = baseUrl + `/pictures/${userId}`;
    fetch(url, {
        method: 'GET',
        mode: "cors",
    })
        .then((res) => res.json())
        .then((json) => {
            console.log(json);
            console.log(json.map((n) => `${baseUrl}/uploads/${userId}/${n}`));
        })
        .catch((error) => {console.error('Error:', error); return null;});
}
