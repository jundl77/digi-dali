<?php
include "./sanitize.php";

require_once 'vendor/autoload.php';

set_include_path(get_include_path() . PATH_SEPARATOR . 'phpseclib');
include('phpseclib/Net/SSH2.php');
include('phpseclib/Crypt/AES.php');

if (isset($_POST["vectorData"]) && !empty($_POST["vectorData"])) {
    // get the data
    $vectorData = sanitize($_POST["vectorData"]);
    $firstName = sanitize($_POST['firstName']);
    $lastName = sanitize($_POST['lastName']);
    $address = sanitize($_POST['address']);
    $city = sanitize($_POST['city']);
    $zipCode = sanitize($_POST['zipCode']);
    $state = sanitize($_POST['state']);
    $country = sanitize($_POST['country']);
    $eMail = sanitize($_POST['e-mail']);

    // create the request in json format
    sendRequest($vectorData, $firstName, $lastName, $address, $city, $zipCode, $state, $country, $eMail);
    print_r("success");
} else {
    print_r("No data was received by the server");
}

/**
 * Sends the new laser request by sending client data to me (Julian) and vector data to the laser
 *
 * @param $vectorData string the vector data
 * @param $firstName string the client's first name
 * @param $lastName string the client's last name
 * @param $address string the client's address
 * @param $city string the client's city
 * @param $zipCode string the client's zip code
 * @param $state string the client's state
 * @param $country string the client's country
 * @param $eMail string the client's email
 */
function sendRequest($vectorData, $firstName, $lastName, $address, $city, $zipCode, $state, $country, $eMail) {
    $key = generateNextMailKey();
    $orderNumber = incrementOrderNumber();

    $id = "";
    for ($i = 0; $i < 100; $i++) {
        $id .= rand(0, 9);
    }

    $personalData = "<h5>DATA FOR OD " . $orderNumber . ": </h5>"
        . "<p>First Name: " . $firstName . "</p>"
        . "<p>Last Name: " . $lastName . "</p>"
        . "<p>Address: " . $address . "</p>"
        . "<p>City: " . $city . "</p>"
        . "<p>Zip Code: " . $zipCode . "</p>"
        . "<p>State: " . $state . "</p>"
        . "<p>Country: " . $country . "</p>"
        . "<p>E-Mail: " . $eMail . "</p>"
        . "<p>ID: " . $id . "</p>"
        . "<p>OD: " . $orderNumber . "</p>"
        . "<p>Key: " . $key . "</p>";

    sendMail("julianbrendl@gmail.com", "DigiDali Laser Client Data", $personalData);

    $jsonData = json_encode(array(
            'id' => $id,
            'orderNumber' => $orderNumber,
            "key"=> $key,
            "vectorData" => $vectorData,
            "firstName" => $firstName,
            "lastName" => $lastName
        )
    );

    sendMail("digidahli@gmail.com", "DigiDali Laser Request Data", $jsonData);
}

/**
 * Increments the order number by 1 and returns the result
 *
 * @return int|string incremented order number
 */
function incrementOrderNumber() {
    $orderFileName = "./.data/.orders.txt";
    $orderNumber = file_get_contents($orderFileName);

    $orderNumber += 1;
    $orderNumber = (string) $orderNumber;

    file_put_contents($orderFileName, $orderNumber);

    return $orderNumber;
}

/**
 * Encrypts a given string using AES encryption
 *
 * @param $plaintext string the string to encrypt
 * @return string the resulting encrypted string
 */
function encryptAES($plaintext) {
    $cipher = new Crypt_AES(CRYPT_MODE_ECB);
    $aesKeyFileName = "./.data/.aes_key.txt";
    $key = file_get_contents($aesKeyFileName);

    $cipher->setKey($key);
    $cipher->disablePadding();
    return base64_encode($cipher->encrypt($plaintext));
}

/**
 * Generates the next mail key
 *
 * @return string the generated mail key
 */
function generateNextMailKey() {
    $mailKeyFileName = "./.data/.mail_keys.txt";
    $mailKeys = file_get_contents($mailKeyFileName);

    $mailKeys = explode("-", $mailKeys);
    if ($mailKeys[0] + 42 == $mailKeys[1]) {
        $newMailKey = $mailKeys[1] + 42;
    } else {
        print_r("A serious error has occurred");
        exit();
    }

    $mailKeys = $mailKeys[1] . "-" . $newMailKey;

    file_put_contents($mailKeyFileName, $mailKeys);

    return encryptAES($newMailKey);
}

/**
 * Sends a mail
 *
 * @param $toMail string the address to send the mail to
 * @param $subject string the subject of the mail
 * @param $content string the content of the mail
 */
function sendMail($toMail, $subject, $content) {
    $mail = new PHPMailer;

    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'digidahli@gmail.com';
    $mail->Password = 'legolaser';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;
    $mail->setFrom('digidahli@gmail.com', 'Digi Dali');
    $mail->addAddress($toMail);
    $mail->WordWrap = 50;
    $mail->ContentType = 'text/plain';
    $mail->isHTML(false);

    $mail->Subject = $subject;
    $mail->Body = $content;
    $mail->AltBody = $content;

    if(!$mail->send()) {
        print_r("Error during upload");
        exit;
    }
}
