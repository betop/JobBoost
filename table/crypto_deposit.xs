// crypto_deposit table — tracks USDT (BEP20/TRC20) top-up requests via payment provider (0xProcessing)
// status lifecycle: pending -> confirmed | failed | expired
table crypto_deposit {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid admin_id? {
      table = "users"
    }
  
    text provider?="0xprocessing"
    text external_invoice_id?
    text currency?
    decimal amount_usd?
    decimal amount_crypto?
    text pay_address?
    text payment_url?
    text status?="pending"
    json raw_webhook_payload?
    timestamp confirmed_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "admin_id"}]}
    {type: "btree", field: [{name: "external_invoice_id"}]}
    {type: "btree", field: [{name: "status"}]}
  ]

  guid = "k3Nd2vQpR8mXaT1oLzYhBc9EsWf"
}
