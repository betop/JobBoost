// Dashboard stats
// super_admins: see all profiles, users, tokens, rules
// admins: see only profiles/users/tokens/rules for bidders they created or are assigned
query "dashboard/stats" verb=GET {
  api_group = "dashboard"
  auth = "users"

  input {
  }

  stack {
    // Get auth user to determine access scope
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    conditional {
      if ($auth_user.type == "super_admin") {
        // Super admin: see everything
        db.query profile {
          return = {type: "count"}
        } as $total_profiles
      
        db.query users {
          return = {type: "count"}
        } as $total_bidders
      
        db.query access_token {
          where = $db.access_token.is_active == true
          return = {type: "count"}
        } as $active_tokens
      
        db.query rule {
          where = $db.rule.is_active == true
          return = {type: "count"}
        } as $active_rules
      }
    
      else {
        // Admin: only see metrics for assigned bidders
        db.query users {
          where = $db.users.type == "bidder"
          return = {type: "list"}
        } as $all_bidders
      
        // Build assigned IDs list (handle null)
        var $assigned {
          value = $auth_user.assigned_bidder_ids
        }
      
        conditional {
          if ($assigned == null) {
            var.update $assigned {
              value = []
            }
          }
        }
      
        // Filter to bidders created by or assigned to this admin
        var $my_bidders {
          value = []
        }
      
        foreach ($all_bidders) {
          each as $u {
            conditional {
              if ($u.created_by == $auth.id) {
                array.push $my_bidders {
                  value = $u
                }
              }
            
              else {
                foreach ($assigned) {
                  each as $bid {
                    conditional {
                      if ($bid == $u.id) {
                        array.push $my_bidders {
                          value = $u
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      
        // Build set of bidder IDs for filtering
        var $my_bidder_ids {
          value = []
        }
      
        foreach ($my_bidders) {
          each as $b {
            array.push $my_bidder_ids {
              value = $b.id
            }
          }
        }
      
        // Count total bidders
        var $total_bidders {
          value = $my_bidders|count
        }
      
        // Count profiles owned by my bidders
        db.query profile {
          return = {type: "list"}
        } as $all_profiles
      
        var $my_profiles {
          value = []
        }
      
        foreach ($all_profiles) {
          each as $prof {
            foreach ($my_bidder_ids) {
              each as $bid_id {
                conditional {
                  if ($prof.user_id == $bid_id) {
                    array.push $my_profiles {
                      value = $prof
                    }
                  }
                }
              }
            }
          }
        }
      
        var $total_profiles {
          value = $my_profiles|count
        }
      
        // Count active tokens for my bidders
        db.query access_token {
          where = $db.access_token.is_active == true
          return = {type: "list"}
        } as $all_tokens
      
        var $my_tokens {
          value = []
        }
      
        foreach ($all_tokens) {
          each as $tok {
            foreach ($my_bidder_ids) {
              each as $bid_id {
                conditional {
                  if ($tok.user_id == $bid_id) {
                    array.push $my_tokens {
                      value = $tok
                    }
                  }
                }
              }
            }
          }
        }
      
        var $active_tokens {
          value = $my_tokens|count
        }
      
        // Count active rules for my bidders
        db.query rule {
          where = $db.rule.is_active == true
          return = {type: "list"}
        } as $all_rules
      
        var $my_rules {
          value = []
        }
      
        foreach ($all_rules) {
          each as $rule {
            foreach ($my_bidder_ids) {
              each as $bid_id {
                conditional {
                  if ($rule.user_id == $bid_id) {
                    array.push $my_rules {
                      value = $rule
                    }
                  }
                }
              }
            }
          }
        }
      
        var $active_rules {
          value = $my_rules|count
        }
      }
    }
  }

  response = {
    total_profiles: $total_profiles
    total_bidders : $total_bidders
    active_tokens : $active_tokens
    active_rules  : $active_rules
  }
}