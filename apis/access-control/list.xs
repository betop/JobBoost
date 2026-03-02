// List all access control records (enriched from access_token)
query "access-control" verb=GET {
  api_group = "access-control"
  auth = "admin"

  input {
  }

  stack {
    db.query access_token {
      sort = {access_token.created_at: "desc"}
      return = {type: "list"}
    } as $tokens
  
    var $out {
      value = []
    }
  
    foreach ($tokens) {
      each as $t {
        var $bidder_name {
          value = null
        }
      
        var $profile_id {
          value = null
        }
      
        var $profile_name {
          value = null
        }
      
        var $granted_by {
          value = null
        }
      
        conditional {
          if ($t.bidder_id != null) {
            db.get bidder {
              field_name = "id"
              field_value = $t.bidder_id
            } as $bid
          
            conditional {
              if ($bid != null) {
                var.update $bidder_name {
                  value = $bid.full_name
                }
              
                var.update $profile_id {
                  value = $bid.profile_id
                }
              
                conditional {
                  if ($bid.profile_id != null) {
                    db.get profile {
                      field_name = "id"
                      field_value = $bid.profile_id
                    } as $prof
                  
                    conditional {
                      if ($prof != null) {
                        var.update $profile_name {
                          value = $prof.full_name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      
        conditional {
          if ($t.created_by_admin_id != null) {
            db.get admin {
              field_name = "id"
              field_value = $t.created_by_admin_id
            } as $adm
          
            conditional {
              if ($adm != null) {
                var.update $granted_by {
                  value = $adm.name
                }
              }
            }
          }
        }
      
        array.push $out {
          value = {
            id             : $t.id
            bidder_id      : $t.bidder_id
            bidder_name    : $bidder_name
            profile_id     : $profile_id
            profile_name   : $profile_name
            granted_by     : $granted_by
            granted_date   : $t.issued_at
            expiration_date: $t.expires_at
            is_active      : $t.is_active
          }
        }
      }
    }
  }

  response = $out
}