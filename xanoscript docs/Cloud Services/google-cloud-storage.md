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

# Google Cloud Storage

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: List Directory of

```javascript  theme={null}
cloud.google.storage.list_directory {
  service_account = ""
  bucket = ""
  path = ""
} as x1
```

| Parameter        | Purpose                     | Example                            |
| ---------------- | --------------------------- | ---------------------------------- |
| service\_account | GCP service account JSON    | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name             | `"my-app-bucket"`                  |
| path             | Directory path to list      | `"folder/"`, `"uploads/"`          |
| as               | Alias for directory listing | `x1`, `directory_contents`         |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.list_directory {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "app-assets"
    path = "images/2024/"
  } as folder_listing
  ```

  * Lists contents of a GCS directory
  * Returns object names and metadata
  * Supports nested directories
  * Lists all objects in specified path
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Get Signed URL of

```javascript  theme={null}
cloud.google.storage.sign_url {
  service_account = ""
  bucket = ""
  filePath = ""
  method = "GET"
  ttl = 300
} as x2
```

| Parameter        | Purpose                  | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| service\_account | GCP service account JSON | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name          | `"my-app-bucket"`                  |
| filePath         | Path to file             | `"documents/file.pdf"`             |
| method           | HTTP method to allow     | `"GET"`, `"PUT"`                   |
| ttl              | Time-to-live in seconds  | `300`, `3600`                      |
| as               | Alias for signed URL     | `x2`, `signed_url`                 |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.sign_url {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "private-files"
    filePath = "secure/"|add:$file.path
    method = "GET"
    ttl = 1800
  } as download_url
  ```

  * Generates signed URL for temporary access
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Get Signed URL of

```javascript  theme={null}
cloud.google.storage.sign_url {
  service_account = ""
  bucket = ""
  filePath = ""
  method = "GET"
  ttl = 300
} as x2
```

| Parameter        | Purpose                  | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| service\_account | GCP service account JSON | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name          | `"my-app-bucket"`                  |
| filePath         | Path to file             | `"documents/file.pdf"`             |
| method           | HTTP method to allow     | `"GET"`, `"PUT"`                   |
| ttl              | Time-to-live in seconds  | `300`, `3600`                      |
| as               | Alias for signed URL     | `x2`, `signed_url`                 |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.sign_url {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "private-files"
    filePath = "secure/"|add:$file.path
    method = "GET"
    ttl = 1800
  } as download_url
  ```

  * Generates signed URL for temporary access
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Upload file to

```javascript  theme={null}
cloud.google.storage.upload_file {
  service_account = ""
  bucket = ""
  filePath = ""
  file = ""
  metadata =
}
```

| Parameter        | Purpose                    | Example                            |
| ---------------- | -------------------------- | ---------------------------------- |
| service\_account | GCP service account JSON   | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name            | `"my-app-bucket"`                  |
| filePath         | Destination path in bucket | `"uploads/file.jpg"`               |
| file             | File to upload             | `$input.file`                      |
| metadata         | Custom metadata for object | `{contentType: "image/jpeg"}`      |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.upload_file {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "user-content"
    filePath = $user.id|add:"/profile.jpg"
    file = $input.profile_photo
    metadata = {
      userId: $user.id,
      uploadTime: $now
    }
  }
  ```

  * Uploads file to Google Cloud Storage
  * Supports custom metadata
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Delete file

```javascript  theme={null}
cloud.google.storage.delete_file {
  service_account = ""
  bucket = ""
  filePath = ""
}
```

| Parameter        | Purpose                  | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| service\_account | GCP service account JSON | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name          | `"my-app-bucket"`                  |
| filePath         | Path to file to delete   | `"folder/file.txt"`                |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.delete_file {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "temp-storage"
    filePath = "temp/"|add:$file.name
  }
  ```

  * Deletes an object from storage
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Create Var From File Resource

```javascript  theme={null}
cloud.google.storage.read_file {
  service_account = ""
  bucket = ""
  filePath = ""
} as x3
```

| Parameter        | Purpose                  | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| service\_account | GCP service account JSON | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name          | `"my-app-bucket"`                  |
| filePath         | Path to file to read     | `"documents/file.txt"`             |
| as               | Alias for file contents  | `x3`, `file_data`                  |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.read_file {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "app-data"
    filePath = "documents/"|add:$doc.id
  } as document_contents
  ```

  * Reads object contents
  * Returns file data
</Accordion>

## <Icon icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/xs_temp.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=6e05b86a660544b2d6040353bd8faac8" size={46} width="371" height="137" data-path="images/icons/xs_temp.svg" /> Google Cloud Storage: Get File Metadata

```javascript  theme={null}
cloud.google.storage.get_file_info {
  service_account = ""
  bucket = ""
  filePath = ""
} as x4
```

| Parameter        | Purpose                  | Example                            |
| ---------------- | ------------------------ | ---------------------------------- |
| service\_account | GCP service account JSON | `{"type": "service_account", ...}` |
| bucket           | GCS bucket name          | `"my-app-bucket"`                  |
| filePath         | Path to file             | `"folder/file.txt"`                |
| as               | Alias for file metadata  | `x4`, `object_info`                |

<Accordion title="Example">
  ```javascript  theme={null}
  cloud.google.storage.get_file_info {
    service_account = $env.GCP_SERVICE_ACCOUNT
    bucket = "media-files"
    filePath = "videos/"|add:$video.id
  } as file_metadata
  ```

  * Retrieves object metadata
</Accordion>


Built with [Mintlify](https://mintlify.com).