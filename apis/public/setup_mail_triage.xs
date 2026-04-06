// Temporary function to create mail-triage 0.1.1 and set as current
query "admin/setup-mail-triage" verb=POST {
  api_group = "public"

  input {
  }

  stack {
    db.add extension_version {
      data = {
        extension_name: "mail-triage"
        version       : "0.1.1"
        release_date  : now
        is_current    : true
        changelog     : "Initial version"
      }
    } as $new_version
  }

  response = {
    success: true
    message: "mail-triage 0.1.1 created and set as current"
    id     : $new_version.id
  }
}