/**
 * Standard deviation of Gaussian, it determines the steepness of the "bump" in the gaussian.
 *
 * The greater this value is, the more smoothed the image will be and hence the less precise the edges will be.
 * @type {number}
 */
var SIGMA;

/**
 * Value used in Gaussian Smoothing for the size of the square the gaussian kernel has.
 *
 * The greater this value is, the more smoothed the image will be and hence the less precise the edges will be.
 * @type {number}
 */
var KERNEL_SIZE;

/**
 * Value used in Canny Edge Detection as first threshold for gradient values.
 *
 * The greater this value is, the less pixels will be accepted as edges in first place.
 * @type {number}
 */
var EDGE_T1;

/**
 * Value used in Canny Edge Detection as second threshold for gradient values.
 *
 * The close this value is to EDGE_T1 less pixels will be accepted as edges
 * @type {number}
 */
var EDGE_T2;

/**
 * Value used in vectorization to determine the maximal slope deviation
 *
 * The greater this value is, the less precise the vectors will be but the longer they will be, too.
 * @type {number}
 */
var VECTOR_T;

/**
 * Value used in vectorization to determine minimum vector size.
 *
 * The bigger this value is the less precise the vectors are and vice versa
 * @type {number}
 */
var VECTOR_RADIUS;

/**
 * Canvas object for img to imgData transfer and imgAnalyzerObj
 */
var canvasTemp = document.createElement("canvas");

/**
 * Global variables
 */
var imageInit;
var edgeImgData;
var vectorImageData;
var currentImage = null;
var vectorArray;
var vectorXMLData;
var showEndpoints = false;

/**
 * Gets the currently displayed image on the canvas
 */
function getCurrentImage() {
    return currentImage;
}

/**
 * Main function to be called to get edges
 *
 * PRE-CONDITION: imageInit is loaded
 */
function findEdgeMain() {
    var worker = new Worker('pictureanalysis/edgeDetection.js');

    var startWorker = function (worker) {
        SIGMA = 21.0 - parseFloat(document.getElementById("sigmaTxt").value);
        KERNEL_SIZE = 21.0 - parseInt(document.getElementById("kernelTxt").value);
        EDGE_T1 = 201 - parseFloat(document.getElementById("t1Txt").value);
        EDGE_T2 = 201 - parseFloat(document.getElementById("t2Txt").value);
        var uploaded = isUploaded();
        var videoOn = isVideoOn();
        var findingEdges = isFindingEdges();

        //start the worker
        var imageData = setImgToImgData(imageInit);

        worker.postMessage({
            imageData: imageData,
            uploaded: uploaded,
            isVideoOn: videoOn,
            isFindingEdges: findingEdges,
            sigma: SIGMA,
            kernelSize: KERNEL_SIZE,
            edgeT1: EDGE_T1,
            edgeT2: EDGE_T2
        });
    };

    worker.onmessage = function (data) {
        if (data.data.edgeImgData !== false) {
            edgeImgData = data.data.edgeImgData;

            for (var y = 0; y < edgeImgData.height; y++) {
                for (var x = 0; x < edgeImgData.width; x++) {
                    var color = getPixel(edgeImgData, x, y);
                    if (color[0] == 255 && color[1] == 255 && color[2] == 255) {
                        setPixel(edgeImgData, x, y, 50, 50, 50, 255);
                    } else {
                        setPixel(edgeImgData, x, y, 255, 255, 255, 255);
                    }
                }
            }

            if (isUploaded() && !isVideoOn() && isFindingEdges()) {
                var edgeImg = setImgDataToImg(edgeImgData);
                setPictureOnCanvas("pictureBox", edgeImg.getAttribute("src"));
                activateVectorizeAndDownload();
            }

            // Call worker again
            setTimeout(function() {
                startWorker(worker);
            }, 25);
        } else {

            // Call worker again (with longer delay because it was inactive)
            setTimeout(function() {
                startWorker(worker);
            }, 500);
        }
    };

    startWorker(worker);
}

/**
 * Main function to be called to vectorize image
 *
 * PRE-CONDITION: edgeImgData exists, meaning canny edge detection has been applied
 */
function vectorizeMain() {
    var worker = new Worker('pictureanalysis/vectorization.js');

    var startWorker = function (worker) {
        VECTOR_T = 5.1 - parseFloat(document.getElementById("vSlopeTxt").value);
        VECTOR_RADIUS = 20 - parseFloat(document.getElementById("vRadiusTxt").value);
        showEndpoints = document.getElementById("vEndPtCheckBox").checked;
        var canVectorize = isVectorizing();

        //start the worker
        worker.postMessage({
            edgeImageData: edgeImgData,
            vectorThreshold: VECTOR_T,
            vectorRadius: VECTOR_RADIUS,
            canVectorize : canVectorize
        });
    };

    worker.onmessage = function (data) {
        if (data.data.vectorArray !== false) {
            vectorArray = data.data.vectorArray;

            canvasTemp.width = edgeImgData.width;
            canvasTemp.height = edgeImgData.height;
            var vectorImageDataInternal = canvasTemp.getContext('2d').createImageData(edgeImgData.width, edgeImgData.height);

            for (var y1 = 0; y1 < vectorImageDataInternal.height; y1++) {
                for (var x1 = 0; x1 < vectorImageDataInternal.width; x1++) {
                    setPixel(vectorImageDataInternal, x1, y1, 255, 255, 255, 0);
                }
            }

            for (var i = 0; i < vectorArray.length; i++) {
                var vector = vectorArray[i];
                var start = vector.startPix;
                var end = vector.endPix;
                drawLine(start, end, vectorImageDataInternal);
                if (showEndpoints) {
                    drawBox(start[0], start[1], vectorImageDataInternal);
                    drawBox(end[0], end[1], vectorImageDataInternal);
                }
            }

            vectorXMLData = vectorsToXMLFormat(vectorArray);

            vectorImageData = vectorImageDataInternal;

            var vectorImg = setImgDataToImg(vectorImageData);
            setPictureOnCanvas("pictureBox", vectorImg.getAttribute("src"));
            activateLaserButton();

            // Call worker again
            setTimeout(function() {
                startWorker(worker);
            }, 25);
        } else {

            // Call worker again (with longer delay because it was inactive)
            setTimeout(function() {
                startWorker(worker);
            }, 500);
        }
    };

    startWorker(worker);
}

/**
 * Gets the vectors in their xml form ready for the upload
 *
 * @returns {*} the vectors in their xml form ready for the upload
 */
function getVectorsXML() {
    return vectorXMLData;
}

/**
 * Sets the inital image
 * @param img
 */
function setImageInit(img) {
    imageInit = img;
}

/**
 * Sets the image data of the image that has undergone edge detection
 */
function setEdgeImageData(edgeImgDataParam) {
    edgeImgData = edgeImgDataParam;
}

/**
 * Gets the temporary canvas
 */
function getCanvasTemp() {
    return canvasTemp;
}

/**
 * Draws a line between startPix and endPix on the given imageData
 *
 * @param startPix the pixel where to start drawing the line
 * @param endPix the pixel where to end drawing the line
 * @param imageData the image data on which to draw the line
 */
var drawLine = function (startPix, endPix, imageData) {
    //find dx and dy
    var dx = endPix[0] - startPix[0];
    if (Math.abs(dx) < 0.0001) {
        dx = 0.0001;
    }
    var dy = startPix[1] - endPix[1];
    var slope = dy / dx;
    var positive = true;
    if (slope < 0) {
        positive = false;
    }
    slope = Math.abs(slope);
    dx = Math.abs(dx);
    dy = Math.abs(dy);

    //find direction increasing fastest
    var start;
    var end;
    var otherDir;
    var error;
    if (slope <= 1) {
        error = dx / 2;
        if (startPix[0] < endPix[0]) {
            start = startPix[0];
            end = endPix[0];
            otherDir = startPix[1];
        } else {
            start = endPix[0];
            end = startPix[0];
            otherDir = endPix[1];
        }

        for (var i = start; i < end; i++) {
            error -= dy;
            if (error < 0) {
                error += dx;
                if (positive) {
                    otherDir--;
                } else {
                    otherDir++;
                }
            }
            setPixel(imageData, i, otherDir, 50, 50, 50, 255);
        }
    } else {
        error = dy / 2;
        if (startPix[1] > endPix[1]) {
            start = startPix[1];
            end = endPix[1];
            otherDir = startPix[0];
        } else {
            start = endPix[1];
            end = startPix[1];
            otherDir = endPix[0];
        }

        for (var i2 = start; i2 > end; i2--) {
            error -= dx;
            if (error < 0) {
                error += dy;
                if (positive) {
                    otherDir++;
                } else {
                    otherDir--;
                }
            }
            setPixel(imageData, otherDir, i2, 50, 50, 50, 255);
        }
    }
};

/**
 * Draws a little 5x5 pixel box around the pixel with the coordinates of (xPix, yPix)
 * This function is used to draw little boxes around the starting and ending points of the vectors, if the user
 * so desires
 *
 * @param xPix x coordinate of where to draw the box
 * @param yPix y coordinate of where to draw the box
 * @param imageData the image data on which to draw the box
 */
var drawBox = function (xPix, yPix, imageData) {
    for (var y = yPix - 2; y < yPix + 3; y++) {
        for (var x = xPix - 2; x < xPix + 3; x++) {
            if ((y >= 0 && y < imageData.height) && (x >= 0 && x < imageData.width)) {
                setPixel(imageData, x, y, 38, 38, 38, 255);
            }
        }
    }
};

/**
 * Converts vector objects into xml style code
 */
function vectorsToXMLFormat(vList) {
    var content = "";

    for (var i = 0; i < vList.length; i++) {
        var v = vList[i];
        var start = v.startPix;
        var end = v.endPix;
        content += start[0] + "-" + start[1] + "_" + end[0] + "-" + end[1] + "+";
    }

    // Mark the end of the file
    content += "700-700_700-700";
    return content;
}

/**
 * Sets the pixel's RGBA values at x, y
 *
 * @param imageData the image data to check the color for
 * @param x x location of pixel to set
 * @param y y location of pixel to set
 * @param r red value to assign to pixel
 * @param g green value to assign to pixel
 * @param b blue value to assign to pixel
 * @param a alpha value to assign to pixel (transparency)
 */
var setPixel = function (imageData, x, y, r, g, b, a) {
    var index = (x + y * imageData.width) * 4;
    imageData.data[index] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = a;
};

/**
 * Gets the pixel's RGBA values at x, y
 *
 * @param imageData the image data to check the color for
 * @param x x location of pixel to set
 * @param y y location of pixel to set
 * @returns {Array} the array of size 4 containing RGBA values for pixel
 */
var getPixel = function (imageData, x, y) {
    var index = (x + y * imageData.width) * 4;
    var pix = new Array(4);
    pix[0] = imageData.data[index];
    pix[1] = imageData.data[index + 1];
    pix[2] = imageData.data[index + 2];
    pix[3] = imageData.data[index + 3];
    return pix;
};

/**
 * Converts an image into image data
 *
 * @param img the image to convert
 * @returns {ImageData} the converted image data
 */
function setImgToImgData(img) {
    canvasTemp.width = img.width;
    canvasTemp.height = img.height;
    var context = canvasTemp.getContext("2d");
    context.drawImage(img, 0, 0);
    return context.getImageData(0, 0, img.width, img.height);
}

/**
 * Converts image data into an image
 *
 * @param imgData the image data to convert
 * @returns {HTMLElement} the converted image
 */
function setImgDataToImg(imgData) {
    canvasTemp.width = imgData.width;
    canvasTemp.height = imgData.height;
    canvasTemp.getContext("2d").putImageData(imgData, 0, 0);
    var img = document.createElement("img");
    img.setAttribute("src", canvasTemp.toDataURL("image/png"));
    return img;
}

/**
 * Puts picture on canvas and saves it into imageInit as well.
 *
 * Only to be used on drop as otherwise the image should not be saved and resized.
 *
 * @param elementID the ID of the element to put the picture into
 * @param srcAttribute the source attribute of the picture
 */
function setPictureOnCanvasDROP(elementID, srcAttribute) {
    var image = document.createElement("IMG");
    var done = false;
    image.onload = function() {
        if (!done) {
            // Resizing image if necessary
            var ratio = 1;
            var maxDimension = 600; // Maximum amount of pixels the bigger dimension can have
            var biggerDimension = image.height; // size of the bigger dimension

            if (image.width > image.height) {
                biggerDimension = image.width;
            }

            if (biggerDimension > maxDimension) {
                ratio = maxDimension / biggerDimension;
            }

            var newWidth = image.width * ratio;
            var newHeight = image.height * ratio;

            image.width = newWidth;
            image.height = newHeight;

            // Drawing resized image on hidden canvas
            var ctx = canvasTemp.getContext("2d");
            ctx.clearRect(0, 0, canvasTemp.width, canvasTemp.height);
            canvasTemp.width = newWidth;
            canvasTemp.height = newHeight;
            ctx.drawImage(image, 0, 0, newWidth, newHeight);

            // Taking image from temporary canvas and drawing it on the real canvas.
            // The image source is not copied directly with canvasTemp.toDataURL("image/png") because of an weird
            // misplacement bug on the final canvas with some images if that is done
            image.setAttribute("src", canvasTemp.toDataURL("image/png"));
            setPictureOnCanvas(elementID, image.src);
            done = true; // Done so that the method does not call itself again
        }
    };
    image.setAttribute("src", srcAttribute);
    imageInit = image;
    deactivateLaserButton();
    deactivateVectorizeAndDownload();
    activateFindEdges();
}

/**
 * Same as setPictureOnCanvasDROP but does not save picture
 *
 * @param elementID the ID of the element to put the picture into
 * @param srcAttribute the source attribute of the picture
 */
function setPictureOnCanvas(elementID, srcAttribute) {
    //draw image on canvas
    var img = document.createElement("IMG");
    img.onload = function () {
        var element = document.getElementById(elementID);
        var c = element.getContext("2d");

        //clear canvas for redrawing
        c.clearRect(0, 0, element.width, element.height);

        //centering image
        var offWidth, offHeight, width, height;
        if (img.width > img.height) {
            offWidth = 0;
            width = element.width;
            height = parseInt(element.height * (img.height / img.width), 10);
            offHeight = parseInt((element.height - height) / 2, 10);
        } else {
            offHeight = 0;
            height = element.height;
            width = parseInt(element.width * (img.width / img.height), 10);
            offWidth = parseInt((element.width - width) / 2, 10);
        }
        c.drawImage(img, offWidth, offHeight, width, height);
        currentImage = img;
    };
    img.setAttribute("src", srcAttribute);
}