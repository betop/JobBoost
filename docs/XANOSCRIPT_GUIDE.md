# XanoScript – Consolidated Guide (Project Notes)

This document is an original, repo-local guide that summarizes the XanoScript patterns we use in this workspace (tables/APIs/functions/tasks/middleware/addons/tests), plus a small set of conventions to keep the backend consistent with the Admin Panel and Chrome extension.

## 1) What XanoScript is (in this repo)

XanoScript files (`.xs`) are declarative definitions of Xano objects.

- Tables live in `tables/`
- API endpoints live in `apis/<group>/`
- Reusable logic lives in `functions/`
- Middleware lives in `middlewares/`
- Addons live in `addons/`
- Scheduled jobs live in `tasks/`
- Workflow tests live in `workflow_tests/`

Each object uses a top-level block like `table ... { ... }`, `query ... { ... }`, or `function ... { ... }`.

## 2) Common building blocks

### Variables

Create variables with `var` and update them with `var.update`:

```xanoscript
var $x {
  value = 123
}

var.update $x {
  value = $x + 1
}
```

### Control flow

Use `conditional { if (...) { ... } elseif (...) { ... } else { ... } }` for branching and `foreach (...) { each as item { ... } }` for list iteration.

### Preconditions (errors)

Use `precondition` to fail fast with a structured error.

```xanoscript
precondition ($input.id == null) {
  error_type = "badrequest"
  error = "Missing id"
  payload = { code: "INVALID_INPUT" }
}
```

Wrap risky blocks with `try_catch` if you need recovery.

## 3) Tables

Tables declare schema + indexes. Schemas must start with a primary key field (`uuid id` or `int id`). Relations are declared by adding a `{ table = "other_table" }` block on a field.

Example shape:

```xanoscript
table example {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    text name?
    uuid owner_id? { table = "admin" }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
  ]
}
```

Notes:

- `?` indicates an optional/nullable field.
- Defaults can be expressed with `=now` on timestamps.

## 4) Database operations (inside stacks)

The most common database statement is `db.query`.

Simple list:

```xanoscript
db.query profile as $profiles
```

Custom query with where/sort/paging and return type:

```xanoscript
db.query profile {
  where = $db.profile.id == $input.id
  sort = {profile.created_at: "desc"}
  return = { type: "single" }
} as $profile
```

Joins can be expressed using a `join = { ... }` object.

## 5) APIs (queries)

API endpoints are `query` blocks with:

- `input { ... }` for request params/body
- `stack { ... }` for execution steps
- `response = ...` for the returned value

Example:

```xanoscript
query "/profiles" verb=GET {
  auth = { required = true }

  input {
  }

  stack {
    db.query profile as $profiles
  }

  response = $profiles
}
```

Auth is typically enforced at the query level (`auth = { required = true }`) and validated again with `precondition` checks where needed.

## 6) Custom functions

Custom functions are reusable stacks with typed inputs and a response value.

```xanoscript
function helpers/example {
  input {
    text name
  }

  stack {
    var $greeting { value = "Hello "|concat:$input.name }
  }

  response = $greeting
}
```

Call a function using `function.run`:

```xanoscript
function.run helpers/example {
  input = { name: "Sam" }
} as $result
```

## 7) Middleware

Middleware can run `pre` and/or `post` around queries. Inputs usually include:

- `json vars` (shared variables)
- `enum type` (`"pre"` / `"post"`)

Middleware can merge or replace responses; use it for cross-cutting concerns like auth checks, shared headers, or audit logging.

## 8) Addons

Addons are small, reusable DB-query fragments. Keep them query-focused (single DB read/query) so they’re safe to reuse and fast.

## 9) Filters (expressions)

Filters transform values inline: `value|filter:arg1:arg2`.

Common examples:

- Text cleanup: `trim`, `to_lower`, `contains`
- Security: `sha256`, `uuid`
- Time: `to_timestamp`, `format_timestamp`, `add_secs_to_timestamp`
- Array/object helpers: `count`, `entries`, `create_object`, `json_encode`

## 10) Tests

Xano supports embedded unit tests in functions/queries and multi-step workflow tests.

For this project, we focus tests on:

- Admin login
- Token validation
- Resume generation happy-path + common error paths

## 11) Project conventions (Resume Generator)

### API contract sources

- Admin Panel contract: `admin-panel/src/services/*`
- Extension contract: `resume-extension/background.js`

### Auth models

- Admin panel uses Bearer JWT (`Authorization: Bearer <admin_token>`)
- Extension uses Bearer access token (`Authorization: Bearer <token>`) for public endpoints

### Token validation

Recommended approach:

- Always validate `is_active`
- Enforce `expires_at` if present
- Prefer comparing a hash of the incoming token to a stored hash

### Resume generation

- Stateless: do not store job descriptions or generated documents
- Enforce a max length on `job_description`
- Fetch profile + education + work experience + active rules, then call your AI provider

