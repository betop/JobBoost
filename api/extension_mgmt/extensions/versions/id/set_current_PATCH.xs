// PATCH /extensions/versions/{id}/set-current  (super_admin only)
// Releases the version: is_current=true, status="live", released_at=now, released_by=caller.
// The previously live version of the same extension becomes status "archived", is_current=false.
// Releasing an archived version is a rollback. Returns {success, version, status}.
query "extensions/versions/{id}/set-current" verb=PATCH {
  api_group = "extension_mgmt"
  auth = "users"

  input {
    uuid id?
  }

  stack {
    function.run "extension/assert_super_admin" {
      input = {user_id: $auth.id}
    } as $caller
  
    precondition ($input.id != null) {
      error_type = "inputerror"
      error = "id is required"
    }
  
    function.run "extension/release_version" {
      input = {version_id: $input.id, released_by: $auth.id}
    } as $updated
  }

  response = {success: true, version: $updated.version, status: $updated.status}
  guid = "vjNxBfZkulxnoY8aemeQh-aVNYs"
}
