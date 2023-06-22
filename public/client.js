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

let zoomed = null;

function randomString() {
    return Math.floor(Math.random() * 36 ** 10).toString(36);
}

function setup() {
    fileInput = document.getElementById('file-input');
    fileInput.addEventListener("change", evt => handleFileSectionAndClear(evt));

    chooseButton = document.getElementById("choose-button");
    chooseButton.addEventListener("click", () => fileInput.click());

    uploadButton = document.getElementById('upload-button');
    uploadButton.addEventListener("click", evt => uploadImages(evt));

    userId = document.getElementById('user-id');
    user = randomString();
    userId.value = user;

    for (let i = 0; i < 9; i++) {
        let holder = document.body.querySelector(`#image-holder-${i + 1}`);
        if (holder) {
            holder.style.gridRow = `${Math.floor(i / 3) + 1}`;
            holder.style.gridColumn = `${(i % 3) + 1}`;

            let buttonRow = document.createElement("div");
            buttonRow.classList.add("button-row");
            buttonRow.style.setProperty("visibility", "hidden");
            holder.appendChild(buttonRow);
        }
    }

    baseUrl = window.location.protocol + '//' + window.location.hostname +
        (window.location.port ? ':' + window.location.port : '');

    styleUploadButton();
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
    styleUploadButton();
}

function fileSelected() {
    let files = [...fileInput.files];
    let promises = files.map((file) => {
        let holder = findNextSpot();
        let img = document.createElement("img");
        img.classList.add("my-image");
        holder.appendChild(img);

        holder.classList.toggle("uncropped", true);
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

                let deleteButton = document.createElement("button");
                deleteButton.classList.add("delete-button");
                holder.appendChild(deleteButton);
                deleteButton.classList.toggle("button-hidden", true);
                deleteButton.addEventListener("click", () => remove(holder));

                let approveButton = document.createElement("button");
                approveButton.classList.add("approve-button");
                holder.appendChild(approveButton);
                approveButton.classList.toggle("button-hidden", true);
                approveButton.addEventListener("click", () => approve(holder));

                addCover(holder);

                resolve(file);
            }
        });
    });
    return Promise.all(promises);
}

function addCover(holder) {
    let cover = holder.querySelector(".cover");
    if (cover) {return;}

    cover = document.createElement("div");
    cover.classList.add("cover");
    holder.appendChild(cover);

    cover.addEventListener("pointerdown", () => {
        if (!zoomed) {
            zoom(holder);
        }
    });
}

function approve(holder) {
    let canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    canvas.classList.add("my-image");
    canvas.classList.add("accepted-image");

    let img = holder.querySelector("img");

    let crop = crops.get(img.imageId);
    canvas.getContext("2d").drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, 1024, 1024);

    canvas.imageName = img.imageName;
    let c = croppers.get(img.imageId);
    if (c) {
        c.destroy();
        croppers.delete(img.imageId);
    }
    img.remove();

    let approveButton = holder.querySelector(".approve-button");
    approveButton.remove();
    holder.appendChild(canvas);

    holder.classList.toggle("uncropped", false);

    unzoom(holder);
    styleUploadButton();
}

function remove(holder) {
    unzoom(holder);
    holder.classList.toggle("uncropped", false);
    let img = holder.querySelector("img");

    if (img) {
        let c = croppers.get(img.imageId);
        if (c) {
            c.destroy();
            croppers.delete(img.imageId);
        }
    }

    let approveButton = holder.querySelector(".approve-button");
    approveButton?.remove();

    let deleteButton = holder.querySelector(".delete-button");
    deleteButton.remove();

    let toBeDeleted = holder.querySelector(".my-image");
    if (toBeDeleted) {
        toBeDeleted.remove();
    }

    styleUploadButton();
}

function zoom(holder) {
    let container = document.querySelector(".container");
    zoomed = holder;

    let cover = holder.querySelector(".cover");
    if (cover) {
        cover.remove();
    }

    holder.classList.toggle("zoomed", true);
    container.appendChild(holder);

    let img = holder.querySelector("img");
    let cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.9,
        crop(event) {
            let {x, y, width, height} = event.detail;
            x = Math.round(x);
            y = Math.round(y);
            width = Math.round(width);
            height = Math.round(height);
            crops.set(img.imageId, {x, y, width, height});
            // console.log(crops.get(id));
        },
    });
    croppers.set(img.imageId, cropper);

    let approveButton = holder.querySelector(".approve-button");
    approveButton.classList.toggle("button-hidden", false);

    let deleteButton = holder.querySelector(".delete-button");
    deleteButton.classList.toggle("button-hidden", false);
}

function unzoom(holder) {
    zoomed = null;
    holder.classList.toggle("zoomed", false);
    let grid = document.getElementById("grid");

    let last = holder.id.lastIndexOf("-");
    let myId = parseInt(holder.id.slice(last + 1));
    myId++;

    let after = grid.querySelector(`#image-holder-${myId}`);

    grid.insertBefore(holder, after);
}

function styleUploadButton() {
    let status = checkUploadable();
    uploadButton.disabled = !status;
}

function checkUploadable() {
    let count = 0;
    let grid = document.getElementById("grid");

    for (let i = 0; i < 9; i++) {
        let child = grid.querySelector(`#image-holder-${i + 1}`);
        if (child.querySelector("img") || child.querySelector("canvas")) {
            count++;
        }
    }
    if (count === 0) {return false;}

    for (let i = 0; i < 9; i++) {
        let child = grid.querySelector(`#image-holder-${i + 1}`);
        if (child.classList.contains("uncropped")) {return false;}
    }

    return true;
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
