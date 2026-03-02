// Dashboard stats
query "dashboard/stats" verb=GET {
  api_group = "dashboard"
  auth = "admin"

  input {
  }

  stack {
    db.query profile {
      return = {type: "count"}
    } as $total_profiles
  
    db.query bidder {
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

  response = {
    total_profiles: $total_profiles
    total_bidders : $total_bidders
    active_tokens : $active_tokens
    active_rules  : $active_rules
  }
}