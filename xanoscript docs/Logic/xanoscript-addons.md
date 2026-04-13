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

# XanoScript for Addons

> Define addons in XanoScript to create reusable database query components

export const xanoscriptApiInputsDiagram = `
\`\`\`mermaid
flowchart TB
    A[Declaration] --> B[Input]
    B --> C[Stack]
    C --> D[Response]
    D --> E[Settings]
    style A fill:#cdeaff,stroke:#0077cc,stroke-width:2px
    style B fill:#f5f5f5,stroke:#ccc,stroke-width:1px
    style C fill:#f5f5f5,stroke:#ccc,stroke-width:1px
    style D fill:#f5f5f5,stroke:#ccc,stroke-width:1px
    style E fill:#f5f5f5,stroke:#ccc,stroke-width:1px
\`\`\`
`;

export function SideBySide({diagram, children}) {
  return <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    flexWrap: "wrap"
  }}>
      <div style={{
    flex: "0 0 180px",
    minWidth: "150px"
  }}>
        <div>{mdx(diagram)}</div>
      </div>
      <div style={{
    flex: 1
  }}>
        {children}
      </div>
    </div>;
}

export const HoverImageCode = ({src, alt = "", width = "100%", maxWidth = "800px", className = "", defaultOpen = false, openOnHover = true, children}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(0);
  useEffect(() => {
    if (panelRef.current) {
      setMaxHeight(open ? panelRef.current.scrollHeight : 0);
    }
  }, [open, children]);
  const handleMouseEnter = () => openOnHover && setOpen(true);
  const handleMouseLeave = () => openOnHover && setOpen(false);
  const handleClick = () => setOpen(s => !s);
  const handleImageClick = e => {
    e.stopPropagation();
    e.preventDefault();
    handleClick();
  };
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transition = prefersReducedMotion ? "none" : "max-height 300ms ease, opacity 300ms ease, transform 300ms ease";
  return <div className={`border rounded-md overflow-hidden ${className}`} style={{
    width,
    maxWidth
  }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {}
      <div role="button" tabIndex={0} aria-label="Toggle code" aria-expanded={open} style={{
    cursor: "pointer"
  }}>
        <img src={src} alt={alt} onClickCapture={e => {
    e.stopPropagation();
    e.preventDefault();
    handleClick();
  }} style={{
    display: "block",
    width: "100%",
    height: "auto"
  }} />
      </div>

      {}
      <div className="not-prose" ref={panelRef} style={{
    overflow: "hidden",
    maxHeight: `${maxHeight}px`,
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0)" : "translateY(-6px)",
    transition
  }}>
        <div style={{
    padding: "0.75rem"
  }}>{children}</div>
      </div>
    </div>;
};

<Warning>
  Please note that while in the visual builder, you can create addons directly from a database query statement. However, when working in XanoScript, you must manually define the addon before adding it to another database query.
</Warning>

## Introduction

The `addon` primitive lets you define reusable database query components using XanoScript. Addons are specifically used alongside existing database queries to enrich the data with related data from other tables.

Each addon corresponds to a **database query** that you can reuse across multiple APIs, functions, or other components — but expressed in code.

Addons will typically:

* Declare their **name** and **description**
* Accept **inputs** for query parameters
* Run a **database query** in the stack
* Return the **query results** directly

***

## Anatomy

Every XanoScript addon follows a predictable structure.

Unlike other primitives, addons have a simplified structure focused on database queries. They contain input parameters, a database query stack, and optional settings.

Here's an example of a fully defined addon in XanoScript:

```javascript XanoScript lines icon="code" theme={null}
// Gets all comments from a specific user.
addon comment {
  input {
    int user_id?
  }

  stack {
    db.query comment {
      search = $db.comment.user_id == $input.user_id
      return = {type: "list"}
    }
  }

  tags = ["database", "user data"]
}
```

***

## Key Characteristics

**Database Query Only**: Addons can only contain database queries (`db.query` or `db.get`) in their stack. No other function types are allowed.

**No Response Block**: Addons automatically return whatever the database query returns. The return value is determined by the `return` parameter:

* `{type: "list"}` — Returns an array of records
* `{type: "single"}` — Returns a single record
* `{type: "count"}` — Returns the count of matching records
* `{type: "aggregate"}` — Returns an aggregation of the records

**Reusable Components**: Perfect for creating reusable query logic that can be called from other functions or APIs.

***

## Parameter Definition

| Parameter     | Required | Description                                                                                                          |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `description` | no       | A short summary of the addon. May also appear as a “//” comment above the block.                                     |
|               |          | **Example:** `description = "Gets all comments from a specific user"`                                                |
| `input`       | no       | Input parameters for the database query.                                                                             |
|               |          | **Example:** `input { int user_id? }`                                                                                |
| `stack`       | ✅        | Database query that will be executed. Must contain only `db.query` or `db.get` functions.                            |
|               |          | **Example:** `stack { db.query comment { search = $db.comment.user_id == $input.user_id return = {type: "list"} } }` |
| `tags`        | no       | A list of tags used to categorize and organize the addon in your workspace.                                          |
|               |          | **Example:** `tags = ["database", "user data"]`                                                                      |

***

## What's Next

Now that you understand how to define addons in XanoScript, here are a few great next steps:

<Card title="Explore the function reference" icon="function" horizontal href="/xanoscript/function-reference">
  Learn about the database functions available in the stack to create more complex queries.
</Card>

<Card title="Try it out in VS Code" icon="https://mintcdn.com/xano-997cb9ee/aZQYcxhIvSDTNEim/images/icons/vscode.svg?fit=max&auto=format&n=aZQYcxhIvSDTNEim&q=85&s=bb6c91058fcbe6ee28fcda04e03de2e6" horizontal href="/xanoscript/vs-code" width="100" height="100" data-path="images/icons/vscode.svg">
  Use the XanoScript VS Code extension with Copilot to write XanoScript in your favorite IDE.
</Card>

<Card title="Learn about APIs" icon="api" horizontal href="/xanoscript/api">
  Use addons in your API endpoints to create reusable database query components.
</Card>


Built with [Mintlify](https://mintlify.com).