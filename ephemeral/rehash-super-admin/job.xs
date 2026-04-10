// One-time job: re-hash the super_admin password in the users table
// Patches user with email "info@fo-star.com" so password_hash is a proper bcrypt hash

function main {
  input {}

  stack {
    // Fetch the super_admin user by email
    db.get users {
      field_name = "email"
      field_value = "info@fo-star.com"
    } as $user

    precondition ($user != null) {
      error_type = "notfound"
      error = "super_admin user not found"
    }

    // Hash the plaintext password using Xano's built-in bcrypt hasher
    security.hash_password {
      text_password = "tA@9k#1xaSw3"
    } as $hashed

    // Patch the record with the pre-hashed value using rawQuery to bypass auto-hashing
    db.rawQuery {
      query = "UPDATE users SET password_hash = :hash WHERE email = :email"
      params = {hash: $hashed, email: "info@fo-star.com"}
    } as $result
  }

  response = {
    success : true
    user_id : $user.id
    email   : $user.email
    message : "Password hash updated successfully"
  }
}
