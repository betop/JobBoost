// Update template IDs visible to admin users (super_admin only)
query "dashboard/template-visibility" verb=PATCH {
  api_group = "dashboard"
  auth = "users"

  input {
    int[] admin_visible_template_ids?
  }

  stack {
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user

    precondition ($auth_user != null && $auth_user.type == "super_admin") {
      error_type = "accessdenied"
      error = "Only super admins can update template visibility"
    }

    precondition ($input.admin_visible_template_ids != null && ($input.admin_visible_template_ids|count) > 0) {
      error_type = "badrequest"
      error = "At least one template must remain visible"
    }

    var $ids_csv {
      value = $input.admin_visible_template_ids|join:","
    }

    db.get template_visibility {
      field_name = "id"
      field_value = 1
    } as $cfg

    conditional {
      if ($cfg == null) {
        db.add template_visibility {
          data = {
            id                        : 1
            admin_visible_template_ids: $ids_csv
            updated_at                : now
          }
        } as $_created
      }
      else {
        db.patch template_visibility {
          field_name = "id"
          field_value = 1
          data = {
            admin_visible_template_ids: $ids_csv
            updated_at                : now
          }
        } as $_updated
      }
    }
  }

  response = {
    admin_visible_template_ids: $input.admin_visible_template_ids
  }
  guid = "-SSk-UqAb6AbcIoliphtRVeAdDk"
}
