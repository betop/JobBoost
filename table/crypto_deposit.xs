// crypto_deposit table — tracks USDT (and other crypto) top-up requests via payment provider (NOWPayments)
// status lifecycle: pending -> confirmed | failed | expired | partially_paid
// partially_paid: the customer sent less crypto than required (crypto_received < amount_crypto);
// a top-up (NOWPayments child payment, parent_payment_id = payment_id) can complete it -> confirmed.
// payment_id: NOWPayments payment id of the original payment; currency / amount_crypto / pay_address
// are taken from that payment (pay_currency / pay_amount / pay_address).
// crypto_received: total crypto received so far, original payment plus counted top-ups.
table crypto_deposit {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid admin_id? {
      table = "users"
    }
  
    text provider?="nowpayments"
    text external_invoice_id?
    text currency?
    decimal amount_usd?
    decimal amount_crypto?
    text pay_address?
    text payment_url?
    text status?="pending"
    text payment_id?
    decimal crypto_received?
    json raw_webhook_payload?
    timestamp confirmed_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "admin_id"}]}
    {type: "btree", field: [{name: "external_invoice_id"}]}
    {type: "btree", field: [{name: "status"}]}
    {type: "btree", field: [{name: "payment_id"}]}
  ]

  guid = "k3Nd2vQpR8mXaT1oLzYhBc9EsWf"
}
