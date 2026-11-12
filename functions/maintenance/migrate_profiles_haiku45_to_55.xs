// One-off migration: moves profiles that still store ai_model = "claude-haiku-4-5" to "claude-haiku-5-5".
// Why: Haiku 4.5 became selectable again as a legacy model on 2026-11-12. Profiles that stored 4.5
// from before the Haiku 5.5 switch had been running on 5.5 (ai/resolve_model mapped 4.5 to 5.5), and
// the owner chose to keep them on 5.5. Without this, re-allowing 4.5 would silently move them back to 4.5.
// Only the ai_model field is changed. Idempotent: once migrated, a profile no longer matches.
// Pass dry_run=true to only report what would change (updated stays 0).
// Profiles are few, so a single list query is used instead of paging.
function "maintenance/migrate_profiles_haiku45_to_55" {
  description = "One-off: move profiles storing claude-haiku-4-5 to claude-haiku-5-5"

  input {
    bool dry_run?
  }

  stack {
    var $updated { value = 0 }
    var $sample { value = [] }

    db.query profile {
      where = $db.profile.ai_model == "claude-haiku-4-5"
      sort = {profile.created_at: "asc"}
      return = {type: "list"}
    } as $matches

    var $matched { value = $matches|count }

    foreach ($matches) {
      each as $p {
        conditional {
          if (!$input.dry_run) {
            db.patch profile {
              field_name = "id"
              field_value = $p.id
              data = {ai_model: "claude-haiku-5-5"}
            } as $_patched

            math.add $updated { value = 1 }
          }
        }

        conditional {
          if (($sample|count) < 10) {
            array.push $sample {
              value = $p.id
            }
          }
        }
      }
    }
  }

  response = {
    dry_run: $input.dry_run
    matched: $matched
    updated: $updated
    sample : $sample
  }
  guid = "Mg7Haiku45To55ProfileMigrateZr"
}
