table education {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now {
      visibility = "private"
    }
  
    uuid profile_id? {
      table = "profile"
    }
  
    text university_name?
    text degree_title?
    text field_of_study?
    date start_date?
    date end_date?
    text location?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "a4kw7-CszLx6Nhsnuv4j7Xg2F2Y"
}