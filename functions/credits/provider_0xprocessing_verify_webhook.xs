// Verifies the HMAC-SHA256 signature of an inbound 0xProcessing webhook payload.
// 0xProcessing signs the raw JSON body using the merchant secret key; the signature
// is sent in the `X-Signature` header. Requires env var ZEROX_SECRET_KEY.
function "credits/provider_0xprocessing_verify_webhook" {
  description = "Verify 0xProcessing webhook signature"

  input {
    text raw_body {
      description = "Raw JSON request body as received"
    }

    text signature {
      description = "Value of the X-Signature header from the webhook request"
    }
  }

  stack {
    var $expected_signature {
      value = $input.raw_body|hmac_sha256:$env.ZEROX_SECRET_KEY
    }

    var $is_valid {
      value = $expected_signature == $input.signature
    }
  }

  response = {is_valid: $is_valid}

  guid = "d4LqN9wXpT2vY6oRmZfJ1cAeKb8"
}
