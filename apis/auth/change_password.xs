// Change password for the currently authenticated admin
query "auth/change-password" verb=POST {
  api_group = "auth"
  auth = "admin"

  input {
    email email? filters=trim|lower
    text current_password?
    text new_password? filters=min:8
  }

  stack {
    precondition ($input.email != null && $input.email != "") {
      error_type = "inputerror"
      error = "Email is required"
    }
  
    precondition ($input.current_password != null && $input.current_password != "") {
      error_type = "inputerror"
      error = "Current password is required"
    }
  
    precondition ($input.new_password != null && $input.new_password != "") {
      error_type = "inputerror"
      error = "New password is required"
    }
  
    // Look up admin by email
    db.get admin {
      field_name = "email"
      field_value = $input.email
    } as $admin
  
    precondition ($admin != null) {
      error_type = "notfound"
      error = "Admin not found"
    }
  
    // Verify current password
    security.check_password {
      text_password = $input.current_password
      hash_password = $admin.password_hash
    } as $pass_ok
  
    precondition ($pass_ok) {
      error_type = "accessdenied"
      error = "Current password is incorrect"
    }
  
    // Update the password (Xano auto-hashes password-type fields on patch)
    db.patch admin {
      field_name = "id"
      field_value = $admin.id
      data = {password_hash: $input.new_password}
    }
  }

  response = {
    success: true
    message: "Password changed successfully"
  }
}