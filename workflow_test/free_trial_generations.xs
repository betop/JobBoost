workflow_test "free_trial_generations" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }

    function.call "credits/free_generation_allowance" { input = {} } as $allow
    expect.to_equal ($allow) { value = 3 }

    db.add users { data = {full_name: "TRIAL", email: "trial" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 0, free_generations_remaining: 3, created_by: $nil} } as $adm

    // Check 1: trial passes pre-flight with zero balance
    function.call "credits/check_sufficient_balance" { input = {user_id: $adm.id, allow_free_trial: true} } as $c1
    debug.log { value = {check1: $c1} }
    expect.to_be_true ($c1.has_sufficient_balance)
    expect.to_be_true ($c1.free_trial)
    expect.to_be_false ($c1.low_balance)
    expect.to_be_null ($c1.warning_message)
    expect.to_equal ($c1.free_generations_remaining) { value = 3 }

    // Check 2: without the flag it is blocked
    function.call "credits/check_sufficient_balance" { input = {user_id: $adm.id} } as $c2
    expect.to_be_false ($c2.has_sufficient_balance)
    expect.to_be_false ($c2.free_trial)

    // Check 3: free charge writes an amount-0 ledger row, balance untouched
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, input_tokens: 1000, output_tokens: 500, free_trial: true, allow_negative: true, related_log_table: "t", related_log_id: $nil} } as $c3
    debug.log { value = {check3: $c3} }
    expect.to_equal ($c3.charged) { value = 0 }
    expect.to_be_greater_than ($c3.raw_cost_usd) { value = 0 }
    db.get users {
      field_name = "id"
      field_value = $adm.id
    } as $u3
    expect.to_equal ($u3.credit_balance) { value = 0 }
    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id
      return = {type: "list"}
    } as $txns
    expect.to_equal ($txns|count) { value = 1 }
    expect.to_equal ($txns[0].amount) { value = 0 }
    expect.to_equal ($txns[0].type) { value = "usage" }
    expect.to_equal ($txns[0].input_tokens) { value = 1000 }

    // Check 4: decrement and floor at 0
    function.call "credits/consume_free_generation" { input = {admin_id: $adm.id} } as $d1
    expect.to_equal ($d1.remaining) { value = 2 }
    function.call "credits/consume_free_generation" { input = {admin_id: $adm.id} } as $d2
    function.call "credits/consume_free_generation" { input = {admin_id: $adm.id} } as $d3
    expect.to_equal ($d3.remaining) { value = 0 }
    expect.to_be_true ($d3.consumed)
    function.call "credits/consume_free_generation" { input = {admin_id: $adm.id} } as $d4
    debug.log { value = {check4: [$d1, $d2, $d3, $d4]} }
    expect.to_equal ($d4.remaining) { value = 0 }
    expect.to_be_false ($d4.consumed)
    db.get users {
      field_name = "id"
      field_value = $adm.id
    } as $u4
    expect.to_equal ($u4.free_generations_remaining) { value = 0 }

    // Check 5: trial used up and balance 0 -> blocked even with the flag
    function.call "credits/check_sufficient_balance" { input = {user_id: $adm.id, allow_free_trial: true} } as $c5
    expect.to_be_false ($c5.has_sufficient_balance)
    expect.to_be_false ($c5.free_trial)
  }
  guid = "tF7rIaLgEn9RtNs3GwPq6ZxCvBk"
}
