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

# Arrays

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> **Array Add to End**

```js  theme={null}
 array.push arrayVariable {
      value = 10
    }
```

| Parameter     | Purpose                                                                | Example       |
| ------------- | ---------------------------------------------------------------------- | ------------- |
| arrayVariable | This is the array variable you want to target with the array operation | arrayVariable |
| value         | The value you want to apply to the array operation                     | 5             |

<Accordion title="Example">
  ```js  theme={null}
   array.push arrayVariable {
        value = 10
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/dC3SQWgPCF_-1qn6/images/30cc30bf-image.jpeg?fit=max&auto=format&n=dC3SQWgPCF_-1qn6&q=85&s=1f4e68f09066dd9234c159761766870f" alt="" width="478" height="47" data-path="images/30cc30bf-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> **Array Add to Beginning**

```js  theme={null}
 array.unshift arrayVariable {
      value = 10
    }
```

| Parameter     | Purpose                                                                | Example       |
| ------------- | ---------------------------------------------------------------------- | ------------- |
| arrayVariable | This is the array variable you want to target with the array operation | arrayVariable |
| value         | The value you want to apply to the array operation                     | 5             |

<Accordion title="Example">
  ```js  theme={null}
   array.unshift arrayVariable {
        value = 10
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/Qia2QBMIuWWrGb-s/images/1b42e9e9-image.jpeg?fit=max&auto=format&n=Qia2QBMIuWWrGb-s&q=85&s=97c0a7bdcbfb2b056a820a8e98deded9" alt="" width="534" height="47" data-path="images/1b42e9e9-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> **Array Remove From End Of**

```js  theme={null}
 array.pop arrayVariable as removedElement
```

| Parameter      | Purpose                                                                | Example        |
| -------------- | ---------------------------------------------------------------------- | -------------- |
| arrayVariable  | This is the array variable you want to target with the array operation | arrayVariable  |
| removedElement | The variable you want to store the removed item in                     | removedElement |

<Accordion title="Example">
  ```js  theme={null}
   array.pop arrayVariable as removedElement
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/nsvdyKK4Dg7VUAZs/images/95e5b5d4-image.jpeg?fit=max&auto=format&n=nsvdyKK4Dg7VUAZs&q=85&s=9b0d54b49eb36d3c631aead6fd76c3e9" alt="" width="461" height="45" data-path="images/95e5b5d4-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> **Array Remove From Beginning Of**

```js  theme={null}
 array.shift arrayVariable as removedElement
```

| Parameter      | Purpose                                                                | Example        |
| -------------- | ---------------------------------------------------------------------- | -------------- |
| arrayVariable  | This is the array variable you want to target with the array operation | arrayVariable  |
| removedElement | The variable you want to store the removed item in                     | removedElement |

<Accordion title="Example">
  ```js  theme={null}
   array.shift arrayVariable as removedElement
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/WBQXG-4Ngk82eYAW/images/fb4a36f9-image.jpeg?fit=max&auto=format&n=WBQXG-4Ngk82eYAW&q=85&s=0d88e93974ec04effc946d38a8ec409f" alt="" width="523" height="44" data-path="images/fb4a36f9-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> **Array Merge**

```js  theme={null}
    array.merge arrayVariable {
      value = $anotherArrayVariable
    }
```

| Parameter     | Purpose                                                                                            | Example                             |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| arrayVariable | This is the variable that contains the first array you want to merge.                              | arrayVariable                       |
| value         | This is the second array that you want to merge. It could be a hardcoded array or from a variable. | \[1,2,3,4,5] \$anotherArrayVariable |

<Accordion title="Example">
  ```js  theme={null}
      array.merge arrayVariable {
        value = $anotherArrayVariable
      }
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/SGxJ0muPK3um9hNH/images/6e66f20e-image.jpeg?fit=max&auto=format&n=SGxJ0muPK3um9hNH&q=85&s=b8549aa630bff08ed63f63e4d29829e6" alt="" width="569" height="38" data-path="images/6e66f20e-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Find First Element In

```js  theme={null}
    array.find ($arrayVariable) if (`$this == 1`) as foundElement
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store the found element                                                                                | foundElement         |

<Accordion title="Example">
  ```js  theme={null}
      array.find ($arrayVariable) if (`$this == 1`) as foundElement
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/o7zunZFYmjx8RZ8N/images/f6817c75-image.jpeg?fit=max&auto=format&n=o7zunZFYmjx8RZ8N&q=85&s=5aeaa63287fbf899db0c07de0fe14658" alt="" width="539" height="41" data-path="images/f6817c75-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/-vy8_DWVOwkWo8Bt/images/884f4534-image.jpeg?fit=max&auto=format&n=-vy8_DWVOwkWo8Bt&q=85&s=4a48b24c7ba91727388a582f6593d4f9" alt="" width="512" height="212" data-path="images/884f4534-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Find First Element Index In

```js  theme={null}
    array.find_index ($arrayVariable) if (`$this == 1`) as foundElement
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store the index of found element                                                                       | foundElement         |

<Accordion title="Example">
  ```js  theme={null}
      array.find_index ($arrayVariable) if (`$this == 1`) as foundElement
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/tjSJ_pOzk8E0WRhF/images/c71c7783-image.jpeg?fit=max&auto=format&n=tjSJ_pOzk8E0WRhF&q=85&s=0233856676e9adb10d213fe6b352bff9" alt="" width="580" height="40" data-path="images/c71c7783-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/-vy8_DWVOwkWo8Bt/images/884f4534-image.jpeg?fit=max&auto=format&n=-vy8_DWVOwkWo8Bt&q=85&s=4a48b24c7ba91727388a582f6593d4f9" alt="" width="512" height="212" data-path="images/884f4534-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Has Any Element

```js  theme={null}
    array.has ($arrayVariable) if (`$this == 1`) as foundElement
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store the index of found element                                                                       | foundElement         |

<Accordion title="Example">
  ```js  theme={null}
      array.has ($arrayVariable) if (`$this == 1`) as foundElement
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/WBQXG-4Ngk82eYAW/images/ff83b154-image.jpeg?fit=max&auto=format&n=WBQXG-4Ngk82eYAW&q=85&s=dfb80e355ab2add882d241999f023f84" alt="" width="522" height="38" data-path="images/ff83b154-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/_FyaEhYRFYQZinJ0/images/d72e4633-image.jpeg?fit=max&auto=format&n=_FyaEhYRFYQZinJ0&q=85&s=f500d9d5b0fc2069401a8ef755d4a693" alt="" width="508" height="207" data-path="images/d72e4633-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Has Every Element

```js  theme={null}
array.every ($arrayVariable) if (`$this == 1`) as elementExists
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store the result                                                                                       | foundElement         |

<Accordion title="Example">
  ```js  theme={null}
  array.every ($arrayVariable) if (`$this == 1`) as elementExists
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/_Sd90ZcMa6hsPScv/images/cf8dfec6-image.jpeg?fit=max&auto=format&n=_Sd90ZcMa6hsPScv&q=85&s=37bffb24cb8a590a429207f23db9abf4" alt="" width="526" height="39" data-path="images/cf8dfec6-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/Qia2QBMIuWWrGb-s/images/218fea0c-image.jpeg?fit=max&auto=format&n=Qia2QBMIuWWrGb-s&q=85&s=ede041f416f62e78002835e408943954" alt="" width="508" height="207" data-path="images/218fea0c-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Find All Elements

```js  theme={null}
array.filter ($arrayVariable) if (`$this == 1`) as allFoundElements
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store all of the found elements                                                                        | allFoundElements     |

<Accordion title="Example">
  ```js  theme={null}
  array.filter ($arrayVariable) if (`$this == 1`) as allFoundElements
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/dC3SQWgPCF_-1qn6/images/30312dd5-image.jpeg?fit=max&auto=format&n=dC3SQWgPCF_-1qn6&q=85&s=854c9df6a37547ea14961862f97ee123" alt="" width="516" height="43" data-path="images/30312dd5-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/_Sd90ZcMa6hsPScv/images/c95ee1b0-image.jpeg?fit=max&auto=format&n=_Sd90ZcMa6hsPScv&q=85&s=b35316a55fe14ef291f807bc501aeab8" alt="" width="508" height="207" data-path="images/c95ee1b0-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Get Element Count

```js  theme={null}
array.filter_count ($arrayVariable) if (`$this == 1`) as allFoundElements
```

| Parameter       | Purpose                                                                                                                              | Example              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| \$arrayVariable | This is the variable that contains the array you want to find the element in.                                                        | \$arrayVariable      |
| if              | This is where you define the conditions of the element you want to find. Use `$this` to represent each individual item in the array. | if (\`\$this == 1\`) |
| as              | The variable that you want to store the count of all of the found elements                                                           | allFoundElements     |

<Accordion title="Example">
  ```js  theme={null}
  array.filter_count ($arrayVariable) if (`$this == 1`) as allFoundElements
  ```

    <img src="https://mintcdn.com/xano-997cb9ee/kUGpIho8LJSMl5Gv/images/32f8530b-image.jpeg?fit=max&auto=format&n=kUGpIho8LJSMl5Gv&q=85&s=cd532b38b542ca7c3f7c087af9a22353" alt="" width="591" height="39" data-path="images/32f8530b-image.jpeg" />

    <img src="https://mintcdn.com/xano-997cb9ee/-vy8_DWVOwkWo8Bt/images/884f4534-image.jpeg?fit=max&auto=format&n=-vy8_DWVOwkWo8Bt&q=85&s=4a48b24c7ba91727388a582f6593d4f9" alt="" width="512" height="212" data-path="images/884f4534-image.jpeg" />
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Map (Transform Each Element)

```js  theme={null}
array.map ($arrayVariable) as mappedArray {
    value = $this * 2
}
```

| Parameter       | Purpose                                                                         | Example         |
| --------------- | ------------------------------------------------------------------------------- | --------------- |
| \$arrayVariable | The array to map over.                                                          | \$arrayVariable |
| as              | The variable to store the mapped array.                                         | mappedArray     |
| value           | The expression to apply to each element. `$this` refers to the current element. | \$this \* 2     |

<Accordion title="Example">
  ```js  theme={null}
  array.map ($arrayVariable) as mappedArray {
      value = $this * 2
  }
  ```
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Partition (Split by Condition)

```js  theme={null}
array.partition ($arrayVariable) if (`$this > 0`) as $partitioned
```

| Parameter       | Purpose                                                                 | Example         |
| --------------- | ----------------------------------------------------------------------- | --------------- |
| \$arrayVariable | The array to partition.                                                 | \$arrayVariable |
| if              | The condition to split the array. `$this` is the current element.       | `$this > 0`     |
| as              | The variable to store the result (object with `true` and `false` keys). | \$partitioned   |

<Accordion title="Example">
  ```js  theme={null}
  array.partition ($arrayVariable) if (`$this > 0`) as $partitioned
  ```
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Group By (Organize by Key)

```js  theme={null}
array.group_by ($arrayVariable) as $grouped {
    key = $this.category
}
```

| Parameter       | Purpose                                         | Example         |
| --------------- | ----------------------------------------------- | --------------- |
| \$arrayVariable | The array to group.                             | \$arrayVariable |
| as              | The variable to store the grouped result.       | \$grouped       |
| key             | The key to group by (expression using `$this`). | \$this.category |

<Accordion title="Example">
  ```js  theme={null}
  array.group_by ($arrayVariable) as $grouped {
      key = $this.category
  }
  ```
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Difference (Array Diff)

```js  theme={null}
array.diff $arrayA $arrayB as $diffResult
```

| Parameter | Purpose                           | Example      |
| --------- | --------------------------------- | ------------ |
| \$arrayA  | The array to subtract from.       | \$arrayA     |
| \$arrayB  | The array of values to remove.    | \$arrayB     |
| as        | The variable to store the result. | \$diffResult |

<Accordion title="Example">
  ```js  theme={null}
  array.diff $arrayA $arrayB as $diffResult
  ```
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Intersection (Array Intersect)

```js  theme={null}
array.intersect $arrayA $arrayB as $intersectResult
```

| Parameter | Purpose                           | Example           |
| --------- | --------------------------------- | ----------------- |
| \$arrayA  | The first array.                  | \$arrayA          |
| \$arrayB  | The second array.                 | \$arrayB          |
| as        | The variable to store the result. | \$intersectResult |

<Accordion title="Example">
  ```js  theme={null}
  array.intersect $arrayA $arrayB as $intersectResult
  ```
</Accordion>

### <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Union (Unique Merge)

```js  theme={null}
array.union $arrayA $arrayB as $unionResult
```

| Parameter | Purpose                           | Example       |
| --------- | --------------------------------- | ------------- |
| \$arrayA  | The first array.                  | \$arrayA      |
| \$arrayB  | The second array.                 | \$arrayB      |
| as        | The variable to store the result. | \$unionResult |

<Accordion title="Example">
  ```js  theme={null}
  array.union $arrayA $arrayB as $unionResult
  ```
</Accordion>


Built with [Mintlify](https://mintlify.com).