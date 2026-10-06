workflow_test "issue_access_token" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "KEYBIDDER", email: "keybidder" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, is_approved: true, created_by: $nil} } as $bidder
    db.add users { data = {full_name: "KEYADMIN", email: "keyadmin" ~ $sfx ~ "@t.invalid", type: "admin", is_active: true, is_approved: true, created_by: $nil} } as $adm

    function.run "tokens/issue_access_token" { input = {user_id: $bidder.id, created_by_admin_id: $adm.id} } as $issued
    expect.to_not_be_null ($issued.token)
    expect.to_equal ($issued.token_hash) { value = $issued.token|sha256 }

    db.get access_token {
      field_name = "id"
      field_value = $issued.token_id
    } as $row
    expect.to_not_be_null ($row)
    expect.to_equal ($row.user_id) { value = $bidder.id }
    expect.to_equal ($row.created_by_admin_id) { value = $adm.id }
    expect.to_equal ($row.token) { value = $issued.token }
    expect.to_equal ($row.token_hash) { value = $issued.token|sha256 }
    expect.to_be_true ($row.is_active)
    expect.to_be_false ($row.is_used)
    expect.to_be_null ($row.expires_at)
  }
  guid = "Wt9IssueAccessTokenTestKq4Lm2"
}
