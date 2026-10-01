// Global template visibility controls for admin users
// Stores comma-separated template IDs visible to admins.
table template_visibility {
  schema {
    int id
    text admin_visible_template_ids?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
  ]
  guid = "1zf33Vhdrr55NymaSR02J8cezR0"
}
