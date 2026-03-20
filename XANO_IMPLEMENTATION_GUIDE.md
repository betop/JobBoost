# Xano Implementation Guide - Complete Walkthrough with Screenshots

This guide walks you through every single click, button, and configuration needed to build the SwiftCV backend in Xano.

---

## Part 1: Account Setup & Workspace Creation

### Step 1.1: Create Xano Account

1. Open browser and go to: **https://xano.com**
2. Click **"Sign Up"** button (top right)
3. Fill in:
   - Email: your email
   - Password: create strong password
   - Confirm password
4. Click **"Create Account"**
5. Check your email for verification
6. Click verification link
7. Login with your credentials

### Step 1.2: Create New Workspace

1. After login, you'll see dashboard
2. Click **"Create New Workspace"** button (center or top left)
3. Enter workspace details:
   - **Name**: `SwiftCV`
   - **Region**: Select closest to you (e.g., US East, EU West)
4. Click **"Create"**
5. Wait for workspace to initialize (~10 seconds)
6. You'll be redirected to workspace dashboard

---

## Part 2: Database Tables Setup

### Step 2.1: Create Admin Table

1. In left sidebar, click **"Database"** icon (looks like a table/grid)
2. Click **"+ Add Table"** button (top right)
3. In the popup:
   - **Table Name**: `admin`
   - **Display Field**: `email`
4. Click **"Create"** button

5. The table opens - now add fields:

   **Field 1 - ID (already exists)**
   - Leave as is: `id`, type: UUID, Primary Key

   **Field 2 - Email**
   - Click **"+ Add Field"** button (top of fields list)
   - **Field Name**: `email`
   - **Type**: Select **"text"** from dropdown
   - Click **"unique"** checkbox
   - Click **"required"** checkbox
   - Click **"Save"**

   **Field 3 - Password**
   - Click **"+ Add Field"**
   - **Field Name**: `password`
   - **Type**: **"text"**
   - Click **"required"** checkbox
   - Click **"Save"**

   **Field 4 - Created At**
   - Click **"+ Add Field"**
   - **Field Name**: `created_at`
   - **Type**: Select **"timestamp"** from dropdown
   - Click **"default"** dropdown → Select **"now"**
   - Click **"Save"**

   **Field 5 - Updated At**
   - Click **"+ Add Field"**
   - **Field Name**: `updated_at`
   - **Type**: **"timestamp"**
   - Click **"default"** → **"now"**
   - Click **"Save"**

6. Your `admin` table is complete!

### Step 2.2: Create Profile Table

1. Click **"+ Add Table"** button again
2. **Table Name**: `profile`
3. **Display Field**: `full_name`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Full Name**
   - Click **"+ Add Field"**
   - **Field Name**: `full_name`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - Email**
   - Click **"+ Add Field"**
   - **Field Name**: `email`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 3 - Phone Number**
   - Click **"+ Add Field"**
   - **Field Name**: `phone_number`
   - **Type**: **"text"**
   - Leave required unchecked (optional field)
   - Click **"Save"**

   **Field 4 - Location**
   - Click **"+ Add Field"**
   - **Field Name**: `location`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 5 - LinkedIn URL**
   - Click **"+ Add Field"**
   - **Field Name**: `linkedin_url`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 6 - GitHub URL**
   - Click **"+ Add Field"**
   - **Field Name**: `github_url`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 7 - Summary**
   - Click **"+ Add Field"**
   - **Field Name**: `summary`
   - **Type**: Select **"text"** (or "long text" if available)
   - Click **"Save"**

   **Field 8 - Created At**
   - **Field Name**: `created_at`
   - **Type**: **"timestamp"**
   - **Default**: **"now"**
   - Click **"Save"**

   **Field 9 - Updated At**
   - **Field Name**: `updated_at`
   - **Type**: **"timestamp"**
   - **Default**: **"now"**
   - Click **"Save"**

### Step 2.3: Create Education Table

1. Click **"+ Add Table"**
2. **Table Name**: `education`
3. **Display Field**: `degree_title`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Profile ID (Relation)**
   - Click **"+ Add Field"**
   - **Field Name**: `profile_id`
   - **Type**: Click dropdown → Select **"Relation"**
   - In relation popup:
     - **Related Table**: Select `profile`
     - **Relation Type**: **"Many to One"** (many educations → one profile)
     - Click **"Save"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - University Name**
   - **Field Name**: `university_name`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 3 - Degree Title**
   - **Field Name**: `degree_title`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 4 - Field of Study**
   - **Field Name**: `field_of_study`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 5 - Start Date**
   - **Field Name**: `start_date`
   - **Type**: Select **"date"** from dropdown
   - Check **"required"**
   - Click **"Save"**

   **Field 6 - End Date**
   - **Field Name**: `end_date`
   - **Type**: **"date"**
   - Click **"Save"**

   **Field 7 - Location**
   - **Field Name**: `location`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 8 & 9 - Timestamps**
   - Add `created_at` and `updated_at` (timestamp, default: now)

### Step 2.4: Create Work Experience Table

1. Click **"+ Add Table"**
2. **Table Name**: `work_experience`
3. **Display Field**: `job_title`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Profile ID**
   - **Field Name**: `profile_id`
   - **Type**: **"Relation"**
   - **Related Table**: `profile`
   - **Type**: **"Many to One"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - Job Title**
   - **Field Name**: `job_title`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 3 - Company Name**
   - **Field Name**: `company_name`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 4 - Employment Type**
   - **Field Name**: `employment_type`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 5 - Location**
   - **Field Name**: `location`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 6 - Start Date**
   - **Field Name**: `start_date`
   - **Type**: **"date"**
   - Check **"required"**
   - Click **"Save"**

   **Field 7 - End Date**
   - **Field Name**: `end_date`
   - **Type**: **"date"**
   - Click **"Save"**

   **Field 8 - Is Current**
   - **Field Name**: `is_current`
   - **Type**: Select **"boolean"** from dropdown
   - **Default**: Click toggle to set to `false`
   - Click **"Save"**

   **Field 9 - Description**
   - **Field Name**: `description`
   - **Type**: **"text"**
   - Click **"Save"**

   **Field 10 & 11 - Timestamps**
   - Add `created_at` and `updated_at`

### Step 2.5: Create Bidder Table

1. Click **"+ Add Table"**
2. **Table Name**: `bidder`
3. **Display Field**: `full_name`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Full Name**
   - **Field Name**: `full_name`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - Email**
   - **Field Name**: `email`
   - **Type**: **"text"**
   - Check **"required"**
   - Check **"unique"**
   - Click **"Save"**

   **Field 3 - Profile ID**
   - **Field Name**: `profile_id`
   - **Type**: **"Relation"**
   - **Related Table**: `profile`
   - **Relation Type**: **"One to One"**
   - Check **"required"**
   - Check **"unique"** (each bidder has ONE profile)
   - Click **"Save"**

   **Field 4 - Is Active**
   - **Field Name**: `is_active`
   - **Type**: **"boolean"**
   - **Default**: `true` (toggle on)
   - Click **"Save"**

   **Field 5 & 6 - Timestamps**
   - Add `created_at` and `updated_at`

### Step 2.6: Create Access Token Table

1. Click **"+ Add Table"**
2. **Table Name**: `access_token`
3. **Display Field**: `token_hash`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Token Hash**
   - **Field Name**: `token_hash`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - Bidder ID**
   - **Field Name**: `bidder_id`
   - **Type**: **"Relation"**
   - **Related Table**: `bidder`
   - **Relation Type**: **"Many to One"**
   - Check **"required"**
   - Click **"Save"**

   **Field 3 - Issued At**
   - **Field Name**: `issued_at`
   - **Type**: **"timestamp"**
   - **Default**: **"now"**
   - Click **"Save"**

   **Field 4 - Expires At**
   - **Field Name**: `expires_at`
   - **Type**: **"timestamp"**
   - Leave default empty (optional)
   - Click **"Save"**

   **Field 5 - Is Active**
   - **Field Name**: `is_active`
   - **Type**: **"boolean"**
   - **Default**: `true`
   - Click **"Save"**

   **Field 6 - Is Used**
   - **Field Name**: `is_used`
   - **Type**: **"boolean"**
   - **Default**: `false`
   - Click **"Save"**

### Step 2.7: Create Rule Table

1. Click **"+ Add Table"**
2. **Table Name**: `rule`
3. **Display Field**: `sentence`
4. Click **"Create"**

5. Add fields:

   **Field 1 - Sentence**
   - **Field Name**: `sentence`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 2 - Target Section**
   - **Field Name**: `target_section`
   - **Type**: **"text"**
   - Check **"required"**
   - Click **"Save"**

   **Field 3 - Is Active**
   - **Field Name**: `is_active`
   - **Type**: **"boolean"**
   - **Default**: `true`
   - Click **"Save"**

   **Field 4 & 5 - Timestamps**
   - Add `created_at` and `updated_at`

### Step 2.8: Create Generation Log Table (Optional)

1. Click **"+ Add Table"**
2. **Table Name**: `generation_log`
3. Click **"Create"**

4. Add fields:
   - `bidder_id` (Relation → bidder, Many to One, required)
   - `profile_id` (Relation → profile, Many to One, required)
   - `timestamp` (timestamp, default: now)
   - `status` (text, required)
   - `error_message` (text, optional)

---

## Part 3: Authentication Configuration

### Step 3.1: Enable Authentication

1. In left sidebar, click **"Settings"** icon (gear icon at bottom)
2. Click **"Authentication"** tab
3. Click **"+ Add Authentication"** button
4. In the popup:
   - **Name**: `Admin Auth`
   - **Type**: Select **"Email & Password"**
5. Click **"Continue"**

6. Configure authentication:
   - **User Table**: Select `admin` from dropdown
   - **Email Field**: Select `email`
   - **Password Field**: Select `password`
   - **Token Expiration**: Enter `86400` (24 hours in seconds)
7. Click **"Save"**

### Step 3.2: Create First Admin User

1. Click **"Database"** in left sidebar
2. Click on `admin` table
3. Click **"+ Add Record"** button (top right)
4. Fill in the form:
   - **email**: `admin@example.com` (use your email)
   - **password**: `YourSecurePassword123!`
   - Leave `created_at` and `updated_at` as auto-generated
5. Click **"Save"**
6. Note: Password will be automatically hashed by Xano

---

## Part 4: API Endpoints - Authentication

### Step 4.1: Create Auth API Group

1. In left sidebar, click **"API"** icon (looks like puzzle pieces)
2. Click **"+ Add API Group"** button
3. In popup:
   - **Name**: `auth`
   - **Base Path**: `/auth`
4. Click **"Create"**

### Step 4.2: Create Login Endpoint

1. With `auth` group selected, click **"+ Add API"** button
2. Configure endpoint:
   - **Method**: Select **"POST"** from dropdown
   - **Path**: `/login`
   - **Name**: `Login`
3. Click **"Create"**

4. You'll see the Function Stack (empty canvas on right)

5. **Add Input Parameters:**
   - Click **"+ Input"** button (top right of inputs section)
   - **Name**: `email`
   - **Type**: **"text"**
   - **Source**: Select **"Body"**
   - Check **"required"**
   - Click **"Save"**
   
   - Click **"+ Input"** again
   - **Name**: `password`
   - **Type**: **"text"**
   - **Source**: **"Body"**
   - Check **"required"**
   - Click **"Save"**

6. **Build Function Stack:**

   **Function 1 - Authenticate User:**
   - In the Function Stack, click **"+ Add Function"**
   - Search for: `authenticate`
   - Click **"Authenticate User"**
   - Configure:
     - **Authentication**: Select `Admin Auth` (the one you created)
     - **Email**: Click dropdown → Select `inputs.email`
     - **Password**: Click dropdown → Select `inputs.password`
   - Click **"Save"**
   - The output will be stored in `$authenticate_user` variable

   **Function 2 - Create Auth Token:**
   - Click **"+ Add Function"** below previous
   - Search for: `auth token`
   - Click **"Create Auth Token"**
   - Configure:
     - **Authentication**: `Admin Auth`
     - **User**: Click dropdown → Select `$authenticate_user`
     - **Expiration**: `86400` (24 hours)
   - Click **"Save"**
   - Output stored in `$auth_token`

   **Function 3 - Response:**
   - Click **"+ Add Function"**
   - Search for: `response`
   - Click **"Response"**
   - In the code editor, enter:
     ```json
     {
       "authToken": $auth_token,
       "user": {
         "id": $authenticate_user.id,
         "email": $authenticate_user.email
       }
     }
     ```
   - Click **"Save"**

7. **Test the Endpoint:**
   - Click **"Run & Debug"** button (top right, play icon)
   - In the test panel:
     - **email**: `admin@example.com`
     - **password**: `YourSecurePassword123!`
   - Click **"Run"**
   - You should see response with `authToken` and `user` object
   - Copy the `authToken` for next steps

---

## Part 5: API Endpoints - Admin Group

### Step 5.1: Create Admin API Group

1. Click **"+ Add API Group"**
2. **Name**: `admin`
3. **Base Path**: `/admin`
4. Click **"Create"**

### Step 5.2: Enable Authentication for Admin Group

1. With `admin` group selected, click **"Group Settings"** (gear icon next to group name)
2. Toggle **"Require Authentication"** to ON
3. **Authentication**: Select `Admin Auth`
4. Click **"Save"**
5. Now ALL endpoints in this group require JWT token!

### Step 5.3: GET /admin/profiles (List All Profiles)

1. Click **"+ Add API"**
2. **Method**: **"GET"**
3. **Path**: `/profiles`
4. Click **"Create"**

5. **Function Stack:**

   **Function 1 - Query All Records:**
   - Click **"+ Add Function"**
   - Search: `query all`
   - Click **"Query All Records"**
   - Configure:
     - **Table**: Select `profile`
     - **Includes**: Click **"+ Add Include"**
       - Select `education`
       - Click **"+ Add Include"** again
       - Select `work_experience`
   - Click **"Save"**

   **Function 2 - Response:**
   - Click **"+ Add Function"**
   - Search: `response`
   - Click **"Response"**
   - Code: `$query_all_records`
   - Click **"Save"**

6. **Test:**
   - Click **"Run & Debug"**
   - Click **"+ Add Header"**
     - **Key**: `Authorization`
     - **Value**: `Bearer YOUR_AUTH_TOKEN_HERE` (paste token from login)
   - Click **"Run"**
   - Should return empty array `[]` (no profiles yet)

### Step 5.4: GET /admin/profiles/:id (Get Single Profile)

1. Click **"+ Add API"**
2. **Method**: **"GET"**
3. **Path**: `/profiles/:id`
4. Click **"Create"**

5. **Add Input:**
   - Click **"+ Input"**
   - **Name**: `id`
   - **Type**: **"text"**
   - **Source**: Select **"Path"**
   - Check **"required"**
   - Click **"Save"**

6. **Function Stack:**

   **Function 1 - Query Single Record:**
   - Click **"+ Add Function"**
   - Search: `query record`
   - Click **"Query Single Record"**
   - Configure:
     - **Table**: `profile`
     - **Filter**: Click **"+ Add Filter"**
       - **Field**: `id`
       - **Operator**: `=`
       - **Value**: Click dropdown → `inputs.id`
     - **Includes**: Add `education` and `work_experience`
   - Click **"Save"**

   **Function 2 - Response:**
   - Code: `$query_single_record`
   - Click **"Save"**

### Step 5.5: POST /admin/profiles (Create Profile)

1. Click **"+ Add API"**
2. **Method**: **"POST"**
3. **Path**: `/profiles`
4. Click **"Create"**

5. **Add Inputs (all from Body):**
   - `full_name` (text, required)
   - `email` (text, required)
   - `phone_number` (text)
   - `location` (text)
   - `linkedin_url` (text)
   - `github_url` (text)
   - `summary` (text)
   - `education` (type: **"array"**, optional)
   - `work_experience` (type: **"array"**, optional)

6. **Function Stack:**

   **Function 1 - Add Record (Profile):**
   - Click **"+ Add Function"**
   - Search: `add record`
   - Click **"Add Record"**
   - Configure:
     - **Table**: `profile`
     - **Fields**: Click each field and map to inputs:
       - `full_name` → `inputs.full_name`
       - `email` → `inputs.email`
       - `phone_number` → `inputs.phone_number`
       - `location` → `inputs.location`
       - `linkedin_url` → `inputs.linkedin_url`
       - `github_url` → `inputs.github_url`
       - `summary` → `inputs.summary`
   - Click **"Save"**
   - Output stored in `$add_record`

   **Function 2 - For Each (Education):**
   - Click **"+ Add Function"**
   - Search: `for each`
   - Click **"For Each"**
   - Configure:
     - **Array**: Select `inputs.education`
     - **Item Name**: `edu`
   - Click **"Save"**
   
   - Inside the For Each, click **"+ Add Function"** (inside the loop):
   - Search: `add record`
   - Click **"Add Record"**
   - Configure:
     - **Table**: `education`
     - **Fields**:
       - `profile_id` → `$add_record.id` (the profile we just created)
       - `university_name` → `$edu.university_name`
       - `degree_title` → `$edu.degree_title`
       - `field_of_study` → `$edu.field_of_study`
       - `start_date` → `$edu.start_date`
       - `end_date` → `$edu.end_date`
       - `location` → `$edu.location`
   - Click **"Save"**

   **Function 3 - For Each (Work Experience):**
   - Click **"+ Add Function"** (outside/after the education loop)
   - Search: `for each`
   - Click **"For Each"**
   - Configure:
     - **Array**: `inputs.work_experience`
     - **Item Name**: `work`
   
   - Inside this loop, add **"Add Record"**:
     - **Table**: `work_experience`
     - **Fields**:
       - `profile_id` → `$add_record.id`
       - `job_title` → `$work.job_title`
       - `company_name` → `$work.company_name`
       - `employment_type` → `$work.employment_type`
       - `location` → `$work.location`
       - `start_date` → `$work.start_date`
       - `end_date` → `$work.end_date`
       - `is_current` → `$work.is_current`
       - `description` → `$work.description`
   - Click **"Save"**

   **Function 4 - Query Single Record (Return Complete Profile):**
   - Click **"+ Add Function"**
   - Search: `query record`
   - Click **"Query Single Record"**
   - Configure:
     - **Table**: `profile`
     - **Filter**: `id = $add_record.id`
     - **Includes**: `education`, `work_experience`
   - Click **"Save"**

   **Function 5 - Response:**
   - Code: `$query_single_record`
   - Click **"Save"**

7. **Test:**
   - Click **"Run & Debug"**
   - Add Authorization header
   - In body, enter:
     ```json
     {
       "full_name": "John Doe",
       "email": "john@example.com",
       "phone_number": "555-1234",
       "location": "New York, NY",
       "summary": "Experienced software engineer",
       "education": [
         {
           "degree_title": "Bachelor of Science",
           "field_of_study": "Computer Science",
           "university_name": "MIT",
           "start_date": "2015-09-01",
           "end_date": "2019-05-31"
         }
       ],
       "work_experience": [
         {
           "job_title": "Senior Developer",
           "company_name": "Tech Corp",
           "start_date": "2019-06-01",
           "is_current": true,
           "description": "Lead development team"
         }
       ]
     }
     ```
   - Click **"Run"**
   - Should return the created profile with nested education and work arrays

### Step 5.6: PATCH /admin/profiles/:id (Update Profile)

1. Click **"+ Add API"**
2. **Method**: **"PATCH"**
3. **Path**: `/profiles/:id`
4. Click **"Create"**

5. **Add Inputs:**
   - `id` (text, path, required)
   - Same body inputs as POST (all optional for PATCH)

6. **Function Stack:**

   **Function 1 - Edit Record:**
   - Add Function → **"Edit Record"**
   - **Table**: `profile`
   - **Filter**: `id = inputs.id`
   - Map all fields from inputs
   - Click **"Save"**

   **Function 2 - Delete Records (Education):**
   - Add Function → **"Delete Records"**
   - **Table**: `education`
   - **Filter**: `profile_id = inputs.id`
   - Click **"Save"**

   **Function 3 - For Each (Re-add Education):**
   - Same as in POST endpoint

   **Function 4 - Delete Records (Work Experience):**
   - Delete all work_experience where `profile_id = inputs.id`

   **Function 5 - For Each (Re-add Work Experience):**
   - Same as in POST endpoint

   **Function 6 - Query & Response:**
   - Return updated profile with relations

### Step 5.7: DELETE /admin/profiles/:id

1. Click **"+ Add API"**
2. **Method**: **"DELETE"**
3. **Path**: `/profiles/:id`
4. Click **"Create"**

5. **Add Input:**
   - `id` (text, path, required)

6. **Function Stack:**

   **Function 1 - Delete Records (Education):**
   - Add Function → **"Delete Records"**
   - **Table**: `education`
   - **Filter**: `profile_id = inputs.id`

   **Function 2 - Delete Records (Work Experience):**
   - Add Function → **"Delete Records"**
   - **Table**: `work_experience`
   - **Filter**: `profile_id = inputs.id`

   **Function 3 - Delete Record (Profile):**
   - Add Function → **"Delete Record"**
   - **Table**: `profile`
   - **Filter**: `id = inputs.id`

   **Function 4 - Response:**
   - Code: `{ "success": true }`

### Step 5.8: Create Bidder Endpoints

Follow same pattern as profiles:

**GET /admin/bidders:**
- Query All Records from `bidder` table
- Include relation: `profile`

**POST /admin/bidders:**
- Add Input: `full_name`, `email`, `profile_id`
- Add Record to `bidder` table
- Response: created bidder

**PATCH /admin/bidders/:id:**
- Edit Record in `bidder` table

**DELETE /admin/bidders/:id:**
- Delete Record from `bidder` table

### Step 5.9: Create Token Endpoints

**GET /admin/tokens:**
1. Create endpoint: GET `/tokens`
2. Function Stack:
   - Query All Records → `access_token` (include `bidder` → `profile`)
   - Response: `$query_all_records`

**POST /admin/tokens (Generate Token):**
1. Create endpoint: POST `/tokens`
2. Add Inputs:
   - `bidder_id` (text, required)
   - `expires_at` (timestamp, optional)

3. **Function Stack:**

   **Function 1 - Custom Code (Generate Token):**
   - Click **"+ Add Function"**
   - Search: `function`
   - Click **"Function"** (custom code)
   - In the code editor:
     ```javascript
     const crypto = require('crypto');
     
     // Generate random token (64 characters)
     const token = crypto.randomBytes(32).toString('hex');
     
     // Hash the token for storage
     const token_hash = crypto.createHash('sha256').update(token).digest('hex');
     
     return {
       token: token,
       token_hash: token_hash
     };
     ```
   - Click **"Save"**
   - Output stored in `$function`

   **Function 2 - Add Record:**
   - Add Function → **"Add Record"**
   - **Table**: `access_token`
   - **Fields**:
     - `token_hash` → `$function.token_hash`
     - `bidder_id` → `inputs.bidder_id`
     - `expires_at` → `inputs.expires_at`
     - `is_active` → `true` (manual entry)
     - `is_used` → `false` (manual entry)
   - Click **"Save"**

   **Function 3 - Response:**
   - Code:
     ```json
     {
       "token": $function.token,
       "bidder_id": $add_record.bidder_id,
       "expires_at": $add_record.expires_at,
       "issued_at": $add_record.issued_at
     }
     ```

4. **Test:**
   - Run & Debug
   - Body: `{ "bidder_id": "YOUR_BIDDER_ID" }`
   - Copy the returned token - this is what bidders will use!

### Step 5.10: Create Rule Endpoints

**GET /admin/rules:**
- Query All Records → `rule`

**POST /admin/rules:**
- Inputs: `sentence`, `target_section`
- Add Record → `rule`

**PATCH /admin/rules/:id:**
- Edit Record → `rule`

**DELETE /admin/rules/:id:**
- Delete Record → `rule`

### Step 5.11: Create Dashboard Stats Endpoint

1. Create endpoint: GET `/dashboard/stats`

2. **Function Stack:**

   **Function 1 - Query Count (Profiles):**
   - Add Function → Search: `count`
   - Click **"Query Count"**
   - **Table**: `profile`
   - Click **"Save"**
   - Output: `$query_count`

   **Function 2 - Query Count (Bidders):**
   - Add Function → **"Query Count"**
   - **Table**: `bidder`
   - Output: `$query_count_2`

   **Function 3 - Query Count (Active Tokens):**
   - Add Function → **"Query Count"**
   - **Table**: `access_token`
   - **Filter**: `is_active = true`
   - Output: `$query_count_3`

   **Function 4 - Query Count (Active Rules):**
   - Add Function → **"Query Count"**
   - **Table**: `rule`
   - **Filter**: `is_active = true`
   - Output: `$query_count_4`

   **Function 5 - Response:**
   - Code:
     ```json
     {
       "profiles": $query_count,
       "bidders": $query_count_2,
       "activeTokens": $query_count_3,
       "activeRules": $query_count_4
     }
     ```

---

## Part 6: Public API - Token Validation

### Step 6.1: Create Public API Group

1. Click **"+ Add API Group"**
2. **Name**: `public`
3. **Base Path**: `/public`
4. Click **"Create"**
5. **DO NOT enable authentication** (public endpoints)

### Step 6.2: POST /public/validate-token

1. Click **"+ Add API"**
2. **Method**: **"POST"**
3. **Path**: `/validate-token`
4. Click **"Create"**

5. **Add Input:**
   - **Name**: `token`
   - **Type**: **"text"**
   - **Source**: **"Body"**
   - Check **"required"**

6. **Function Stack:**

   **Function 1 - Custom Code (Hash Token):**
   - Add Function → **"Function"**
   - Code:
     ```javascript
     const crypto = require('crypto');
     const token_hash = crypto.createHash('sha256')
       .update(inputs.token)
       .digest('hex');
     
     return { token_hash };
     ```
   - Output: `$function`

   **Function 2 - Query Single Record:**
   - Add Function → **"Query Single Record"**
   - **Table**: `access_token`
   - **Filter**: Click **"+ Add Filter"**
     - Field: `token_hash`
     - Operator: `=`
     - Value: `$function.token_hash`
   - Click **"+ Add Filter"** (AND condition)
     - Field: `is_active`
     - Operator: `=`
     - Value: `true` (boolean)
   - **Includes**: Add `bidder` → then expand `bidder` and add `profile`
   - Click **"Save"**
   - Output: `$query_single_record`

   **Function 3 - Conditional (Check if Token Found):**
   - Add Function → Search: `if else`
   - Click **"If / Else"**
   - **Condition**: Click to edit
     - Select: `$query_single_record`
     - Operator: `is not null`
   - Click **"Save"**

   **Inside IF branch (token found):**
   
   - Add Function → **"If / Else"** (nested)
   - **Condition**: Check if expired
     - Left: `$query_single_record.expires_at`
     - Operator: `is null` OR `>` (greater than)
     - Right: `now()` (current timestamp)
   - This checks: expires_at is null (never expires) OR expires_at > now (not expired yet)

   **Inside this nested IF (not expired):**
   - Add Function → **"Response"**
   - Code:
     ```json
     {
       "valid": true,
       "profile_id": $query_single_record.bidder.profile.id,
       "profile_name": $query_single_record.bidder.profile.full_name,
       "bidder_id": $query_single_record.bidder.id
     }
     ```

   **Inside nested ELSE (expired):**
   - Add Function → **"Response"**
   - Code:
     ```json
     {
       "valid": false,
       "error": "TOKEN_EXPIRED"
     }
     ```

   **Inside outer ELSE (token not found):**
   - Add Function → **"Response"**
   - Code:
     ```json
     {
       "valid": false,
       "error": "TOKEN_INVALID"
     }
     ```

7. **Test:**
   - Run & Debug
   - Body: `{ "token": "YOUR_GENERATED_TOKEN" }`
   - Should return `{ "valid": true, ... }` with profile info

---

## Part 7: Resume Generation Endpoint (Complex)

### Step 7.1: Setup OpenAI API Key

1. Go to **Settings** (gear icon)
2. Click **"Environment Variables"** tab
3. Click **"+ Add Variable"**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (your OpenAI API key)
   - Check **"Secret"** (hides value)
4. Click **"Save"**

### Step 7.2: Create Resume API Group

1. Click **"+ Add API Group"**
2. **Name**: `resume`
3. **Base Path**: `/resume`
4. Click **"Create"**
5. **DO NOT enable group authentication** (we'll validate token manually)

### Step 7.3: POST /resume/generate

1. Click **"+ Add API"**
2. **Method**: **"POST"**
3. **Path**: `/generate`
4. Click **"Create"**

5. **Add Inputs:**
   - `profile_id` (text, body, required)
   - `job_description` (text, body, required)
   - `token` (text, header: "Authorization", required)

6. **Function Stack (Long):**

   **Function 1 - Custom Code (Extract & Hash Token):**
   - Add Function → **"Function"**
   - Code:
     ```javascript
     // Extract token from "Bearer <token>" format
     const token = inputs.token.replace('Bearer ', '').trim();
     
     // Hash it
     const crypto = require('crypto');
     const token_hash = crypto.createHash('sha256')
       .update(token)
       .digest('hex');
     
     return { token_hash };
     ```

   **Function 2 - Query Single Record (Validate Token):**
   - Add Function → **"Query Single Record"**
   - **Table**: `access_token`
   - **Filter**: 
     - `token_hash = $function.token_hash`
     - AND `is_active = true`
   - **Includes**: `bidder` → `profile`

   **Function 3 - If/Else (Token Valid?):**
   - Add Function → **"If / Else"**
   - **Condition**: `$query_single_record is null`
   
   **Inside IF (invalid token):**
   - Add Function → **"Response"**
   - Code:
     ```json
     {
       "success": false,
       "error": "TOKEN_INVALID"
     }
     ```
   - Click **"Stop Execution"** toggle (prevents further execution)

   **After IF/ELSE continues (valid token):**

   **Function 4 - Query Single Record (Get Profile):**
   - Add Function → **"Query Single Record"**
   - **Table**: `profile`
   - **Filter**: `id = inputs.profile_id`

   **Function 5 - Query All Records (Education):**
   - Add Function → **"Query All Records"**
   - **Table**: `education`
   - **Filter**: `profile_id = inputs.profile_id`
   - **Sort**: `start_date DESC`

   **Function 6 - Query All Records (Work Experience):**
   - Add Function → **"Query All Records"**
   - **Table**: `work_experience`
   - **Filter**: `profile_id = inputs.profile_id`
   - **Sort**: `start_date DESC`

   **Function 7 - Query All Records (Rules):**
   - Add Function → **"Query All Records"**
   - **Table**: `rule`
   - **Filter**: `is_active = true`

   **Function 8 - Custom Code (Build AI Prompt):**
   - Add Function → **"Function"**
   - Code:
     ```javascript
     const profile = vars.query_single_record_2; // profile query
     const education = vars.query_all_records; // education query
     const work = vars.query_all_records_2; // work query
     const rules = vars.query_all_records_3; // rules query
     
     // Truncate job description
     const jobDesc = inputs.job_description.substring(0, 5000);
     
     // Build education text
     const educationText = education.map(e => {
       const dates = `${e.start_date || 'N/A'} - ${e.end_date || 'Present'}`;
       return `${e.degree_title} ${e.field_of_study ? 'in ' + e.field_of_study : ''}
${e.university_name || 'N/A'}
${dates}
${e.location || ''}`.trim();
     }).join('\n\n');
     
     // Build work text
     const workText = work.map(w => {
       const dates = `${w.start_date || 'N/A'} - ${w.end_date || 'Present'}`;
       return `${w.job_title} at ${w.company_name || 'N/A'}
${w.employment_type || ''} | ${w.location || ''}
${dates}
${w.description || ''}`.trim();
     }).join('\n\n');
     
     // Build rules text
     const rulesText = rules.map((r, i) => `${i+1}. ${r.sentence}`).join('\n');
     
     // Construct system prompt
     const systemPrompt = `You are a professional resume and cover letter writer. Generate tailored, ATS-friendly content that highlights relevant skills and achievements. Format the output as valid JSON.`;
     
     // Construct user prompt
     const userPrompt = `Profile Information:
Name: ${profile.full_name}
Email: ${profile.email}
Phone: ${profile.phone_number || 'N/A'}
Location: ${profile.location || 'N/A'}
LinkedIn: ${profile.linkedin_url || 'N/A'}
GitHub: ${profile.github_url || 'N/A'}
Summary: ${profile.summary || 'N/A'}

Education:
${educationText}

Work Experience:
${workText}

Job Description:
${jobDesc}

Rules to Follow:
${rulesText}

Generate a tailored resume and cover letter for this job. Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "resume_text": "FULL RESUME TEXT HERE with clear section headers like SUMMARY, EXPERIENCE, EDUCATION, SKILLS",
  "cover_letter_text": "FULL COVER LETTER TEXT HERE in professional business format"
}`;
     
     return {
       systemPrompt,
       userPrompt,
       profile_name: profile.full_name
     };
     ```

   **Function 9 - External Request (Call OpenAI):**
   - Add Function → Search: `external`
   - Click **"External Request"**
   - Configure:
     - **Method**: **"POST"**
     - **URL**: `https://api.openai.com/v1/chat/completions`
     - **Headers**: Click **"+ Add Header"**
       - Key: `Authorization`
       - Value: `Bearer ${env.OPENAI_API_KEY}` (click to use variable)
       - Click **"+ Add Header"**
       - Key: `Content-Type`
       - Value: `application/json`
     - **Body**: Switch to JSON mode, enter:
       ```json
       {
         "model": "gpt-4",
         "messages": [
           {
             "role": "system",
             "content": $function.systemPrompt
           },
           {
             "role": "user",
             "content": $function.userPrompt
           }
         ],
         "temperature": 0.7,
         "max_tokens": 3000,
         "response_format": { "type": "json_object" }
       }
       ```
   - Click **"Save"**
   - Output: `$external_request`

   **Function 10 - Custom Code (Parse AI Response):**
   - Add Function → **"Function"**
   - Code:
     ```javascript
     try {
       const content = vars.external_request.choices[0].message.content;
       const parsed = JSON.parse(content);
       
       const profile_name = vars.function.profile_name.replace(/\s+/g, '_');
       
       return {
         resume_text: parsed.resume_text,
         cover_letter_text: parsed.cover_letter_text,
         resume_filename: `Resume_${profile_name}.pdf`,
         cover_letter_filename: `Cover_Letter_${profile_name}.pdf`
       };
     } catch (error) {
       return {
         error: 'Failed to parse AI response',
         raw: vars.external_request
       };
     }
     ```

   **Function 11 - Add Record (Log Generation - Optional):**
   - Add Function → **"Add Record"**
   - **Table**: `generation_log`
   - **Fields**:
     - `bidder_id` → `$query_single_record.bidder_id` (from token validation)
     - `profile_id` → `inputs.profile_id`
     - `status` → `"success"` (text)

   **Function 12 - Response:**
   - Add Function → **"Response"**
   - Code:
     ```json
     {
       "resume_text": $function_2.resume_text,
       "cover_letter_text": $function_2.cover_letter_text,
       "resume_filename": $function_2.resume_filename,
       "cover_letter_filename": $function_2.cover_letter_filename
     }
     ```

7. **Add Error Handling:**
   - Wrap OpenAI request in Try/Catch:
     - Select the External Request function
     - Click **"Add Error Handler"**
     - In CATCH branch:
       - Add Function → **"Response"**
       - Code:
         ```json
         {
           "success": false,
           "error": "AI_ERROR",
           "message": "Failed to generate resume"
         }
         ```

8. **Test:**
   - Click **"Run & Debug"**
   - Headers:
     - `Authorization`: `Bearer YOUR_VALID_TOKEN`
   - Body:
     ```json
     {
       "profile_id": "YOUR_PROFILE_ID",
       "job_description": "We are looking for a Senior Developer..."
     }
     ```
   - Click **"Run"**
   - Should return resume_text and cover_letter_text
   - **Note**: This will use OpenAI credits!

---

## Part 8: CORS & Security Configuration

### Step 8.1: Enable CORS

1. Click **"Settings"** (gear icon)
2. Click **"API"** tab
3. Scroll to **"CORS Settings"**
4. Toggle **"Enable CORS"** to ON
5. **Allowed Origins**:
   - Click **"+ Add Origin"**
   - Enter: `http://localhost:3001`
   - Click **"+ Add Origin"**
   - Enter: `http://localhost:3000`
   - Click **"+ Add Origin"**
   - Enter: your production domain (e.g., `https://yourdomain.com`)
6. **Allowed Methods**: Check ALL (GET, POST, PATCH, DELETE, OPTIONS)
7. **Allowed Headers**: Add:
   - `Content-Type`
   - `Authorization`
8. Click **"Save"**

### Step 8.2: Rate Limiting

1. Still in **Settings** → **API**
2. Scroll to **"Rate Limiting"**
3. Toggle **"Enable Rate Limiting"** to ON
4. **Default Rate**:
   - **Requests**: `100`
   - **Per**: `1 minute`
5. **Custom Rates** (for specific endpoints):
   - Click **"+ Add Custom Rate"**
   - **Endpoint**: Select `/resume/generate`
   - **Requests**: `10`
   - **Per**: `1 minute`
   - Click **"Save"**

---

## Part 9: Get API Base URL

### Step 9.1: Copy Base URL

1. Click **"API"** in left sidebar
2. At the top, you'll see: **Base URL**: `https://xxxxx-xxxxx.xano.io/api:v1`
3. Click the **copy icon** next to it
4. This is your API base URL!

### Step 9.2: Update Frontend Environment

1. Open your admin panel project
2. Open `.env.local` file
3. Update:
   ```
   NEXT_PUBLIC_API_URL=https://xxxxx-xxxxx.xano.io/api:v1
   ```
4. Restart your Next.js dev server

---

## Part 10: Testing Full Flow

### Step 10.1: Test Admin Panel Integration

1. **Login:**
   - Open admin panel: `http://localhost:3001`
   - Login with: `admin@example.com` / `YourSecurePassword123!`
   - Should redirect to dashboard

2. **Create Profile:**
   - Go to Profiles page
   - Click "New Profile"
   - Fill in all details
   - Add education entry
   - Add work experience entry
   - Click "Create Profile"
   - Should see success message

3. **Create Bidder:**
   - Go to Bidders page
   - Click "New Bidder"
   - Fill in name, email
   - Select the profile you created
   - Click "Create Bidder"

4. **Generate Token:**
   - Go to Tokens page
   - Click "Generate New Token"
   - Select the bidder
   - Set expiration (optional)
   - Click "Generate"
   - **Copy the token!** (You'll need it for extension)

5. **Create Rules:**
   - Go to Rules page
   - Click "Add Rule"
   - Enter: "Start all bullet points with strong action verbs"
   - Target section: "work_experience"
   - Click "Save"
   - Add 2-3 more rules

### Step 10.2: Test Browser Extension

1. **Setup Token:**
   - Go to `swiftcv` folder
   - Open `token.json`
   - Replace content:
     ```json
     {
       "token": "YOUR_COPIED_TOKEN_HERE"
     }
     ```
   - Save file

2. **Load Extension:**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `swiftcv` folder
   - Extension should load

3. **Test Token Validation:**
   - Click extension icon in toolbar
   - Click "Validate Token"
   - Should show green checkmark with profile name

4. **Test Resume Generation:**
   - Go to any job posting website (LinkedIn, Indeed, etc.)
   - Select job description text
   - Right-click → "Generate Resume"
   - Click "Generate" in confirmation popup
   - Wait ~10-15 seconds
   - Should download 2 PDFs:
     - `Resume_YourName.pdf`
     - `Cover_Letter_YourName.pdf`

---

## Part 11: Monitoring & Debugging

### Step 11.1: View Logs

1. In Xano, click **"Logs"** (in left sidebar)
2. See all API requests:
   - Endpoint called
   - Response time
   - Status code
   - Request/response data
3. Click any log entry to see full details

### Step 11.2: View Database Data

1. Click **"Database"**
2. Click any table
3. See all records
4. Click any record to view/edit

### Step 11.3: Debug Endpoints

1. Click **"API"**
2. Click any endpoint
3. Click **"Run & Debug"**
4. Set breakpoints by clicking line numbers
5. Step through function stack
6. Inspect variables at each step

---

## Part 12: Common Issues & Solutions

### Issue 1: "Authentication Required" Error

**Solution:**
- Check Authorization header is set
- Token format: `Bearer <token>`
- Verify token in Run & Debug
- Check admin group has authentication enabled

### Issue 2: Token Validation Returns "Invalid"

**Solution:**
- Verify token is hashed consistently (SHA-256)
- Check `is_active = true` in database
- Verify `expires_at` is null or future date
- Check token wasn't already used (if tracking)

### Issue 3: OpenAI Request Fails

**Solution:**
- Verify `OPENAI_API_KEY` in environment variables
- Check OpenAI account has credits
- Verify API key has correct permissions
- Check prompt isn't too long (< 8000 tokens)
- Test OpenAI API directly with curl

### Issue 4: CORS Errors

**Solution:**
- Add frontend URL to allowed origins
- Include `http://` or `https://` in origin
- Restart Next.js dev server
- Clear browser cache
- Check Network tab in DevTools

### Issue 5: Relations Not Loading

**Solution:**
- Check relations are properly configured in Database
- Verify "Includes" are added in Query functions
- Check relation type (One-to-One, One-to-Many, etc.)
- Test query in Run & Debug

### Issue 6: For Each Loop Not Working

**Solution:**
- Verify input is array type
- Check item name doesn't conflict with existing variables
- Ensure array items have expected structure
- Add conditional to check array is not empty

---

## Part 13: Production Deployment Checklist

### Before Going Live:

- [ ] Change admin password to strong, unique password
- [ ] Update CORS origins to production domain only
- [ ] Set appropriate rate limits
- [ ] Add monitoring for API usage
- [ ] Test all endpoints with production data
- [ ] Verify OpenAI credits are sufficient
- [ ] Add error notifications (email/Slack)
- [ ] Set up database backups
- [ ] Document all API endpoints
- [ ] Test extension in production environment
- [ ] Update extension with production API URL
- [ ] Add analytics tracking (optional)
- [ ] Test with real job descriptions
- [ ] Verify PDF generation works correctly
- [ ] Load test resume generation endpoint
- [ ] Set up uptime monitoring

---

## Part 14: API Endpoint Summary

Your complete API structure:

```
https://xxxxx-xxxxx.xano.io/api:v1

/auth
  POST /login

/admin (requires JWT)
  GET    /profiles
  GET    /profiles/:id
  POST   /profiles
  PATCH  /profiles/:id
  DELETE /profiles/:id
  
  GET    /bidders
  POST   /bidders
  PATCH  /bidders/:id
  DELETE /bidders/:id
  
  GET    /tokens
  POST   /tokens
  
  GET    /rules
  POST   /rules
  PATCH  /rules/:id
  DELETE /rules/:id
  
  GET    /dashboard/stats

/public
  POST /validate-token

/resume
  POST /generate
```

---

## Part 15: Next Steps

1. **Complete all endpoints** following the patterns above
2. **Test each endpoint** using Run & Debug
3. **Verify database relations** are working
4. **Test frontend integration** with real data
5. **Generate test tokens** for extension
6. **Test extension** with multiple profiles
7. **Monitor API usage** in Xano dashboard
8. **Optimize queries** if needed
9. **Add error handling** for edge cases
10. **Document any customizations**

---

## Support Resources

- **Xano Documentation**: https://docs.xano.com
- **Xano Community**: https://community.xano.com
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Your API Docs**: Click "API" → "Documentation" in Xano

---

**Congratulations!** You now have a fully functional backend for the SwiftCV application. 🎉

Your backend handles:
✅ Admin authentication & authorization
✅ Profile & bidder management
✅ Token generation & validation
✅ Rule engine
✅ AI-powered resume generation
✅ Complete CRUD operations
✅ Security & rate limiting
✅ CORS configuration

The frontend and extension are ready to connect!
