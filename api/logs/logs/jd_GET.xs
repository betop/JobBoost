// Fetch the (heavy) job_description of a single generation log on demand.
// logs/list intentionally omits it to keep the first load small.
// Access: super_admins any log; admins only logs of their assigned/created profiles.
query "logs/jd" verb=GET {
  api_group = "logs"
  auth = "users"

  input {
    uuid log_id
  }

  stack {
    db.get generation_log {
      field_name = "id"
      field_value = $input.log_id
    } as $log
  
    precondition ($log != null) {
      error_type = "notfound"
      error = "Log entry not found"
    }
  
    function.run "logs/can_access_log" {
      input = {user_id: $auth.id, log_id: $input.log_id}
    } as $allowed
  
    precondition ($allowed) {
      error_type = "accessdenied"
      error = "Not allowed"
    }
  }

  response = {id: $log.id, job_description: $log.job_description}
  guid = "Jd7mQ2xLpV9nRcT4sYhB8EaKfWz"
}
