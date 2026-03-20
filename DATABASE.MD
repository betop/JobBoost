# SwiftCV – Database Structure

## Overview

System Roles:
- Admin
- Bidder (manages exactly one profile)
- Profile
- Education
- Work Experience
- Access Control via Tokens
- Global Sentence-Based Rule Engine

---

# 1. Users

## 1.1 Admin

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

## 1.2 Bidder

Each bidder manages exactly one profile.

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| profile_id | UUID | UNIQUE, FK → profile.id |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

Constraint:
- One bidder → One profile (UNIQUE profile_id)

---

# 2. Resume Profile

## 2.1 Profile

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| full_name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | NOT NULL |
| phone_number | VARCHAR(50) | OPTIONAL |
| location | VARCHAR(255) | OPTIONAL |
| linkedin_url | VARCHAR(255) | OPTIONAL |
| github_url | VARCHAR(255) | OPTIONAL |
| summary | TEXT | OPTIONAL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

# 3. Education

## 3.1 Education

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| profile_id | UUID | FK → profile.id |
| university_name | VARCHAR(255) | OPTIONAL |
| degree_title | VARCHAR(255) | NOT NULL |
| field_of_study | VARCHAR(255) | OPTIONAL |
| start_date | DATE | NOT NULL |
| end_date | DATE | OPTIONAL |
| location | VARCHAR(255) | OPTIONAL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

# 4. Work Experience

## 4.1 Work_Experience

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| profile_id | UUID | FK → profile.id |
| job_title | VARCHAR(255) | NOT NULL |
| company_name | VARCHAR(255) | OPTIONAL |
| employment_type | VARCHAR(100) | OPTIONAL |
| location | VARCHAR(255) | OPTIONAL |
| start_date | DATE | NOT NULL |
| end_date | DATE | OPTIONAL |
| is_current | BOOLEAN | DEFAULT false |
| description | TEXT | OPTIONAL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

---

# 5. Rule Engine (Global Sentence-Based)

## 5.1 Rule

Each rule is a single sentence defined by admin.
Rules apply globally during resume generation.

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| sentence | TEXT | NOT NULL |
| target_section | VARCHAR(100) | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_by_admin_id | UUID | FK → admin.id |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### target_section examples

- summary
- work_experience
- education
- skills
- global

Example rule sentences:

- "All bullet points must start with strong action verbs."
- "Avoid generic phrases like responsible for."
- "Ensure at least 4 measurable achievements per role."
- "Keep summary under 120 words."

Each row represents exactly one sentence rule.

---

# 6. Access Control

## 6.1 Profile_Access

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| bidder_id | UUID | FK → bidder.id |
| profile_id | UUID | FK → profile.id |
| granted_by_admin_id | UUID | FK → admin.id |
| granted_at | TIMESTAMP | NOT NULL |
| expires_at | TIMESTAMP | OPTIONAL |
| is_active | BOOLEAN | DEFAULT true |

---

## 6.2 Access_Token

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | PK |
| token | VARCHAR(255) | UNIQUE, NOT NULL |
| bidder_id | UUID | FK → bidder.id |
| created_by_admin_id | UUID | FK → admin.id |
| issued_at | TIMESTAMP | NOT NULL |
| expires_at | TIMESTAMP | OPTIONAL |
| is_used | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

---

# 7. Relationships Summary

Admin
- Creates Rules
- Creates Access Tokens
- Grants Profile Access

Bidder
- Manages exactly one Profile

Profile
- Has many Educations
- Has many Work Experiences

Rule
- Is a single sentence
- Applies globally
- Created by Admin

---

# 8. Architectural Notes

- Rules are global and atomic.
- Resume generation service loads all active rules.
- Rule evaluation occurs in application layer.
- Index target_section for fast filtering.
- Use UUIDs for scalability.

---

End of Schema
