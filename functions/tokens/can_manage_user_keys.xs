// Single source of truth for "may this caller manage access keys of this user?".
// allowed = true when the caller is an existing, non-deleted super_admin (any target), or an existing,
// non-deleted ADMIN and the target is (a) the caller, or (b) a non-deleted bidder created_by the caller
// or listed in the caller's assigned_bidder_ids. Missing/deleted caller or target -> false.
function "tokens/can_manage_user_keys" {
  description = "Scope rule for creating/managing access keys of a target user"

  input {
    uuid caller_id
    uuid target_user_id
  }

  stack {
    var $allowed {
      value = false
    }

    db.get users {
      field_name = "id"
      field_value = $input.caller_id
    } as $caller

    db.get users {
      field_name = "id"
      field_value = $input.target_user_id
    } as $target

    conditional {
      if ($caller != null && $caller.deleted != true && $target != null && $target.deleted != true) {
        conditional {
          if ($caller.type == "super_admin") {
            var.update $allowed {
              value = true
            }
          }
        }

        conditional {
          if ($caller.type == "admin") {
            conditional {
              if (($caller.id|to_text) == ($target.id|to_text)) {
                var.update $allowed {
                  value = true
                }
              }
            }

            conditional {
              if ($target.type == "bidder") {
                conditional {
                  if ($target.created_by != null && ($target.created_by|to_text) == ($caller.id|to_text)) {
                    var.update $allowed {
                      value = true
                    }
                  }
                }

                conditional {
                  if ($caller.assigned_bidder_ids != null) {
                    foreach ($caller.assigned_bidder_ids) {
                      each as $aid {
                        conditional {
                          if (($aid|to_text) == ($target.id|to_text)) {
                            var.update $allowed {
                              value = true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    var $result {
      value = {allowed: $allowed}
    }
  }

  response = $result

  guid = "Cm8CanManageUserKeysFnQ7rTv3Nd"
}
