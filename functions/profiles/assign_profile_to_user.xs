// Appends a profile id to users.profile_ids (null-safe, no duplicates, idempotent).
// Reads the user with db.get (a plain db.query list once omitted newly added columns in production).
// Returns {added: bool}. Callers that must not fail (profile creation) wrap this in try_catch.
function "profiles/assign_profile_to_user" {
  description = "Add a profile id to a user's profile_ids if missing (idempotent)"

  input {
    uuid user_id
    uuid profile_id
  }

  stack {
    var $added {
      value = false
    }

    db.get users {
      field_name = "id"
      field_value = $input.user_id
    } as $u

    conditional {
      if ($u != null) {
        // Rebuild the list with a loop (the contains filter proved unreliable on arrays):
        // keeps order, drops duplicates, appends the profile id if missing.
        var $next {
          value = []
        }

        var $found {
          value = false
        }

        var $changed {
          value = false
        }

        var $seen {
          value = []
        }

        conditional {
          if ($u.profile_ids != null) {
            foreach ($u.profile_ids) {
              each as $pid {
                var $pid_text {
                  value = $pid|to_text
                }

                var $dup {
                  value = false
                }

                foreach ($seen) {
                  each as $s {
                    conditional {
                      if ($s == $pid_text) {
                        var.update $dup {
                          value = true
                        }
                      }
                    }
                  }
                }

                conditional {
                  if ($dup) {
                    var.update $changed {
                      value = true
                    }
                  }

                  else {
                    array.push $seen {
                      value = $pid_text
                    }

                    array.push $next {
                      value = $pid
                    }

                    conditional {
                      if ($pid_text == ($input.profile_id|to_text)) {
                        var.update $found {
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

        conditional {
          if (!$found) {
            array.push $next {
              value = $input.profile_id
            }

            var.update $changed {
              value = true
            }

            var.update $added {
              value = true
            }
          }
        }

        conditional {
          if ($changed) {
            db.patch users {
              field_name = "id"
              field_value = $u.id
              data = {profile_ids: $next, updated_at: now}
            } as $_patched
          }
        }
      }
    }
  }

  response = {added: $added}
  guid = "aSsIgnPr0f1leT0UserXq7Lm2Ko"
}
