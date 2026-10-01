// credit_transaction table — ledger of all credit balance changes for admin accounts
// type: "deposit" (positive amount, via crypto_deposit), "usage" (negative amount, AI usage charge x1.5), "adjustment" (manual, either sign)
table credit_transaction {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid admin_id? {
      table = "users"
    }
  
    text type?
    decimal amount?
    decimal balance_after?
    text related_log_table?
    uuid related_log_id?
    uuid related_deposit_id? {
      table = "crypto_deposit"
    }
  
    text note?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "admin_id"}]}
    {type: "btree", field: [{name: "type"}]}
  ]

  guid = "p9VtLm3XqZ7oKbA2cNsWd5RfYg1"
}
