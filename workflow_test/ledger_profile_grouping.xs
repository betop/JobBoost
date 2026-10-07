workflow_test "ledger_profile_grouping" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "LPG", email: "lpg" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 50, created_by: $nil} } as $adm
    db.add profile { data = {full_name: "PROF_A", created_by: $adm.id, billing_admin_id: $adm.id} } as $pa
    db.add profile { data = {full_name: "PROF_B", created_by: $adm.id, billing_admin_id: $adm.id} } as $pb

    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, profile_id: $pa.id, related_log_table: "generation_log", input_tokens: 1000, output_tokens: 500} } as $c1
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, profile_id: $pa.id, related_log_table: "chat_log", input_tokens: 2000, output_tokens: 100} } as $c2
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, profile_id: $pb.id, related_log_table: "generation_log", input_tokens: 4000, output_tokens: 800} } as $c3
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, related_log_table: "generation_log", input_tokens: 300, output_tokens: 50} } as $c4
    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, profile_id: $pb.id, related_log_table: "generation_log", input_tokens: 100, output_tokens: 10, free_trial: true} } as $c5

    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id
      return = {type: "list"}
    } as $rows
    expect.to_equal ($rows|count) { value = 5 }

    // Group by profile the same way usage-summary does and check everything reconciles
    var $a_rows { value = $rows|filter:$$.profile_id == $pa.id }
    var $b_rows { value = $rows|filter:$$.profile_id == $pb.id }
    var $n_rows { value = $rows|filter:$$.profile_id == null }
    expect.to_equal ($a_rows|count) { value = 2 }
    expect.to_equal ($b_rows|count) { value = 2 }
    expect.to_equal ($n_rows|count) { value = 1 }

    var $sum_a { value = ($a_rows|map:$$.amount|sum)|round:8 }
    var $sum_b { value = ($b_rows|map:$$.amount|sum)|round:8 }
    var $sum_n { value = ($n_rows|map:$$.amount|sum)|round:8 }
    var $sum_all { value = ($rows|map:$$.amount|sum)|round:8 }
    expect.to_be_true (((($sum_a + $sum_b + $sum_n) - $sum_all)|abs) < 0.000001)
    // ledger amounts keep 5 decimals, so compare with a tolerance
    expect.to_be_true (((($sum_a) + $c1.charged + $c2.charged)|abs) < 0.00002)
    expect.to_be_true (((($sum_b) + $c3.charged)|abs) < 0.00002)
    expect.to_be_true (((($sum_n) + $c4.charged)|abs) < 0.00002)
    // free-trial row keeps its profile and bills 0
    expect.to_equal ($c5.charged) { value = 0 }
  }
  guid = "Lp4LedgerProfileGroupingTq8Zk"
}
