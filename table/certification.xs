// A certification the admin entered for a profile. When a profile has any, resume generation uses exactly these
// (see generate_POST / regenerate_POST); when it has none, the AI proposes certifications as before.
table certification {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    uuid profile_id? {
      table = "profile"
    }

    text name?
    text issuer?
    text issued_date?
    text url?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "qE5QnLx_nPGghSEcojngHZji3qo"
}
