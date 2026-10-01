// Get template IDs visible to admin users
query "dashboard/template-visibility" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user

    precondition ($auth_user != null) {
      error_type = "accessdenied"
      error = "Unauthorized"
    }

    precondition ($auth_user.type == "admin" || $auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Unauthorized"
    }

    db.get template_visibility {
      field_name = "id"
      field_value = 1
    } as $cfg

    var $visible_template_ids {
      value = []
    }

    conditional {
      if ($cfg != null && $cfg.admin_visible_template_ids != null && $cfg.admin_visible_template_ids != "") {
        foreach (($cfg.admin_visible_template_ids|split:",")) {
          each as $tid {
            conditional {
              if (($tid|trim) != "") {
                var.update $visible_template_ids {
                  value = $visible_template_ids|push:($tid|trim|to_int)
                }
              }
            }
          }
        }
      }
      else {
        for (20) {
          each as $idx {
            var.update $visible_template_ids {
              value = $visible_template_ids|push:($idx + 1)
            }
          }
        }
      }
    }
  }

  response = {
    admin_visible_template_ids: $visible_template_ids
  }
  guid = "WdX4dftpDXhbDXkEU9Dk5PsS6Wg"
}
