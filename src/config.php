<?php
require_once('vendor/autoload.php');

$stripe = array(
    "secret_key"      => "sk_test_VFBCm5l7aFRzfTJ1Um0GqMNN",
    "publishable_key" => "pk_test_JUVZX1AXxjeWpTkpEYqSDEwH"
);

\Stripe\Stripe::setApiKey($stripe['secret_key']);