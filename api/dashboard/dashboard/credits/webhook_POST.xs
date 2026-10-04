// Deprecated endpoint. Kept only to prevent accidental use of the old URL.
// Use /dashboard/credits/webhook-nowpayments instead.
query "dashboard/credits/webhook" verb=POST {
  api_group = "dashboard"

  input {
  }

  stack {
    precondition (1 == 0) {
      error_type = "notfound"
      error = "This webhook endpoint has been removed. Use /dashboard/credits/webhook-nowpayments"
    }
  }

  response = {received: false, outcome: "deprecated"}

  guid = "d3WvQ8pLmR5tN1oYsXaFj7cZeKb"
}
