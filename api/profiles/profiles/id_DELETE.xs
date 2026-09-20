// Delete profile (only if not linked to bidder)
// Admins can only delete profiles they created or are assigned to
query "profiles/{id}" verb=DELETE {
  api_group = "profiles"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    db.get profile {
      field_name = "id"
      field_value = $input.id
    } as $p
  
    precondition ($p != null) {
      error_type = "notfound"
      error = "Profile not found"
    }
  
    // Access control: admins can only delete their own created/assigned profiles
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    conditional {
      if ($auth_user.type != "super_admin") {
        var $has_access {
          value = false
        }
      
        conditional {
          if ($p.created_by == $auth.id) {
            var.update $has_access {
              value = true
            }
          }
        }
      
        conditional {
          if ($auth_user.profile_ids != null) {
            foreach ($auth_user.profile_ids) {
              each as $pid {
                conditional {
                  if ($pid == $p.id) {
                    var.update $has_access {
                      value = true
                    }
                  }
                }
              }
            }
          }
        }
      
        precondition ($has_access) {
          error_type = "accessdenied"
          error = "You do not have access to this profile"
        }
      }
    }
  
    // Count bidder assignments using users.profile_ids (array)
    db.query users {
      return = {type: "list"}
    } as $users_list

    var $bidder_count {
      value = 0
    }

    foreach ($users_list) {
      each as $u {
        conditional {
          if ($u.type == "bidder" && $u.profile_ids != null) {
            var $bidder_has_profile {
              value = false
            }

            foreach ($u.profile_ids) {
              each as $pid {
                conditional {
                  if ($pid == $p.id) {
                    var.update $bidder_has_profile {
                      value = true
                    }
                  }
                }
              }
            }

            conditional {
              if ($bidder_has_profile) {
                var.update $bidder_count {
                  value = $bidder_count + 1
                }
              }
            }
          }
        }
      }
    }

    precondition ($bidder_count == 0) {
      error_type = "accessdenied"
      error = "Profile is assigned to a bidder"
    }

    // Remove this profile from users.profile_ids (e.g. admins/super_admins)
    // before deleting the profile row, so FK array references are cleaned up.
    foreach ($users_list) {
      each as $u {
        conditional {
          if ($u.profile_ids != null) {
            var $new_profile_ids {
              value = []
            }

            var $has_profile_ref {
              value = false
            }

            foreach ($u.profile_ids) {
              each as $pid {
                conditional {
                  if ($pid == $p.id) {
                    var.update $has_profile_ref {
                      value = true
                    }
                  }

                  else {
                    array.push $new_profile_ids {
                      value = $pid
                    }
                  }
                }
              }
            }

            conditional {
              if ($has_profile_ref) {
                db.patch users {
                  field_name = "id"
                  field_value = $u.id
                  data = {
                    profile_ids: $new_profile_ids
                  }
                } as $_updated_user
              }
            }
          }
        }
      }
    }
  
    db.bulk.delete education {
      where = $db.education.profile_id == $p.id
    } as $_deleted_edu

    db.bulk.delete work_experience {
      where = $db.work_experience.profile_id == $p.id
    } as $_deleted_work

    // generation_log.profile_id is a non-nullable UUID FK. Patching it to null
    // becomes "" and raises 22P02. Delete the logs so the profile row can go.
    db.bulk.delete generation_log {
      where = $db.generation_log.profile_id == $p.id
    } as $_deleted_logs

    db.del profile {
      field_name = "id"
      field_value = $p.id
    }
  }

  response = {success: true}
  guid = "8L7JitSgSnzX6pGhLzA79_bU8j0"
}