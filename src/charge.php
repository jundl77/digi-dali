<?php
include "./sanitize.php";

require_once('./config.php');

\Stripe\Stripe::setApiKey("sk_test_VFBCm5l7aFRzfTJ1Um0GqMNN");

if (isset($_POST["tokenid"]) && !empty($_POST["tokenid"])) {
    $token = sanitize($_POST['tokenid']);
    $amount = sanitize($_POST["amount"]);

    if ($amount != 50 && $amount != 100 && $amount != 1000) {
        print_r("An error occurred." . $amount);
        exit;
    }

    // Create the charge on Stripe's servers - this will charge the user's card
    try {
        $charge = \Stripe\Charge::create(array(
                "amount" => $amount, // amount in cents, again
                "currency" => "eur",
                "source" => $token,
                "description" => "1 laser engraving")
        );
        print_r("success");
    } catch(\Stripe\Error\Card $e) {
        // The card has been declined
        print_r("An error occurred: " . $e);
    }
} else {
    print_r("No payment data was received by the server");
}