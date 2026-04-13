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

# Field Types Reference

> Reference of all the field types available in XanoScript

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> integer

`int field_name`

For Table References: `int field_name? { dbtable = "table_name" }`

<Accordion title="Examples">
  ```js  theme={null}
  int id              // An auto-incrementing primary key
  int age             // A field for storing age values
  int product_count   // A field for tracking quantity
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> text

`text field_name`

<Accordion title="Examples">
  ```js  theme={null}
  text description    // A text field for storing descriptions
  text user_bio      // A text field for user biographies
  text address       // A text field for storing addresses
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> boolean

`bool field_name`

<Accordion title="Examples">
  ```js  theme={null}
  bool is_active     // A boolean field for active status
  bool is_verified   // A boolean field for verification status
  bool has_premium   // A boolean field for premium features
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> timestamp

`timestamp field_name`

<Accordion title="Examples">
  ```js  theme={null}
  timestamp created_at      // Timestamp for record creation
  timestamp last_login     // Timestamp for user's last login
  timestamp expires_at     // Timestamp for expiration date
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> decimal

`decimal field_name`

<Accordion title="Examples">
  ```js  theme={null}
  decimal price           // A decimal field for prices
  decimal temperature    // A decimal field for temperature values
  decimal gpa            // A decimal field for grade point average
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> enum

`enum field_name {values=[]}`

<Accordion title="Examples">
  ```js  theme={null}
  enum status {          // An enum field for status options
    values = ["pending", "active", "completed"]
  }
  enum role {           // An enum field for user roles
    values = ["admin", "user", "guest"]
  }
  enum size {           // An enum field for size options
    values = ["small", "medium", "large"]
  }
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> uuid

`uuid field_name`

<Accordion title="Examples">
  ```js  theme={null}
  uuid session_id      // A UUID field for session identification
  uuid device_id       // A UUID field for device identification
  uuid token           // A UUID field for unique tokens
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> object

`object field_name {schema={}}`

<Accordion title="Examples">
  ```js  theme={null}
  object settings {     // An object field for user settings
    schema = {
      theme: "string",
      notifications: "boolean"
    }
  }
  object address {      // An object field for address details
    schema = {
      street: "string",
      city: "string",
      zip: "string"
    }
  }
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> json

`json field_name`

<Accordion title="Examples">
  ```js  theme={null}
  json metadata       // A JSON field for flexible metadata storage
  json preferences    // A JSON field for user preferences
  json custom_data    // A JSON field for arbitrary data
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> vector

`vector field_name`

<Accordion title="Examples">
  ```js  theme={null}
  vector embedding     // A vector field for ML embeddings
  vector coordinates  // A vector field for spatial coordinates
  vector features     // A vector field for feature vectors
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> date

`date field_name`

<Accordion title="Examples">
  ```js  theme={null}
  date birth_date     // A date field for birthdays
  date start_date    // A date field for event start
  date due_date      // A date field for task deadlines
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> email

`email field_name`

<Accordion title="Examples">
  ```js  theme={null}
  email user_email    // An email field for user contact
  email support_email // An email field for support contact
  email backup_email  // An email field for backup contact
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> password

`password field_name`

<Accordion title="Examples">
  ```js  theme={null}
  password user_password {     // A password field for user authentication
    sensitive = true
  }
  password api_key {          // A password field for API authentication
    sensitive = true
  }
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> image

`image field_name`

<Accordion title="Examples">
  ```js  theme={null}
  image profile_pic   // An image field for profile pictures
  image banner       // An image field for banner images
  image thumbnail    // An image field for thumbnail images
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> video

`video field_name`

<Accordion title="Examples">
  ```js  theme={null}
  video tutorial      // A video field for tutorial content
  video promo        // A video field for promotional content
  video recording    // A video field for recorded content
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> audio

`audio field_name`

<Accordion title="Examples">
  ```js  theme={null}
  audio podcast      // An audio field for podcast episodes
  audio message     // An audio field for voice messages
  audio music       // An audio field for music tracks
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> attachment

`attachment field_name`

<Accordion title="Examples">
  ```js  theme={null}
  attachment document    // An attachment field for documents
  attachment resume     // An attachment field for resumes
  attachment contract   // An attachment field for contracts
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_point

`geo_point field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_point location     // A geo point field for single locations
  geo_point store       // A geo point field for store location
  geo_point checkpoint  // A geo point field for route checkpoints
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_point\_collection

`geo_point_collection field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_point_collection locations    // A collection of location points
  geo_point_collection waypoints   // Multiple waypoints for a route
  geo_point_collection hotspots    // Multiple points of interest
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_path

`geo_path field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_path route        // A path field for route tracking
  geo_path trail       // A path field for hiking trails
  geo_path boundary    // A path field for boundary lines
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_path\_collection

`geo_path_collection field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_path_collection routes      // Multiple routes collection
  geo_path_collection boundaries // Multiple boundary lines
  geo_path_collection networks   // Network of paths
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_polygon

`geo_polygon field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_polygon area        // A polygon field for area definition
  geo_polygon territory   // A polygon field for territory bounds
  geo_polygon zone        // A polygon field for zone definition
  ```
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> geo\_polygon\_collection

`geo_polygon_collection field_name`

<Accordion title="Examples">
  ```js  theme={null}
  geo_polygon_collection regions    // Multiple region polygons
  geo_polygon_collection districts  // Multiple district areas
  geo_polygon_collection zones      // Multiple zone definitions
  ```
</Accordion>


Built with [Mintlify](https://mintlify.com).