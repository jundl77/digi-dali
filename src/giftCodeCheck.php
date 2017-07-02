<?php
include "./sanitize.php";

if (isset($_POST["code"]) && !empty($_POST["code"])) {
    $giftCodesFileName = "./.data/.gift_codes.txt";

    // get the data
    $code = sanitize($_POST["code"]);
    $allCodes = file_get_contents($giftCodesFileName);
    if (strpos($allCodes, $code) !== false) {
        print_r("success");
    } else {
        print_r("Invalid gift code");
    }
} else {
    print_r("No data was received by the server");
}