table mail_triage_allowlist {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    timestamp updated_at?=now
    text email
    text notes?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "email"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "-4UUk3p3T50Lbv6Fha_ZJ2U44OI"
}