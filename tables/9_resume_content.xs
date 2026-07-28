table resume_content {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text raw_response?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "r7lbZzrT0J7FG-DP_NMLba9P4tE"
}