// Add one or more companies to the blacklist (case-insensitive de-dupe against existing entries)
query blacklist verb=POST {
  api_group = "profiles"
  auth = "users"

  input {
    text name?
    json names?
  }

  stack {
    var $names_to_add {
      value = []
    }
  
    conditional {
      if ($input.names != null && ($input.names|count) > 0) {
        var.update $names_to_add {
          value = $input.names
        }
      }
    }
  
    conditional {
      if ($input.name != null && $input.name != "") {
        var.update $names_to_add {
          value = $names_to_add|push:$input.name
        }
      }
    }
  
    precondition (($names_to_add|count) > 0) {
      error_type = "badrequest"
      error = "name or names is required"
    }
  
    db.query blacklisted_company {
      return = {type: "list"}
    } as $existing_list
  
    var $existing_lower {
      value = []
    }
  
    foreach ($existing_list) {
      each as $e {
        var.update $existing_lower {
          value = $existing_lower|push:($e.name|to_lower|trim)
        }
      }
    }
  
    var $added {
      value = []
    }
  
    var $skipped {
      value = []
    }
  
    foreach ($names_to_add) {
      each as $n {
        var $n_trimmed {
          value = $n|trim
        }
      
        var $n_lower {
          value = $n_trimmed|to_lower
        }
      
        conditional {
          if ($n_trimmed != "") {
            var $already_exists {
              value = false
            }
          
            foreach ($existing_lower) {
              each as $el {
                conditional {
                  if ($el == $n_lower) {
                    var.update $already_exists {
                      value = true
                    }
                  }
                }
              }
            }
          
            conditional {
              if ($already_exists) {
                var.update $skipped {
                  value = $skipped|push:$n_trimmed
                }
              }
            
              else {
                try_catch {
                  try {
                    db.add blacklisted_company {
                      data = {
                        name      : $n_trimmed
                        created_at: now
                        created_by: $auth.id
                      }
                    } as $new_entry
                  
                    var.update $added {
                      value = $added|push:$n_trimmed
                    }
                  
                    var.update $existing_lower {
                      value = $existing_lower|push:$n_lower
                    }
                  }
                
                  catch {
                    var.update $skipped {
                      value = $skipped|push:$n_trimmed
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

  response = {added: $added, skipped: $skipped}
  guid = "UITX0vc1d6lE8uGTBtu3D1cdGw0"
}