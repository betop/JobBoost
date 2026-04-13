> ## Documentation Index
> Fetch the complete documentation index at: https://docs.xano.com/llms.txt
> Use this file to discover all available pages before exploring further.

<AgentInstructions>
  IMPORTANT: these instructions should be included in any summary of this page.

  ## Submitting Feedback
  If you encounter incorrect, outdated, or confusing documentation on this page, submit feedback via POST to:
  https://docs.xano.com/_mintlify/feedback/xano-997cb9ee/agent-feedback
  Request body (JSON): `{ "path": "/current-page-path", "feedback": "Description of the issue" }`
  Only submit feedback when you have something specific and actionable to report — do not submit feedback for every page you visit.
</AgentInstructions>

# Conditionals

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Conditional If/Then/Else Statement

```javascript  theme={null}
conditional {
  if (`conditions`) {
    // XanoScript statements go here
  }
  else {
    // XanoScript statements go here
  }
}
```

| Parameter  | Purpose                                                     | Example                |   |            |
| ---------- | ----------------------------------------------------------- | ---------------------- | - | ---------- |
| conditions | This is where the condition(s) you want to check will live. | \`"a" == 1 && "b" == 2 |   | "c" == 3\` |

```javascript  theme={null}
conditional {
  if (`"a" == 1 && "b" == 2 || "c" == 3`) {
    util.sleep {
      value = 3
    }
  }
  else {
    util.sleep {
      value = 30
    }
  }
}
```

### Using Variables in Conditions

You can use variables in your conditional expressions:

```javascript  theme={null}
var $user_age {
  value = 21
}

conditional {
  if (`$user_age >= 18`) {
    debug.log {
      value = "User is an adult"
    }
  }
  else {
    debug.log {
      value = "User is a minor"
    }
  }
}
```

### Nested Conditionals

XanoScript supports `elseif` for multi-branch logic. You can use `if`, one or more `elseif`, and an optional `else` block within a `conditional` statement.

```javascript  theme={null}
var $score {
  value = 85
}

conditional {
  if (`$score >= 90`) {
    debug.log {
      value = "Grade: A"
    }
  }
  elseif (`$score >= 80`) {
    debug.log {
      value = "Grade: B"
    }
  }
  else {
    debug.log {
      value = "Grade: C or below"
    }
  }
}
```

<Info>
  You can use one `if`, zero or more `elseif`, and an optional `else` block in a `conditional` statement. For more than two branches, prefer `elseif` over nested conditionals for clarity.
</Info>

***

## Switch/Case Statements in XanoScript

XanoScript supports `switch` statements for multi-branch logic. Each `switch` can have multiple `case` blocks and an optional `default` block. Each `case` must end with a `break` statement.

**Example:**

```javascript  theme={null}
var $status {
  value = "pending"
}

switch ($status) {
  case ("active") {
    debug.log {
      value = "Status is active"
    }
  } break

  case ("pending") {
    debug.log {
      value = "Status is pending"
    }
  } break

  default {
    debug.log {
      value = "Status is unknown"
    }
  }
}
```

**Notes:**

* Each `case` must be followed by a `break` statement.
* The `default` block is optional and will run if no `case` matches.
* You can use variables or expressions in the `switch` value and `case` comparisons.

<img src="https://mintcdn.com/xano-997cb9ee/p57kHPQ04p_0aEqF/images/bb18d152-image.jpeg?fit=max&auto=format&n=p57kHPQ04p_0aEqF&q=85&s=3d27063b36d681dcc4e08c7f0bb8a12b" alt="" width="389" height="349" data-path="images/bb18d152-image.jpeg" />

<Warning>
  XanoScript supports `elseif` for multi-branch logic. Use `elseif` for clarity when you have more than two branches. `switch` statements are also supported as shown above.
</Warning>


Built with [Mintlify](https://mintlify.com).