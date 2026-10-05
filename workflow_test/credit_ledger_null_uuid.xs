workflow_test "credit_ledger_null_uuid" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "ASTRO", email: "astro" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $astro

    function.call "credits/credit_charge_usage" { input = {admin_id: $astro.id, raw_cost_usd: 0.0023} } as $r1
    expect.to_equal ($r1.new_balance) { value = 14.99655 }
    function.call "credits/credit_charge_usage" { input = {admin_id: $astro.id, raw_cost_usd: 0.0023, related_log_table: "generation_log", related_log_id: $nil} } as $r2
    expect.to_equal ($r2.new_balance) { value = 14.9931 }
    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $astro.id
      return = {type: "list"}
    } as $txns
    expect.to_equal ($txns|count) { value = 2 }
    expect.to_be_null ($txns[0].related_deposit_id)
    // adjustment-style row (no related_* at all)
    db.add credit_transaction { data = {admin_id: $astro.id, type: "adjustment", amount: 1, balance_after: 16, note: "n"} } as $adj
    expect.to_be_null ($adj.related_deposit_id)
    db.get users {
      field_name = "id"
      field_value = $astro.id
    } as $u
    expect.to_equal ($u.credit_balance) { value = 14.9931 }
  }
  guid = "Zc3NullUuidLedgerTestAb12cD9"
}
