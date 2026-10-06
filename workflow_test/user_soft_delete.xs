workflow_test "user_soft_delete" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }

    // designated billing admin that gets soft-deleted
    db.add users { data = {full_name: "SDADMIN", email: "sdadmin" ~ $sfx ~ "@t.invalid", type: "admin", is_active: true, is_approved: true, created_by: $nil} } as $adm
    // regular creator admin (fallback target)
    db.add users { data = {full_name: "SDCREATOR", email: "sdcreator" ~ $sfx ~ "@t.invalid", type: "admin", is_active: true, is_approved: true, created_by: $nil} } as $creator
    db.add profile { data = {full_name: "SDPROF " ~ $sfx, billing_admin_id: $adm.id, created_by: $creator.id} } as $prof

    // before delete: designated admin is billed
    function.run "credits/resolve_profile_billing_admin" { input = {profile_id: $prof.id} } as $r1
    expect.to_equal ($r1.billing_admin_id) { value = $adm.id }

    // soft delete (same patch as users/{id} DELETE)
    db.patch users {
      field_name = "id"
      field_value = $adm.id
      data = {deleted: true, is_active: false, updated_at: now}
    } as $_

    db.get users {
      field_name = "id"
      field_value = $adm.id
    } as $after
    expect.to_not_be_null ($after)
    expect.to_equal ($after.full_name) { value = "SDADMIN" }
    expect.to_be_true ($after.deleted)
    expect.to_be_false ($after.is_active)

    // deleted designated admin is skipped; falls through to profile creator
    function.run "credits/resolve_profile_billing_admin" { input = {profile_id: $prof.id} } as $r2
    expect.to_equal ($r2.billing_admin_id) { value = $creator.id }

    // a deleted admin acting directly is not billable
    function.run "credits/resolve_billing_admin" { input = {user_id: $adm.id} } as $r3
    expect.to_be_false ($r3.is_billable)
    expect.to_be_null ($r3.billing_admin_id)

    // a bidder whose creator was deleted is not billed to the deleted admin
    db.add users { data = {full_name: "SDBIDDER", email: "sdbidder" ~ $sfx ~ "@t.invalid", type: "bidder", is_active: true, created_by: $adm.id} } as $bid
    function.run "credits/resolve_billing_admin" { input = {user_id: $bid.id} } as $r4
    expect.to_be_false ($r4.is_billable)
  }
  guid = "Sd7UserSoftDeleteTestQ2wXp9Lk"
}
