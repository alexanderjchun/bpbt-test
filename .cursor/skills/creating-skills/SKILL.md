---
name: creating-skills
description: Creating new Agent Skills. Use when the user asks to create, make, add, or define a new skill, or convert rules/documentation into a skill.
---

# Creating Agent Skills

## Directory Structure

```
.agent/skills/<skill-name>/
└── SKILL.md    # Required
```

## SKILL.md Format

### Required Frontmatter

```markdown
---
name: skill-name
description: What this skill does and when to use it.
---
```

### Optional Frontmatter Fields

```markdown
---
name: skill-name
description: What this skill does and when to use it.
license: MIT
compatibility: Requires git and internet access
metadata:
  author: your-name
  version: "1.0"
allowed-tools: Bash(git:*) Read
---
```

### Body Content

The body should include:
- Step-by-step instructions
- Examples of inputs and outputs
- Common edge cases
- Reference material as needed

## Naming Rules

- **Lowercase only** with hyphens (a-z, -)
- **No consecutive hyphens** (`--`)
- **Cannot start/end with hyphen**
- **Directory name must match `name` field**

## Best Practices

- Keep description under 1024 characters
- Include trigger phrases in description (e.g., "Use when...")
- Keep SKILL.md body under 5000 tokens
- Use markdown tables for reference material
- Add code examples where helpful

## Reference

Full specification: https://agentskills.io/specification
