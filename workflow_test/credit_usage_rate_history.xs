workflow_test "credit_usage_rate_history" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "RATEH", email: "rateh" ~ $sfx ~ "@t.invalid", type: "admin", credit_balance: 15, created_by: $nil} } as $adm

    // Force the configured rate to 1.5 (remember the original row to restore it)
    db.query billing_setting {
      sort = {billing_setting.created_at: "asc"}
      return = {type: "single"}
    } as $orig
    var $setting_id { value = null }
    var $orig_rate { value = null }
    conditional {
      if ($orig == null) {
        db.add billing_setting { data = {usage_rate: 1.5} } as $created
        var.update $setting_id { value = $created.id }
      }
      else {
        var.update $setting_id { value = $orig.id }
        var.update $orig_rate { value = $orig.usage_rate }
        db.patch billing_setting {
          field_name = "id"
          field_value = $orig.id
          data = {usage_rate: 1.5}
        } as $_p1
      }
    }

    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, raw_cost_usd: 0.004, related_log_table: "generation_log", input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 0, cache_read_tokens: 0} } as $c1
    expect.to_equal ($c1.charged) { value = 0.006 }

    db.patch billing_setting {
      field_name = "id"
      field_value = $setting_id
      data = {usage_rate: 2}
    } as $_p2

    function.call "credits/credit_charge_usage" { input = {admin_id: $adm.id, raw_cost_usd: 0.003, related_log_table: "generation_log", input_tokens: 400, output_tokens: 300, cache_creation_tokens: 100, cache_read_tokens: 200} } as $c2
    expect.to_equal ($c2.charged) { value = 0.006 }

    // Restore the original configuration
    conditional {
      if ($orig == null) {
        db.del billing_setting {
          field_name = "id"
          field_value = $setting_id
        }
      }
      else {
        db.patch billing_setting {
          field_name = "id"
          field_value = $setting_id
          data = {usage_rate: $orig_rate}
        } as $_p3
      }
    }

    // Same aggregation the usage summary performs over tracked rows
    db.query credit_transaction {
      where = $db.credit_transaction.admin_id == $adm.id && $db.credit_transaction.type == "usage"
      sort = {credit_transaction.created_at: "asc"}
      return = {type: "list"}
    } as $rows
    var $tracked { value = $rows|filter:$$.input_tokens != null }
    var $tracked_amount { value = (0 - ($tracked|map:$$.amount|sum))|round:6 }
    var $total_tokens { value = ($tracked|map:$$.input_tokens|sum) + ($tracked|map:$$.output_tokens|sum) + ($tracked|map:$$.cache_creation_tokens|sum) + ($tracked|map:$$.cache_read_tokens|sum) }

    expect.to_equal ($rows|count) { value = 2 }
    expect.to_equal ($rows[0].usage_rate) { value = 1.5 }
    expect.to_equal ($rows[1].usage_rate) { value = 2 }
    // 0.004*1.5 + 0.003*2 = 0.012 (a recompute at the current rate of 2 would give 0.014)
    expect.to_equal ($tracked_amount) { value = 0.012 }
    expect.to_equal ($total_tokens) { value = 2500 }
  }
  guid = "Rt9UsageRateHistoryQ3vNb7Kx"
}
