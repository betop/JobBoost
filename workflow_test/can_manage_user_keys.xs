workflow_test "can_manage_user_keys" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    db.add users { data = {full_name: "SCOPESUPER", email: "scopesuper" ~ $sfx ~ "@t.invalid", type: "super_admin", is_active: true, is_approved: true, created_by: $nil} } as $sa
    db.add users { data = {full_name: "SCOPEADM1", email: "scopeadm1" ~ $sfx ~ "@t.invalid", type: "admin", is_active: true, is_approved: true, created_by: $nil} } as $a1
    db.add users { data = {full_name: "SCOPEADM2", email: "scopeadm2" ~ $sfx ~ "@t.invalid", type: "admin", is_active: true, is_approved: true, created_by: $nil} } as $a2
    db.add users { data = {full_name: "SCOPEB1", email: "scopeb1" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, is_approved: true, created_by: $a1.id} } as $b1
    db.add users { data = {full_name: "SCOPEB2", email: "scopeb2" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, is_approved: true, created_by: $a2.id} } as $b2
    db.add users { data = {full_name: "SCOPEBDEL", email: "scopebdel" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, is_approved: true, deleted: true, created_by: $a1.id} } as $bdel
    db.add users { data = {full_name: "SCOPEBASG", email: "scopebasg" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, is_approved: true, created_by: $nil} } as $basg
    db.patch users {
      field_name = "id"
      field_value = $a1.id
      data = {assigned_bidder_ids: [$basg.id]}
    } as $a1p

    function.run "tokens/can_manage_user_keys" { input = {caller_id: $sa.id, target_user_id: $b2.id} } as $r1
    expect.to_be_true ($r1.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $a1.id} } as $r2
    expect.to_be_true ($r2.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $b1.id} } as $r3
    expect.to_be_true ($r3.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $basg.id} } as $r4
    expect.to_be_true ($r4.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $b2.id} } as $r5
    expect.to_be_false ($r5.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $a2.id} } as $r6
    expect.to_be_false ($r6.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $a1.id, target_user_id: $bdel.id} } as $r7
    expect.to_be_false ($r7.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $b1.id, target_user_id: $b1.id} } as $r8
    expect.to_be_false ($r8.allowed)
    function.run "tokens/can_manage_user_keys" { input = {caller_id: $nil, target_user_id: $b1.id} } as $r9
    expect.to_be_false ($r9.allowed)

    function.run "tokens/issue_access_token" { input = {user_id: $b1.id, created_by_admin_id: $a1.id} } as $iss
    function.run "tokens/can_manage_key" { input = {caller_id: $a1.id, token_id: $iss.token_id} } as $k1
    expect.to_be_true ($k1.allowed)
    function.run "tokens/can_manage_key" { input = {caller_id: $a2.id, token_id: $iss.token_id} } as $k2
    expect.to_be_false ($k2.allowed)
    function.run "tokens/can_manage_key" { input = {caller_id: $sa.id, token_id: $nil} } as $k3
    expect.to_be_false ($k3.found)
  }
  guid = "Wt9CanManageUserKeysTestJd5Hs1"
}
