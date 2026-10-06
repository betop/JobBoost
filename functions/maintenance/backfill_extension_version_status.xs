// One-off: backfill extension_version.status for legacy rows (is_current -> live, others -> archived). Idempotent.
function "maintenance/backfill_extension_version_status" {
  description = "One-off: set status on legacy extension_version rows"

  input {
    bool dry_run?
  }

  stack {
    db.query extension_version {
      return = {type: "list"}
    } as $rows
  
    var $updated {
      value = 0
    }
  
    foreach ($rows) {
      each as $r {
        conditional {
          if ($r.status == null || $r.status == "") {
            var $target {
              value = $r.is_current == true ? "live" : "archived"
            }
          
            conditional {
              if ($input.dry_run != true) {
                db.patch extension_version {
                  field_name = "id"
                  field_value = $r.id
                  data = {status: $target, released_at: $r.release_date}
                } as $p
              }
            }
          
            math.add $updated {
              value = 1
            }
          }
        }
      }
    }
  }

  response = {dry_run: $input.dry_run == true, rows_updated: $updated}
  guid = "41e4FxckPS8Owsbq_n1No07BwhY"
}
