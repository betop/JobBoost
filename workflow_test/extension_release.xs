workflow_test "extension_release" {
  stack {
    security.create_uuid as $nil
    var $sfx { value = (now|to_timestamp) ~ "" }
    var $a_ver { value = "9" ~ $sfx ~ ".1" }
    var $b_ver { value = "9" ~ $sfx ~ ".2" }

    // validation
    function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: " " ~ $a_ver ~ " ", file_name: "Setup.ZIP", file_size: 1000} } as $v1
    expect.to_equal ($v1.version) { value = $a_ver }

    // drafts (rollback-able rows use a throwaway name-less sandbox: swiftcv with unique versions)
    db.add extension_version { data = {extension_name: "swiftcv", version: $a_ver, release_date: now, is_current: false, status: "draft", created_by: $nil} } as $a
    db.add extension_version { data = {extension_name: "swiftcv", version: $b_ver, release_date: now, is_current: false, status: "draft", created_by: $nil} } as $b

    // snapshot current live row so we can restore it
    db.query extension_version {
      where = $db.extension_version.extension_name == "swiftcv" && $db.extension_version.is_current == true && $db.extension_version.id != $a.id
      return = {type: "list"}
    } as $prev_live

    // draft -> live
    function.run "extension/release_version" { input = {version_id: $a.id, released_by: $nil} } as $ra
    expect.to_equal ($ra.status) { value = "live" }
    expect.to_be_true ($ra.is_current)
    expect.to_equal ($ra.released_by) { value = $nil }
    expect.to_not_be_null ($ra.released_at)

    // second release archives the first
    function.run "extension/release_version" { input = {version_id: $b.id, released_by: $nil} } as $rb
    expect.to_equal ($rb.status) { value = "live" }
    db.get extension_version {
      field_name = "id"
      field_value = $a.id
    } as $a2
    expect.to_equal ($a2.status) { value = "archived" }
    expect.to_be_false ($a2.is_current)
    db.query extension_version {
      where = $db.extension_version.extension_name == "swiftcv" && $db.extension_version.is_current == true
      return = {type: "list"}
    } as $live_now
    expect.to_equal ($live_now|count) { value = 1 }

    // rollback to the archived one
    function.run "extension/release_version" { input = {version_id: $a.id, released_by: $nil} } as $rr
    expect.to_equal ($rr.status) { value = "live" }
    db.get extension_version {
      field_name = "id"
      field_value = $b.id
    } as $b2
    expect.to_equal ($b2.status) { value = "archived" }
    expect.to_be_false ($b2.is_current)

    // delete of the live version is refused, archived one is allowed
    var $okdel { value = false }
    try_catch {
      try {
        function.run "extension/assert_deletable" { input = {version_id: $a.id} } as $x1
        var.update $okdel { value = true }
      }
      catch {
        debug.log { value = "live delete refused" }
      }
    }
    expect.to_be_false ($okdel)
    function.run "extension/assert_deletable" { input = {version_id: $b.id} } as $x2
    expect.to_equal ($x2.id) { value = $b.id }

    // derived status
    function.run "extension/derive_status" { input = {is_current: true} } as $d1
    expect.to_equal ($d1) { value = "live" }
    function.run "extension/derive_status" { input = {is_current: false, released_at: now} } as $d2
    expect.to_equal ($d2) { value = "archived" }
    function.run "extension/derive_status" { input = {is_current: false} } as $d3
    expect.to_equal ($d3) { value = "draft" }
    function.run "extension/derive_status" { input = {is_current: false, status: "draft"} } as $d4
    expect.to_equal ($d4) { value = "draft" }

    // duplicate rejected
    var $ok1 { value = false }
    try_catch {
      try {
        function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: $a_ver} } as $dup
        var.update $ok1 { value = true }
      }
      catch {
        debug.log { value = "rejected" }
      }
    }
    expect.to_be_false ($ok1)
    function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: $a_ver, exclude_id: $a.id} } as $okdup
    expect.to_equal ($okdup.version) { value = $a_ver }

    // bad inputs
    var $ok2 { value = false }
    try_catch {
      try {
        function.run "extension/validate_release_input" { input = {extension_name: "other", version: "1.0"} } as $bad1
        var.update $ok2 { value = true }
      }
      catch {
        debug.log { value = "rejected" }
      }
    }
    expect.to_be_false ($ok2)
    var $ok3 { value = false }
    try_catch {
      try {
        function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: "1.x"} } as $bad2
        var.update $ok3 { value = true }
      }
      catch {
        debug.log { value = "rejected" }
      }
    }
    expect.to_be_false ($ok3)
    var $ok4 { value = false }
    try_catch {
      try {
        function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: "7.7.7", file_name: "a.exe", file_size: 10} } as $bad3
        var.update $ok4 { value = true }
      }
      catch {
        debug.log { value = "rejected" }
      }
    }
    expect.to_be_false ($ok4)
    var $ok5 { value = false }
    try_catch {
      try {
        function.run "extension/validate_release_input" { input = {extension_name: "swiftcv", version: "7.7.7", file_name: "a.zip", file_size: 104857601} } as $bad4
        var.update $ok5 { value = true }
      }
      catch {
        debug.log { value = "rejected" }
      }
    }
    expect.to_be_false ($ok5)

    // cleanup: remove test rows, restore previous live version(s)
    db.del extension_version {
      field_name = "id"
      field_value = $a.id
    }
    db.del extension_version {
      field_name = "id"
      field_value = $b.id
    }
    foreach ($prev_live) {
      each as $p {
        db.patch extension_version {
          field_name = "id"
          field_value = $p.id
          data = {is_current: true, status: "live"}
        } as $restored
      }
    }
  }
  guid = "Ex7ReleaseFlowTestK2mQp9Zd"
}
