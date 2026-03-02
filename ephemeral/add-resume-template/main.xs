function main {
  input {}

  stack {
    db.rawQuery {
      query = "ALTER TABLE profile ADD COLUMN IF NOT EXISTS resume_template INT NOT NULL DEFAULT 1"
    } as $result
  }

  response = { success: true, result: $result }
}
