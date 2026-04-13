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

# Array

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> append

`value|append:item:key`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2]|append:3                // Returns [1,2,3]
  {"a":1}|append:2:"b"         // Returns {"a":1,"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> count

`value|count`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|count               // Returns 3
  {"a":1,"b":2}|count        // Returns 2
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> diff

`value|diff:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|diff:[2,3]    // Returns [1]
  [4,5,6]|diff:[4,5]    // Returns [6]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> diff\_assoc

`value|diff_assoc:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2}|diff_assoc:{"b":2,"c":3}    // Returns {"a":1}
  {"x":1,"y":2}|diff_assoc:{"y":3,"z":4}    // Returns {"x":1,"y":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> entries

`value|entries`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|entries                // Returns [[0,1],[1,2],[2,3]]
  {"a":1,"b":2}|entries         // Returns [["a",1],["b",2]]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> every

`value|every:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [2,4,6]|every:"x % 2 == 0":10      // Returns true (all numbers are even)
  [1,2,3]|every:"x > 0":10           // Returns true (all numbers are positive)
  ["cat","car"]|every:"x[0] == 'c'":5  // Returns true (all strings start with 'c')
  [{"age":20},{"age":30}]|every:"x.age >= 18":10  // Returns true (all ages are adult)
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter

`value|filter:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3,4]|filter:"x > 2"              // Returns [3,4]
  ["apple","banana"]|filter:"len(x) > 4"  // Returns ["banana"]
  [{"age":20},{"age":30}]|filter:"x.age > 25"  // Returns [{"age":30}]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_empty

`value|filter_empty`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,"",null,2]|filter_empty    // Returns [1,2]
  [0,false,"test"]|filter_empty // Returns ["test"]
  ```

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_empty\_array

  `value|filter_empty_array`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [[1,2],[],[3]]|filter_empty_array    // Returns [[1,2],[3]]
    []|filter_empty_array                // Returns []
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_empty\_object

  `value|filter_empty_object`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [{a:1},{},{}]|filter_empty_object    // Returns [{a:1}]
    []|filter_empty_object               // Returns []
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_empty\_text

  `value|filter_empty_text`

  <Accordion title="Examples">
    ```javascript  theme={null}
    ["foo", "", "bar"]|filter_empty_text    // Returns ["foo", "bar"]
    []|filter_empty_text                       // Returns []
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_false

  `value|filter_false`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [true, false, true]|filter_false    // Returns [true, true]
    [false, false]|filter_false         // Returns []
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_null

  `value|filter_null`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [1, null, 2]|filter_null    // Returns [1,2]
    [null, null]|filter_null    // Returns []
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> filter\_zero

  `value|filter_zero`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [0,1,2,0]|filter_zero    // Returns [1,2]
    [0,0]|filter_zero        // Returns []
    ```
  </Accordion>
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> find

`value|find:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|find:"x > 1":10              // Returns 2 (first number greater than 1)
  ["cat","dog"]|find:"len(x) > 2":5    // Returns "cat" (first string longer than 2)
  [{"age":20},{"age":30}]|find:"x.age > 25":10  // Returns {"age":30}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> findIndex

`value|findIndex:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|findIndex:"x > 1":10              // Returns 1 (index of first number > 1)
  ["cat","dog"]|findIndex:"len(x) > 2":5    // Returns 0 (index of first string longer than 2)
  [{"age":20},{"age":30}]|findIndex:"x.age > 25":10  // Returns 1
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> map

`value|map:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|map:"x * 2":10                // Returns [2,4,6]
  ["a","b"]|map:"upper(x)":5            // Returns ["A","B"]
  [{"n":1},{"n":2}]|map:"x.n + 1":10    // Returns [2,3]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> range

`value|range:start:end`

<Accordion title="Examples">
  ```javascript  theme={null}
  null|range:1:5    // Returns [1,2,3,4,5]
  null|range:0:2    // Returns [0,1,2]
  null|range:-2:2   // Returns [-2,-1,0,1,2]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> reduce

`value|reduce:initial:code:timeout`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|reduce:0:"acc + x":10           // Returns 6 (sum of array)
  ["a","b"]|reduce:"":"acc + x":5         // Returns "ab" (string concatenation)
  [1,2,3]|reduce:1:"acc * x":10           // Returns 6 (product of array)
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> first

`value|first`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|first    // Returns 1
  []|first         // Returns null
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> flatten

`value|flatten`

<Accordion title="Examples">
  ```javascript  theme={null}
  [[1,2],[3,4]]|flatten    // Returns [1,2,3,4]
  [1,[2,[3]]]|flatten      // Returns [1,2,3]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> index\_by

`value|index_by:key`

<Accordion title="Examples">
  ```javascript  theme={null}
  [{"id":1,"name":"a"},{"id":2,"name":"b"}]|index_by:"id"    // Returns {1:{"id":1,"name":"a"},2:{"id":2,"name":"b"}}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> intersect

`value|intersect:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|intersect:[2,3,4]    // Returns [2,3]
  ["a","b"]|intersect:["b","c"]    // Returns ["b"]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> intersect\_assoc

`value|intersect_assoc:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2}|intersect_assoc:{"b":2,"c":3}    // Returns {"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> join

`value|join:separator`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|join:","    // Returns "1,2,3"
  ["a","b"]|join:"-"  // Returns "a-b"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> keys

`value|keys`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2}|keys    // Returns ["a","b"]
  [1,2,3]|keys         // Returns [0,1,2]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> last

`value|last`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|last    // Returns 3
  []|last         // Returns null
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> merge

`value|merge:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2]|merge:[3,4]    // Returns [1,2,3,4]
  {"a":1}|merge:{"b":2}    // Returns {"a":1,"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> merge\_recursive

`value|merge_recursive:array`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":[1]}|merge_recursive:{"a":[2]}    // Returns {"a":[1,2]}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> pick

`value|pick:keys`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2,"c":3}|pick:["a","b"]    // Returns {"a":1,"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> pop

`value|pop`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|pop    // Returns 3
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> prepend

`value|prepend:item:key`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2]|prepend:0                // Returns [0,1,2]
  {"b":2}|prepend:1:"a"         // Returns {"a":1,"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> push

`value|push:item`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2]|push:3    // Returns [1,2,3]
  []|push:1       // Returns [1]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> remove

`value|remove:item:key:strict`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|remove:2    // Returns [1,3]
  {"a":1,"b":2}|remove:null:"b":true    // Returns {"a":1}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> reverse

`value|reverse`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|reverse    // Returns [3,2,1]
  ["a","b"]|reverse  // Returns ["b","a"]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> safe\_array

`value|safe_array`

<Accordion title="Examples">
  ```javascript  theme={null}
  null|safe_array    // Returns []
  [1,2]|safe_array  // Returns [1,2]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> shift

`value|shift`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|shift    // Returns [2,3]
  []|shift         // Returns []
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> shuffle

`value|shuffle`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3]|shuffle    // Returns randomly ordered array
  ["a","b"]|shuffle  // Returns randomly ordered array
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> slice

`value|slice:offset:length`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,3,4]|slice:1:2    // Returns [2,3]
  ["a","b","c"]|slice:0:2    // Returns ["a","b"]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> unique

`value|unique:key`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2,2,3]|unique    // Returns [1,2,3]
  [{"id":1},{"id":1}]|unique:"id"    // Returns [{"id":1}]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> unpick

`value|unpick:keys`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2,"c":3}|unpick:["a","b"]    // Returns {"c":3}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> unshift

`value|unshift:item`

<Accordion title="Examples">
  ```javascript  theme={null}
  [1,2]|unshift:0    // Returns [0,1,2]
  []|unshift:1       // Returns [1]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> values

`value|values`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2}|values    // Returns [1,2]
  [1,2,3]|values         // Returns [1,2,3]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> shuffle

`value|shuffle`

<Accordion title="Examples">
  ```javascript  theme={null}
  {"a":1,"b":2}|shuffle   // Returns a shuffled version of the array
  ```

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> some

  `value|some:code:timeout`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [1,2,3]|some:"x > 2":10    // Returns true (at least one element > 2)
    [1,1,1]|some:"x == 2":10   // Returns false
    ```
  </Accordion>

  ## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> sort

  `value|sort`

  <Accordion title="Examples">
    ```javascript  theme={null}
    [3,1,2]|sort    // Returns [1,2,3]
    ["b","a","c"]|sort    // Returns ["a","b","c"]
    ```
  </Accordion>
</Accordion>


Built with [Mintlify](https://mintlify.com).