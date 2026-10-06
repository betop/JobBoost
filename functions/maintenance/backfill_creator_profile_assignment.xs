// One-off backfill: every profile created by an (undeleted) admin must be in that admin's users.profile_ids.
// Only admins are touched (never bidders or super admins). Idempotent.
// dry_run=true (default) only reports; pass dry_run=false to apply.
function "maintenance/backfill_creator_profile_assignment" {
  description = "One-off: add admin-created profiles to the creating admin's profile_ids (dry run by default)"

  input {
    bool dry_run?=true
  }

  stack {
    var $scanned { value = 0 }
    var $skipped_non_admin { value = 0 }
    var $already { value = 0 }
    var $added { value = 0 }
    var $errors { value = 0 }
    var $entries { value = [] }

    db.query profile {
      return = {type: "list"}
    } as $profiles

    foreach ($profiles) {
      each as $p {
        math.add $scanned { value = 1 }

        conditional {
          if ($p.created_by == null) {
            math.add $skipped_non_admin { value = 1 }
          }
          else {
            db.get users {
              field_name = "id"
              field_value = $p.created_by
            } as $u

            conditional {
              if ($u == null || $u.type != "admin" || $u.deleted == true) {
                math.add $skipped_non_admin { value = 1 }
              }
              else {
                var $has { value = false }

                conditional {
                  if ($u.profile_ids != null) {
                    foreach ($u.profile_ids) {
                      each as $pid {
                        conditional {
                          if (($pid|to_text) == ($p.id|to_text)) {
                            var.update $has { value = true }
                          }
                        }
                      }
                    }
                  }
                }

                conditional {
                  if ($has) {
                    math.add $already { value = 1 }
                  }
                  else {
                    array.push $entries {
                      value = {admin_email: $u.email, profile_id: $p.id, profile_name: $p.full_name}
                    }

                    conditional {
                      if ($input.dry_run == false) {
                        try_catch {
                          try {
                            function.run "profiles/assign_profile_to_user" {
                              input = {user_id: $u.id, profile_id: $p.id}
                            } as $r
                            math.add $added { value = 1 }
                          }
                          catch {
                            math.add $errors { value = 1 }
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
      value = {
        dry_run          : $input.dry_run
        profiles_scanned : $scanned
        skipped_non_admin: $skipped_non_admin
        already_assigned : $already
        to_add_count     : $entries|count
        added            : $added
        errors           : $errors
        entries          : $entries
      }
    }
  }

  response = $result
  guid = "bKfLlCrEaToRaSsIgNx9Pq4Wd2E"
}
