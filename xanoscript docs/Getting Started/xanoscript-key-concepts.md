# Documentation Index

Fetch the complete documentation index at: https://docs.xano.com/llms.txt
Use this file to discover all available pages before exploring further.

---

## Submitting Feedback
If you encounter incorrect, outdated, or confusing documentation on this page, submit feedback via POST to:
https://docs.xano.com/_mintlify/feedback/xano-997cb9ee/agent-feedback
Request body (JSON): `{ "path": "/current-page-path", "feedback": "Description of the issue" }`
Only submit feedback when you have something specific and actionable to report — do not submit feedback for every page you visit.

---

# XanoScript Key Concepts

> Get a quick primer of how XanoScript is written.

The goal of this page is to give you a quick walkthrough of how XanoScript works. By the end, you'll have a good understanding of how XanoScript is written and executed, how to work with data, and how to use functions and filters.

First, we'll cover primitives (basic building blocks), inputs, and logic stacks. After that, we'll cover variables and data manipulation, including dot notation, filters, and loops. Finally, we'll cover conditionals and provide some basic examples.

In each section, we'll provide a build along example to help you understand how to use the concepts.

## Primitives

A **primitive** is where everything starts. It represents a basic building block of anything you can build in Xano, such as APIs, AI Agents, or database tables. For each primitive, you will start by declaring the type of primitive and its name. An optional description can follow.

```javascript
// optional comment
<primitive_keyword> <name> <attribute_name>=<attribute_value> {
  <parameter_name> = <parameter_value>
  ...
}
```

For primitives that can have authentication enabled, you'll specify this in the parent object:

```javascript
// Returns a list of all users with formatted names and creation dates. 
query user_list verb=GET {
  auth = "user"
  ...
}
```

Each primitive type can have a different set of attributes required. For more information, see the [dedicated documentation for each primitive](/xanoscript/introduction#writexs).

### Inputs

Inputs are the data that the logic might need to perform its operation. They are declared in the input block of the primitives that support them. Inputs are optional, but the block must be declared even if empty.

```javascript
input {
  <type> <name>
}
```

Some common input types are `text`, `email`, `password`, `int`, `decimal`, and `enum`. For a complete reference, see [Data Types](/xanoscript/field-type-reference).

You can make inputs optional, required, lists, or apply filters to transform them before use. Here are the available options:

| Option                    | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `<input_name>?`           | Makes the input optional                            |
|                           | **Example:** `text name?`                           |
| `<input_type>?`           | Makes the input nullable                            |
|                           | **Example:** `text? name`                           |
| `required`                | Makes the input required by not specifying optional |
|                           | **Example:** `text name required`                   |
| `<input_type>[]`          | Makes the input a list                              |
|                           | **Example:** `text[] names`                         |
| `filters=<name>:<option>` | Applies filters to the input                        |
|                           | **Example:** `text name filters=trim|lower`         |

#### Build Along: Defining the Primitive
Let's declare an API called `user_list`. This is a GET API that will return a list of all users with formatted names and creation dates, and will use 'user' authentication. There will not be any inputs, but we still need to declare the input block.

```javascript
// Returns a list of all users with formatted names and creation dates. 
query user_list verb=GET {
  auth = "user"
  input {
  }
}
```

### Stacks

Stacks are the core building blocks of writing logic in XanoScript. Inside of a stack, you'll declare functions and their parameters. Functions begin with a **namespace** — basically, a category that the function is a part of. Each namespace is separated with a period. After the namespace, you'll declare the function name and any parameters the function requires. Functions can also have a description, which is optional.

```javascript
stack {
  // Get all records from the user table.
  db.query user {
    return = {type: "list"}
  } as $users
}
```

If a parameter is not specified, the default value or no value will be used, depending on the behavior of the function. If a function outputs to a variable, that is defined after the object is closed. This is done by using the `as` keyword followed by the variable name.

```javascript
// Get all records from the user table.
db.query user {
  return = {type: "list"}
} as $users
```

#### Build Along: Defining the Stack
Let's declare a stack that will query the user table and return a list of all users. Later, we'll expand on this stack to manipulate the data, but for now, we'll just return the list of users to a variable called `$users`.

```javascript
stack {
  // Get all records from the user table.
  db.query user {
    return = {type: "list"}
  } as $users
}
```

---

### Responses

Responses are the output of a primitive. They are declared in the response block of the primitive.

```javascript
response = {...}
```

#### Build Along: Defining the Response
Let's declare a response that will return the list of users.

```javascript
response = $users
```

---

### Settings

Settings are the configuration of a primitive. Sometimes, a primitive will have a settings block, and sometimes the settings are integrated into the most parent object.

If a setting is not specified, the default value or no value will be used, depending on the behavior of the primitive.

```javascript
response = $formatted_users

// keep profile data up to a maximum of 100 statements for the execution of this query
history = 100
```

---

#### Build Along: A simple API endpoint
Here's the complete API endpoint we've built so far. It's a simple GET API that returns a list of all users from the user table. We'll continue to iterate on this endpoint throughout the rest of the guide by adding the logic to transform the data with filters and a loop.

```javascript
// Query all user records
query all_users verb=GET {
  input {
  }

  stack {
    db.query user {
      return = {type: "list"}
    } as $model
  }

  response = $model
  
  // keep profile data up to a maximum of 100 statements for the execution of this query
  history = 100
}
```

---

## Variables and Data Manipulation

### Variables

Set and update variables using the `var` keyword.

```javascript
// Initialize an array to hold the formatted user data.
var $formatted_users {
  value = []
}
```

#### Build Along: Initializing a variable
Let's initialize a variable called `$formatted_users` that will hold the formatted user data.

```javascript
// Initialize an array to hold the formatted user data.
var $formatted_users {
  value = []
}
```

---

> For the following sections on Dot Notation and Filters, we'll be building a little out of order; don't worry, it'll make sense once we start building our loop.

### Dot Notation

Dot Notation is used to navigate inside of objects and arrays to target specific pieces of data.

In the following object, `{"a":"hello", "b":"world"}`, we can target the value of the `a` key using the dot notation. The object is, for the sake of this example, contained in a variable called `$x1`.

```javascript
$x1.a
```

The dot notation can also be used to target specific items in arrays the same way. Assuming the array is `["apple", "banana", "cherry"]` inside of a variable called `$x1`, we can target the value of the second item using the dot notation.

```javascript
$x1.1
```

#### Build Along: Using dot notation
In the API we're building, we'll be using dot notation to target specific values in each user object and manipulate them.

```javascript
$user_item.created_at
```

---

### Filters

Filters are used to manipulate data throughout your stack. They can be applied almost anywhere that data is generated or referenced; anything from creating a variable to manipulating the response object on the fly. They are applied using the `|` pipe character, and any filter options are separated by a colon immediately after.

```javascript
<data>|<filter_name>:<filter_option_1>:<filter_option_2>
```

The filter options do not have any prefixes; if you need to refer to the options a filter accepts, you can hover over the filter name in your IDE of choice, or while editing in the XanoScript editor.

![key-concepts-20251007-082259](https://mintcdn.com/xano-997cb9ee/NgWyYUIOE6OPGYha/images/key-concepts-20251007-082259.png?fit=max&auto=format&n=NgWyYUIOE6OPGYha&q=85&s=c096f3b3f78931bdc41d0577fbe98cdc)

![key-concepts-20251007-082404](https://mintcdn.com/xano-997cb9ee/NgWyYUIOE6OPGYha/images/key-concepts-20251007-082404.png?fit=max&auto=format&n=NgWyYUIOE6OPGYha&q=85&s=8216bfcaa770f5e53ec34ace7977bec1)

```javascript
"hello"|capitalize
```

```javascript
"hello"|concat:"world":
```

#### Build Along: Using filters
Let's use the `format_timestamp` filter to format the created_at value of a user so that it's human readable.

```javascript
$user_item.created_at|format_timestamp:"Y-m-d H:i:s"
```

---

### Loops

Loops are used to repeat a set of operations a certain number of times. XanoScript supports three different types of loops: For Each, For, and While.

In the example below, `$x1` is the variable that contains the list of items to iterate through. `$x2` is the variable that will hold each item as the loop iterates through it.

In the nested object, you can add any number of functions to be executed as part of the loop.

```javascript
foreach ($x1) {
  each as $x2 {
    util.sleep {
      value = 1
    }
  }
}
```

In the example below, `10` is the number of times the loop will run. `$index` is the variable that will hold the current iteration number, starting at 0.

```javascript
for (10) {
  each as $index {
    util.sleep {
      value = 1
    }
  }
}
```

For a while loop, in the example below, `<condition>` is the condition that will determine if the loop will continue to run, for example `$x1 = 10` would continue to run the loop while `$x1` equals 10.

For statements that evaluate to true, you don't need to specify the condition, as it will be assumed to be true by writing `while ($x1)` if, for example, we were checking to see if `$x1` was equal to true. For statements that evaluate to false, you need to specify the condition, as it will be assumed to be false by writing `while ($x1 == false)`.

You can specify multiple conditionals by using the `&&` operator for AND, or the `||` operator for OR. You can also use grouping to specify AND() and OR() groups, such as `while ($x1 == true && (1 < 2 && 2 > 3))`.

```javascript
while (<condition>) {
  each {
    util.sleep {
      value = 1
    }
  }
}
```

In the example below, we'll loop through our list of users and manipulate the data as we go.

#### Build Along: Using a loop
Let's use a loop to iterate through our list of users and manipulate the data with filters. The end result will give us a list of users with their names capitalized and their created_at values formatted.

```javascript
// Iterate through each user record to apply formatting.
foreach ($users) {
  each as $user_item {
    // Apply formatting expressions to the name and created_at fields.
    var $formatted_item {
      value = $user_item|set:"name":($user_item.name|to_upper)|set:"created_at":($user_item.created_at|format_timestamp:"Y-m-d H:i:s")
    }

    array.push $formatted_users {
      value = $formatted_item
    }
  }
}
```

---

### Conditionals

Conditionals are used to perform different actions based on the condition of a statement. XanoScript supports three different types of conditionals: If, Else, and Else If.

```javascript
conditional {
  if (<condition>) {
    ...
  }
  elseif (<condition>) {
    ...
  }
  else {
    ...
  }
}
```

#### Build Along: Using a conditional
Let's use a conditional to check and see if any users were returned. If not, we'll update the `formatted_users` variable to contain an error message.

```javascript
conditional {
  if ($formatted_users|is_empty) {
    var.update $formatted_users {
      value = "No users returned!"
    }
  }
}
```

---

### Expressions

Using the [expression data type](/the-function-stack/data-types/expression), you can combine multiple operations into a single line, or multiple lines, to traverse, transform and manipulate data. Expressions can be used anywhere data is accepted, such as function parameters, variable values, and conditionals.

```javascript
// Creates a variable using a simple expression
    var $x2 {
      value = 1 + 2 + (3|add:1|mul:2)
    }
```

Multi-line expressions are wrapped in triple backticks.

````javascript
// Creates a variable using a multi-line expression
    var $x1 {
      value = ```
        1 +
        2 +
        3
        ```
    }
````

---

## Basic Examples

### Get a user record by its ID

![key-concepts-20251007-085201](https://mintcdn.com/xano-997cb9ee/NgWyYUIOE6OPGYha/images/key-concepts-20251007-085201.png?fit=max&auto=format&n=NgWyYUIOE6OPGYha&q=85&s=42eece9c3d7133ac1de7dfebcb2d1dd8)

```javascript
// Get user record
query user/{user_id} verb=GET {
  input {
    int user_id? filters=min:1
  }

  stack {
    db.get user {
      field_name = "id"
      field_value = $input.user_id
    } as $model
  
    precondition ($model != null) {
      error_type = "notfound"
      error = "Not Found"
    }
  }

  response = $model
}
```

### Get a user record, capitalize the name, and make the `created_at` field human readable

![key-concepts-20251007-085915](https://mintcdn.com/xano-997cb9ee/NgWyYUIOE6OPGYha/images/key-concepts-20251007-085915.png?fit=max&auto=format&n=NgWyYUIOE6OPGYha&q=85&s=13819b9b6c43d6a374b7c1af06e9dc62)

```javascript
// Returns a list of all users with formatted names and creation dates.
query user_list verb=GET {
  input {
  }

  stack {
    // Get all records from the user table.
    db.query user {
      return = {type: "list"}
    } as $users
  
    // Initialize an array to hold the formatted user data.
    var $formatted_users {
      value = []
    }
  
    // Iterate through each user record to apply formatting.
    foreach ($users) {
      each as $user_item {
        // Apply formatting expressions to the name and created_at fields.
        var $formatted_item {
          value = $user_item|set:"name":($user_item.name|to_upper)|set:"created_at":($user_item.created_at|format_timestamp:"Y-m-d H:i:s")
        }
      
        // Add the newly formatted user object to the results array.
        array.push $formatted_users {
          value = $formatted_item
        }
      }
    }
  }

  response = $formatted_users
}
```

---

Built with [Mintlify](https://mintlify.com).
