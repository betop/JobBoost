// One-off backfill: adds every existing profile email missing from the Mail Triage allowlist.
// Idempotent. dry_run=true (default) only reports; pass dry_run=false to actually add.
// Returns counts and the list of emails that would be / were added.
function "maintenance/backfill_profile_emails_to_allowlist" {
  description = "One-off: allowlist all existing profile emails for Mail Triage (dry run by default)"

  input {
    bool dry_run?=true
    int per_page?=200
  }

  stack {
    var $scanned { value = 0 }
    var $no_email { value = 0 }
    var $already { value = 0 }
    var $to_add { value = [] }
    var $added { value = 0 }
    var $errors { value = 0 }
    var $done { value = false }
    var $page { value = 1 }

    for (1000) {
      each as $_iter {
        conditional {
          if (!$done) {
            db.query profile {
              sort = {profile.created_at: "asc"}
              return = {type: "list", paging: {page: $page, per_page: $input.per_page}}
            } as $batch

            conditional {
              if (($batch.items|count) < $input.per_page) {
                var.update $done { value = true }
              }
            }

            math.add $page { value = 1 }

            foreach ($batch.items) {
              each as $p {
                math.add $scanned { value = 1 }
                var $em { value = ($p.email|first_notnull:"")|trim|to_lower }

                conditional {
                  if ($em == "") {
                    math.add $no_email { value = 1 }
                  }
                  else {
                    db.query mail_triage_allowlist {
                      where = $db.mail_triage_allowlist.email == $em
                      return = {type: "single"}
                    } as $ex

                    conditional {
                      if ($ex != null || ($to_add|contains:$em)) {
                        math.add $already { value = 1 }
                      }
                      else {
                        array.push $to_add { value = $em }

                        conditional {
                          if ($input.dry_run == false) {
                            try_catch {
                              try {
                                function.run "mail_triage/ensure_allowlisted" {
                                  input = {email: $em, notes: "Backfilled from profile " ~ ($p.full_name|first_notnull:"")}
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
      }
    }

    var $result {
      value = {
        dry_run          : $input.dry_run
        profiles_scanned : $scanned
        profiles_no_email: $no_email
        already_allowlisted: $already
        to_add_count     : $to_add|count
        added            : $added
        errors           : $errors
        emails           : $to_add
      }
    }
  }

  response = $result
  guid = "dx9cqPjBXY72CYM50C28-gpPO90"
}
