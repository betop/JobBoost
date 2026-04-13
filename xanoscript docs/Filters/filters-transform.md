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

# Transform

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> base64\_decode

`value|base64_decode`

<Accordion title="Examples">
  ```js  theme={null}
  "SGVsbG8gV29ybGQ="|base64_decode    // Returns "Hello World"
  "dGVzdA=="|base64_decode            // Returns "test"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> base64\_decode\_urlsafe

`value|base64_decode_urlsafe`

<Accordion title="Examples">
  ```js  theme={null}
  "SGVsbG8_V29ybGQ="|base64_decode_urlsafe    // Returns "Hello?World"
  "dGVzdC1maWxl"|base64_decode_urlsafe        // Returns "test-file"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> base64\_encode

`value|base64_encode`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello World"|base64_encode    // Returns "SGVsbG8gV29ybGQ="
  "test"|base64_encode          // Returns "dGVzdA=="
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> base64\_encode\_urlsafe

`value|base64_encode_urlsafe`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello?World"|base64_encode_urlsafe    // Returns "SGVsbG8_V29ybGQ="
  "test-file"|base64_encode_urlsafe      // Returns "dGVzdC1maWxl"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> base\_convert

`value|base_convert:from_base:to_base`

<Accordion title="Examples">
  ```js  theme={null}
  "FF"|base_convert:"16":"10"    // Returns "255" (hex to decimal)
  "1010"|base_convert:"2":"10"   // Returns "10" (binary to decimal)
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> bin2hex

`value|bin2hex`

<Accordion title="Examples">
  ```js  theme={null}
  "binary_data"|bin2hex    // Returns hexadecimal representation
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> bindec

`value|bindec`

<Accordion title="Examples">
  ```js  theme={null}
  "1010"|bindec    // Returns 10
  "1100"|bindec    // Returns 12
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> create\_object

`keys|create_object:values`

<Accordion title="Examples">
  ```js  theme={null}
  ["name","age"]|create_object:["John",30]    // Returns {"name":"John","age":30}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> create\_object\_from\_entries

`entries|create_object_from_entries`

<Accordion title="Examples">
  ```js  theme={null}
  [{key:"a",value:1},{key:"b",value:2}]|create_object_from_entries    // Returns {"a":1,"b":2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> csv\_create

`value|csv_create:delimiter`

<Accordion title="Examples">
  ```js  theme={null}
  [["a","b"],["c","d"]]|csv_create:","    // Returns "a,b\nc,d"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> csv\_decode

`value|csv_decode:delimiter`

<Accordion title="Examples">
  ```js  theme={null}
  "a,b\nc,d"|csv_decode:","    // Returns [["a","b"],["c","d"]]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> csv\_encode

`value|csv_encode:delimiter`

<Accordion title="Examples">
  ```js  theme={null}
  [["a","b"],["c","d"]]|csv_encode:","    // Returns "a,b\nc,d"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> csv\_parse

`value|csv_parse:delimiter`

<Accordion title="Examples">
  ```js  theme={null}
  "a,b\nc,d"|csv_parse:","    // Returns [["a","b"],["c","d"]]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> decbin

`value|decbin`

<Accordion title="Examples">
  ```js  theme={null}
  "10"|decbin    // Returns "1010"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> dechex

`value|dechex`

<Accordion title="Examples">
  ```js  theme={null}
  "255"|dechex    // Returns "ff"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> decoct

`value|decoct`

<Accordion title="Examples">
  ```js  theme={null}
  "10"|decoct    // Returns "12"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> hex2bin

`value|hex2bin`

<Accordion title="Examples">
  ```js  theme={null}
  "68656c6c6f"|hex2bin    // Returns "hello"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> hexdec

`value|hexdec`

<Accordion title="Examples">
  ```js  theme={null}
  "ff"|hexdec    // Returns "255"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> json\_decode

`value|json_decode`

<Accordion title="Examples">
  ```js  theme={null}
  '{"a":1,"b":2}'|json_decode    // Returns {a:1,b:2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> json\_encode

`value|json_encode`

<Accordion title="Examples">
  ```js  theme={null}
  {a:1,b:2}|json_encode    // Returns '{"a":1,"b":2}'
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> lambda

`value|lambda:expression`

<Accordion title="Examples">
  ```js  theme={null}
  [1,2,3]|lambda:$$*2    // Returns [2,4,6]
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> octdec

`value|octdec`

<Accordion title="Examples">
  ```js  theme={null}
  "12"|octdec    // Returns "10"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_bool

`value|to_bool`

<Accordion title="Examples">
  ```js  theme={null}
  "true"|to_bool    // Returns true
  "0"|to_bool       // Returns false
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_days

`value|to_days:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_days    // Returns days since epoch
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_decimal

`value|to_decimal`

<Accordion title="Examples">
  ```js  theme={null}
  "133.45 kg"|to_decimal    // Returns 133.45
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_expr

`value|to_expr`

<Accordion title="Examples">
  ```js  theme={null}
  "(2 + 1) % 2"|to_expr    // Returns 1
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_hours

`value|to_hours:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_hours    // Returns hours since epoch
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_int

`value|to_int`

<Accordion title="Examples">
  ```js  theme={null}
  "133.45 kg"|to_int    // Returns 133
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_minutes

`value|to_minutes:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_minutes    // Returns minutes since epoch
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_ms

`value|to_ms:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_ms    // Returns ms since epoch
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_seconds

`value|to_seconds:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_seconds    // Returns seconds since epoch
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_text

`value|to_text`

<Accordion title="Examples">
  ```js  theme={null}
  1.344|to_text    // Returns "1.344"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> to\_timestamp

`value|to_timestamp:timezone?`

<Accordion title="Examples">
  ```js  theme={null}
  "2025-10-18"|to_timestamp    // Returns timestamp in ms
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> url\_decode

`value|url_decode`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello%2C%20World%21"|url_decode    // Returns "Hello, World!"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> url\_decode\_rfc3986

`value|url_decode_rfc3986`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello%2C%20World%21"|url_decode_rfc3986    // Returns "Hello, World!"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> url\_encode

`value|url_encode`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello, World!"|url_encode    // Returns "Hello%2C%20World%21"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> url\_encode\_rfc3986

`value|url_encode_rfc3986`

<Accordion title="Examples">
  ```js  theme={null}
  "Hello, World!"|url_encode_rfc3986    // Returns "Hello%2C%20World%21"
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> xml\_decode

`value|xml_decode`

<Accordion title="Examples">
  ```js  theme={null}
  "<root><a>1</a><b>2</b></root>"|xml_decode    // Returns {root:{a:1,b:2}}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> yaml\_decode

`value|yaml_decode`

<Accordion title="Examples">
  ```js  theme={null}
  "a: 1\nb: 2"|yaml_decode    // Returns {a:1,b:2}
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> yaml\_encode

`value|yaml_encode`

<Accordion title="Examples">
  ```js  theme={null}
  {a:1,b:2}|yaml_encode    // Returns 'a: 1\nb: 2\n'
  ```
</Accordion>


Built with [Mintlify](https://mintlify.com).