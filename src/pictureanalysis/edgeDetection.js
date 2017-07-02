/**
 * Main function to be called to calculate edges
 */
function applyEdgeDetection(imageData, uploaded, isVideoOn, isFindingEdges, sigma, kernelSize, edgeT1, edgeT2) {
    if (!uploaded || !isFindingEdges || isVideoOn) {
        return false; // Signal that nothing is happening - causes worker to 'wait' 500ms
    }

    var img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8C1_t);

    var code = jsfeat.COLOR_RGBA2GRAY;
    jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8, code);
    jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernelSize, sigma);
    jsfeat.imgproc.canny(img_u8, img_u8, edgeT1, edgeT2);

    // render result back to image data
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = img_u8.cols * img_u8.rows, pix = 0;
    while (--i >= 0) {
        pix = img_u8.data[i];
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }

    return imageData;
}

/**
 * Method that is called by the caller script
 * @param data the data received (data to start a new edge detection run)
 */
self.onmessage = function (data) {
    importScripts("jsfeat.min.js");
    var imageData = data.data.imageData;
    var uploaded = data.data.uploaded;
    var isVideoOn = data.data.isVideoOn;
    var isFindingEdges = data.data.isFindingEdges;
    var sigma = data.data.sigma;
    var kernelSize = data.data.kernelSize;
    var edgeT1 = data.data.edgeT1;
    var edgeT2 = data.data.edgeT2;
    var edgeImgData = applyEdgeDetection(imageData, uploaded, isVideoOn, isFindingEdges, sigma, kernelSize, edgeT1,
        edgeT2);
    self.postMessage({'edgeImgData': edgeImgData});
};