// Shapes an extension_version row for API responses (status derived for legacy rows).
function "extension/format_version" {
  description = "Response shape for an extension_version row"

  input {
    json row
    text released_by_name?
  }

  stack {
    function.run "extension/derive_status" {
      input = {is_current: $input.row.is_current, status: $input.row.status, released_at: $input.row.released_at}
    } as $status
  }

  response = {
    id                   : $input.row.id
    extension_name       : $input.row.extension_name
    version              : $input.row.version
    release_date         : $input.row.release_date
    is_current           : $input.row.is_current == true
    status               : $status
    changelog            : $input.row.changelog
    min_extension_version: $input.row.min_extension_version
    notes                : $input.row.notes
    file_name            : $input.row.file_name
    file_size            : $input.row.file_size
    file_url             : $input.row.file_url
    released_at          : $input.row.released_at
    released_by          : $input.row.released_by
    released_by_name     : $input.released_by_name
    created_by           : $input.row.created_by
    created_at           : $input.row.created_at
  }
  guid = "FS-_XFRS7O6d2BWz_cUCdaFL7po"
}
