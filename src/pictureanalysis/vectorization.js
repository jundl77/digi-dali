var vectorArray;
var pixelArray;
var startPix;
var slope;
var startSlope = true;

/**
 * Method that is called by the caller script
 * @param data the data received (data to start a new edge detection run)
 */
self.onmessage = function (data) {
    var edgeImageData = data.data.edgeImageData;
    var vectorThreshold = data.data.vectorThreshold;
    var vectorRadius = data.data.vectorRadius;
    var canVectorize = data.data.canVectorize;
    var vectorArray = vectorizeImageData(edgeImageData, vectorThreshold, vectorRadius, canVectorize);
    self.postMessage({'vectorArray': vectorArray});
};

/**
 * Main function for vectorization.
 *
 * PRE-CONDITION: edge detection has been applied to image, so edgeImgData is not null
 */
var vectorizeImageData = function (edgeImgData, vectorThreshold, vectorRadius, canVectorize) {
    if (edgeImgData == null || !canVectorize) {
        return false; // Signal that nothing is happening - causes worker to 'wait' 500ms
    }

    pixelArray = [];
    vectorArray = [];

    for (var y = 0; y < edgeImgData.height; y++) {
        for (var x = 0; x < edgeImgData.width; x++) {
            if (isBlack(x, y, edgeImgData) && !inArray(x, y)) {
                var pix = [];
                pix[0] = x;
                pix[1] = y;
                pix[2] = 0;
                startPix = pix;
                startSlope = true;
                vectorizeHelper(x, y, edgeImgData, vectorThreshold, vectorRadius);
            }
        }
    }

    vectorArray = sieve(vectorArray);
    return vectorArray;
};

/**
 * Helper function to recursively vectorize imageData
 *
 * @param x x location of where to start vectorizing
 * @param y y location of where to start vectorizing
 * @param vectorThreshold The slope threshold that determines whether a new vector is created or an old one is prolonged
 * @param vectorRadius The radius that the algorithm will use to search for a new vector.
 * @param imageData the image data to vectorize
 */
var vectorizeHelper = function (x, y, imageData, vectorThreshold, vectorRadius) {
    var pix = [];
    pix[0] = x;
    pix[1] = y;
    pix[2] = 0; // has to do with slope, if it will be set to 1, then the pixel is extending a vector
    var neighbors = getSurroundingPixels(x, y, imageData, vectorRadius);
    var pixChosen = chooseEndPoint(neighbors, pix, vectorThreshold);
    if (pixChosen !== null) {
        if (pixChosen[2] === 1) {
            vectorizeHelper(pixChosen[0], pixChosen[1], imageData, vectorThreshold, vectorRadius);
        } else {
            var vector = new Vector(startPix, pix);
            vectorArray.push(vector);
            startPix = pix;
            startSlope = true;
            vectorizeHelper(pixChosen[0], pixChosen[1], imageData, vectorThreshold, vectorRadius);
        }
    }
};

/**
 * Choose the pixel furthest away in pixels from prevPix, which is most likely to be the endPoint for the vector.
 *
 * Once the pixel is found, current slopes ar compared to the starting slope of the vector object to determine if
 * the pixel can be added to the vector, stretching it, or if a new vector has to be created.
 *
 * @param pixels array containing pixels from surrounding region where an edge most likely is
 * @param prevPix the previous pixel analyzed to use for comparison
 * @param vectorThreshold The slope threshold that determines whether a new vector is created or an old one is prolonged
 * @returns {*} the pixel of pixels most likely to be the end point (if slopes do not match)
 */
var chooseEndPoint = function (pixels, prevPix, vectorThreshold) {
    var distance = 0;
    var newSlope = 0;
    var pixFinal = [];
    pixFinal[2] = 0;
    if (pixels.length <= 0 || pixels[0] === undefined || pixels[1] === undefined) {
        return null;
    }

    //find pixel furthest away in pixels
    for (var i = 0; i < pixels.length; i++) {
        var pix = pixels[i];
        var newDist = Math.sqrt(Math.pow(pix[1] - prevPix[1], 2) + Math.pow(pix[0] - prevPix[0], 2));

        if (newDist > distance) {
            distance = newDist;
            pixFinal[0] = pix[0];
            pixFinal[1] = pix[1];

            var dx = pix[0] - prevPix[0];
            if (Math.abs(dx) < 0.0001) {
                dx = 0.0001;
            }
            var dy = prevPix[1] - pix[1];
            newSlope = dy / dx;
        }
    }

    //test for same line (1 = yes)
    if ((newSlope > slope - vectorThreshold && newSlope < slope + vectorThreshold) || startSlope) {
        pixFinal[2] = 1;
        if (prevPix[0] === startPix[0] && prevPix[1] === startPix[1]) {
            slope = newSlope;
        }
    }
    startSlope = false;
    for (var i2 = 0; i2 < pixels.length; i2++) {
        pixelArray.push(pixels[i2]);
    }
    return pixFinal;
};

/**
 * Gets the pixel region surrounding (xPix, yPix) containing the most pixels.
 *
 * All pixels surrounding (xPix, yPix) in a square are split up in 8 regions, each region with a different angle
 * from the x axes. Then the region containing the most pixels is returned, as it is the most likely region to
 * contain an edge.
 *
 * @param xPix the x location of the pixel to find surrounding pixels for
 * @param yPix the y location of the pixel to find surrounding pixels for
 * @param imageData image data for the image to use
 * @param vectorRadius The radius that the algorithm will use to search for a new vector.
 * @returns {*} an array filled with pixels from a region where an edge likely is
 */
var getSurroundingPixels = function (xPix, yPix, imageData, vectorRadius) {
    var pixels = [];
    for (var i = 0; i < 8; i++) {
        pixels[i] = [];
    }

    for (var y = yPix - vectorRadius; y < yPix + vectorRadius; y++) {
        for (var x = xPix - vectorRadius; x < xPix + vectorRadius; x++) {
            if ((y >= 0 && y < imageData.height) && (x >= 0 && x < imageData.width) &&
                (isBlack(x, y, imageData)) && (!inArray(x, y))) {
                var pix = [];
                pix[0] = x;
                pix[1] = y;

                //find quadrant, there are weird values because the origin is in the top left and not bottom left
                var quadrant = 0;
                if (yPix <= y && xPix < x) {
                    quadrant = 1;
                } else if (yPix < y && xPix >= x) {
                    quadrant = 2;
                } else if (yPix >= y && xPix > x) {
                    quadrant = 3;
                } else if (yPix > y && xPix <= x) {
                    quadrant = 4;
                }

                //find angle
                var dx = x - xPix;
                if (Math.abs(dx) < 0.0001) {
                    dx = 0.0001;
                }
                var dy = yPix - y;
                var angle = Math.atan(dy / dx) * (180 / Math.PI);

                //determine position
                switch (quadrant) {
                    case 2:
                        angle = 180 - angle;
                        break;
                    case 3:
                        angle += 180;
                        break;
                    case 4:
                        angle += 360;
                        break;
                }
                angle = Math.round(angle);

                //add pixel to corresponding array
                if (angle > 337.5 || angle <= 22.5) {
                    pixels[0].push(pix);
                } else if (angle > 22.5 || angle <= 67.5) {
                    pixels[1].push(pix);
                } else if (angle > 67.5 || angle <= 112.5) {
                    pixels[2].push(pix);
                } else if (angle > 112.5 || angle <= 157.5) {
                    pixels[3].push(pix);
                } else if (angle > 157.5 || angle <= 202.5) {
                    pixels[4].push(pix);
                } else if (angle > 202.5 || angle <= 247.5) {
                    pixels[5].push(pix);
                } else if (angle > 247.5 || angle <= 292.5) {
                    pixels[6].push(pix);
                } else if (angle > 292.5 || angle <= 337.5) {
                    pixels[7].push(pix);
                }
            }
        }
    }

    //find area with most pixels
    var max = 0;
    for (var i2 = 0; i2 < pixels.length; i2++) {
        if (pixels[i2].length > pixels[max].length)
            max = i2;
    }
    return pixels[max];
};

/**
 * Sieve the vector array to remove vectors that are too small to be drawn by the laser.
 *
 * @param vList the vector array to sieve
 * @returns {*} the vector array with too small vectors removed
 */
function sieve(vList) {
    var maxX = -1;
    var maxY = -1;

    // Find greatest x and y values
    for (var i = 0; i < vList.length; i++) {
        var v1 = vList[i];

        var vectorMaxX = Math.max(v1.startPix[0], v1.endPix[0]);
        var vectorMaxY = Math.max(v1.startPix[1], v1.endPix[1]);

        if (vectorMaxX > maxX) {
            maxX = vectorMaxX;
        }
        if (vectorMaxY > maxY) {
            maxY = vectorMaxY;
        }
    }

    // Normalize the vector and then multiply by 100 to get everything on a 10 x 10 cm area
    for (var j = 0; j < vList.length; j++) {
        var v2 = vList[j];
        var startPix = v2.startPix;
        var endPix = v2.endPix;

        var startX = Math.round((startPix[0] * 100) / maxX);
        var startY = Math.round((startPix[1] * 100) / maxY);
        var endX = Math.round((endPix[0] * 100) / maxX);
        var endY = Math.round((endPix[1] * 100) / maxY);

        var magnitude = Math.sqrt(Math.pow((endX - startX), 2) + Math.pow((endY - startY), 2));
        if (magnitude < 2) {
            vList.splice(j, 1);
        }
    }

    return vList;
}

/**
 * Checks if a value is included in the pixelArray
 *
 * @param x x location of value
 * @param y y location of value
 * @returns {boolean} true if the value is included, false otherwise
 */
var inArray = function (x, y) {
    for (var i = 0; i < pixelArray.length; i++) {
        var pix = pixelArray[i];
        if (x === pix[0] && y === pix[1])
            return true;
    }
    return false;
};

/**
 * Checks if pixel (x,y) is black in the given image data
 *
 * @param x x location of value
 * @param y y location of value
 * @param imageData the image data to check the color for
 * @returns {boolean} true if the pixel is black, false otherwise
 */
var isBlack = function (x, y, imageData) {
    var pix = getPixel(imageData, x, y);
    return (pix[0] === 50 && pix[1] === 50 && pix[2] === 50);
};

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
 * Object to make vectors from
 *
 * @constructor
 */
function Vector(startPix, endPix) {
    this.startPix = startPix;
    this.endPix = endPix;
}