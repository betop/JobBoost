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

# Text

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Append Text

```javascript  theme={null}
    text.append $myText {
      value = "Text to append"
    }
```

| Parameter | Purpose                                                 | Example          |
| --------- | ------------------------------------------------------- | ---------------- |
| \$myText  | This is the variable that contains the text to target   | \$myText         |
| value     | This is the text to append to the text in the variable. | "Text to append" |

<Accordion title="Example">
  ```javascript  theme={null}
      text.append $myText {
        value = "Text to append"
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/ClU5W_-qt6GI3QWZ/images/3fa91b5a-image.jpeg?fit=max&auto=format&n=ClU5W_-qt6GI3QWZ&q=85&s=415bb07e81261af50e88477098fb00fb" alt="" width="410" height="42" data-path="images/3fa91b5a-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Prepend

```javascript  theme={null}
    text.prepend $myText {
      value = "Text to prepend"
    }
```

| Parameter | Purpose                                                 | Example          |
| --------- | ------------------------------------------------------- | ---------------- |
| \$myText  | This is the variable that contains the text to target   | \$myText         |
| value     | This is the text to append to the text in the variable. | "Text to append" |

<Accordion title="Example">
  ```javascript  theme={null}
      text.prepend $myText {
        value = "Text to prepend"
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/_Sd90ZcMa6hsPScv/images/cc15180e-image.jpeg?fit=max&auto=format&n=_Sd90ZcMa6hsPScv&q=85&s=fe45bdfeedfd9e5c848c54186d2edaf6" alt="" width="407" height="38" data-path="images/cc15180e-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Trim

```javascript  theme={null}
    text.trim $myText {
      value = "Text to trim"
    }
```

| Parameter | Purpose                                                                                             | Example        |
| --------- | --------------------------------------------------------------------------------------------------- | -------------- |
| \$myText  | This is the variable that contains the text to target                                               | \$myText       |
| value     | The text you'd like to trim. If you do not provide a value, blank space will be trimmed by default. | "Text to trim" |

<Accordion title="Example">
  ```javascript  theme={null}
      text.trim $myText {
        value = "Text to trim"
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/dyVYERTquSXdpw_-/images/9f327c25-image.jpeg?fit=max&auto=format&n=dyVYERTquSXdpw_-&q=85&s=e18728362f39f4a1172a19a656744784" alt="" width="212" height="39" data-path="images/9f327c25-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Left Trim

```javascript  theme={null}
    text.ltrim $myText {
      value = "Text to trim"
    }
```

| Parameter | Purpose                                                                                             | Example        |
| --------- | --------------------------------------------------------------------------------------------------- | -------------- |
| \$myText  | This is the variable that contains the text to target                                               | \$myText       |
| value     | The text you'd like to trim. If you do not provide a value, blank space will be trimmed by default. | "Text to trim" |

<Accordion title="Example">
  ```javascript  theme={null}
      text.ltrim $myText {
        value = "Text to trim"
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/Zmn_DUDgqMkazo6J/images/e4f2f449-image.jpeg?fit=max&auto=format&n=Zmn_DUDgqMkazo6J&q=85&s=47a1efbea9e10cceb7de8752f2845783" alt="" width="246" height="40" data-path="images/e4f2f449-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Right Trim

```javascript  theme={null}
    text.rtrim $myText {
      value = "Text to trim"
    }
```

| Parameter | Purpose                                                                                             | Example        |
| --------- | --------------------------------------------------------------------------------------------------- | -------------- |
| \$myText  | This is the variable that contains the text to target                                               | \$myText       |
| value     | The text you'd like to trim. If you do not provide a value, blank space will be trimmed by default. | "Text to trim" |

<Accordion title="Example">
  ```javascript  theme={null}
      text.rtrim $myText {
        value = "Text to trim"
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/nsvdyKK4Dg7VUAZs/images/8f336ac4-image.jpeg?fit=max&auto=format&n=nsvdyKK4Dg7VUAZs&q=85&s=af3f2f7daaf7065e23de8603c8c70eba" alt="" width="255" height="37" data-path="images/8f336ac4-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Starts With

```javascript  theme={null}
    text.starts_with $myText {
      value = "Search text"
    } as $textFound
```

<Check>
  This function is also available as a **case-insensitive version** as:

  ```javascript  theme={null}
  text.istarts_with $myText {
    value = "Search text"
  } as $textFound
  ```
</Check>

| Parameter   | Purpose                                               | Example       |
| ----------- | ----------------------------------------------------- | ------------- |
| \$myText    | This is the variable that contains the text to target | \$myText      |
| value       | The text you'd like to search for.                    | "Search text" |
| \$textFound | The variable to store the result.                     | \$textFound   |

<Accordion title="Example">
  ```javascript  theme={null}
      text.starts_with $myText {
        value = "Search text"
      } as $textFound
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/kUGpIho8LJSMl5Gv/images/37853c2f-image.jpeg?fit=max&auto=format&n=kUGpIho8LJSMl5Gv&q=85&s=a3fcdbdd09f253ff3ee001e2d92724ba" alt="" width="376" height="41" data-path="images/37853c2f-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Ends With

```javascript  theme={null}
    text.ends_with $myText {
      value = "Search text"
    } as $textFound
```

<Check>
  This function is also available as a **case-insensitive version** as:

  ```javascript  theme={null}
  text.iends_with $myText {
    value = "Search text"
  } as $textFound
  ```
</Check>

| Parameter   | Purpose                                               | Example       |
| ----------- | ----------------------------------------------------- | ------------- |
| \$myText    | This is the variable that contains the text to target | \$myText      |
| value       | The text you'd like to search for.                    | "Search text" |
| \$textFound | The variable to store the result.                     | \$textFound   |

<Accordion title="Example">
  ```javascript  theme={null}
      text.ends_with $myText {
        value = "Search text"
      } as $textFound
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/WBQXG-4Ngk82eYAW/images/fdab9c82-image.jpeg?fit=max&auto=format&n=WBQXG-4Ngk82eYAW&q=85&s=ec625ed9e4e809e447ef3fcbc9fcb533" alt="" width="368" height="42" data-path="images/fdab9c82-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Contains

```javascript  theme={null}
    text.contains $myText {
      value = "Search text"
    } as $textFound
```

<Check>
  This function is also available as a **case-insensitive version** as:

  ```javascript  theme={null}
  text.icontains $myText {
    value = "Search text"
  } as $textFound
  ```
</Check>

| Parameter   | Purpose                                               | Example       |
| ----------- | ----------------------------------------------------- | ------------- |
| \$myText    | This is the variable that contains the text to target | \$myText      |
| value       | The text you'd like to search for.                    | "Search text" |
| \$textFound | The variable to store the result.                     | \$textFound   |

<Accordion title="Example">
  ```javascript  theme={null}
      text.contains $myText {
        value = "Search text"
      } as $textFound
  ```

  ***

  ### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Starts With (Case-Insensitive)

  ```javascript  theme={null}
      text.istarts_with $myText {
        value = "Search text"
      } as $textFound
  ```

  Checks if the text in `$myText` starts with the given value, ignoring case. Returns `true` or `false` in `$textFound`.

  ### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Ends With (Case-Insensitive)

  ```javascript  theme={null}
      text.iends_with $myText {
        value = "Search text"
      } as $textFound
  ```

  Checks if the text in `$myText` ends with the given value, ignoring case. Returns `true` or `false` in `$textFound`.

  ### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Contains (Case-Insensitive)

  ```javascript  theme={null}
      text.icontains $myText {
        value = "Search text"
      } as $textFound
  ```

  Checks if the text in `$myText` contains the given value, ignoring case. Returns `true` or `false` in `$textFound`.

    <img src="https://mintcdn.com/xano-997cb9ee/NAqNmVIgcJlXegps/images/022b6653-image.jpeg?fit=max&auto=format&n=NAqNmVIgcJlXegps&q=85&s=560ad12a9bb701634c60f0d58f2ebc58" alt="" width="357" height="40" data-path="images/022b6653-image.jpeg" />
</Accordion>


Built with [Mintlify](https://mintlify.com).