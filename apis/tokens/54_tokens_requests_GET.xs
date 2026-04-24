// List key requests
// Admins see their own requests, super_admins see all
query "tokens/requests" verb=GET {
  api_group = "tokens"
  auth = "users"

  input {
    text status?
  }

  stack {
    // Get authenticated user
    db.get users {
      field_name = "id"
      field_value = $auth.id
    } as $auth_user
  
    // Fetch all requests
    db.query token_request {
      sort = {token_request.created_at: "desc"}
      return = {type: "list"}
    } as $requests
  
    var $out {
      value = []
    }
  
    foreach ($requests) {
      each as $r {
        // Admins only see their own requests
        var $include {
          value = false
        }
      
        conditional {
          if ($auth_user.type == "super_admin") {
            var.update $include {
              value = true
            }
          }
        }
      
        conditional {
          if ($auth_user.type == "admin" && $r.requested_by == $auth.id) {
            var.update $include {
              value = true
            }
          }
        }
      
        // Apply status filter if provided
        conditional {
          if ($input.status != null && $input.status != "" && $r.status != $input.status) {
            var.update $include {
              value = false
            }
          }
        }
      
        conditional {
          if ($include) {
            // Get requester name
            var $requester_name {
              value = null
            }
          
            conditional {
              if ($r.requested_by != null) {
                db.get users {
                  field_name = "id"
                  field_value = $r.requested_by
                } as $requester
              
                conditional {
                  if ($requester != null) {
                    var.update $requester_name {
                      value = $requester.full_name
                    }
                  }
                }
              }
            }
          
            // Get bidder name
            var $user_name_val {
              value = null
            }
          
            conditional {
              if ($r.user_id != null) {
                db.get users {
                  field_name = "id"
                  field_value = $r.user_id
                } as $bid
              
                conditional {
                  if ($bid != null) {
                    var.update $user_name_val {
                      value = $bid.full_name
                    }
                  }
                }
              }
            }
          
            // Get reviewer name
            var $reviewer_name {
              value = null
            }
          
            conditional {
              if ($r.reviewed_by != null) {
                db.get users {
                  field_name = "id"
                  field_value = $r.reviewed_by
                } as $reviewer
              
                conditional {
                  if ($reviewer != null) {
                    var.update $reviewer_name {
                      value = $reviewer.full_name
                    }
                  }
                }
              }
            }
          
            array.push $out {
              value = {
                id                : $r.id
                requested_by      : $r.requested_by
                requester_name    : $requester_name
                user_id           : $r.user_id
                user_name         : $user_name_val
                expiration_date   : $r.expiration_date
                status            : $r.status
                admin_notes       : $r.admin_notes
                review_notes      : $r.review_notes
                reviewed_by       : $r.reviewed_by
                reviewer_name     : $reviewer_name
                reviewed_at       : $r.reviewed_at
                generated_token_id: $r.generated_token_id
                created_at        : $r.created_at
              }
            }
          }
        }
      }
    }
  }

  response = $out
}