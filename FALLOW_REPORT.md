# Fallow Analysis Report (Post-Accessibility Fix)

This report contains the updated output of all available `npx fallow` commands after addressing identified issues, including accessibility improvements.

## Default Combined Analysis
```text
Warning: shallow clone detected. Hotspot analysis may be incomplete. Use `git fetch --unshallow` for full history.

■ Metrics: dead files 0.0% (0 of 34) · dead exports 0.0% (0 of 36) · MI 96.2 (good)
  34 files analyzed
  34 entry points detected (33 plugin, 1 default index)

── Dead Code ──────────────────────────────────────

✓ No issues found (0.08s)

── Duplication ────────────────────────────────────

✓ No code duplication found (0.02s)

── Complexity ─────────────────────────────────────

■ Metrics: 967 LOC · dead files 0.0% · dead exports 0.0% · avg cyclomatic 1.4 · p90 cyclomatic 2 · maintainability 96.2 (good) · 0 churn hotspots (since 6 months)

● File health scores (22 files) · sorted by triage concern

   93.3    src/components/sidebar/SidebarTab.tsx           risk
             28 LOC    1 fan-in    2 fan-out    0% dead  0.14 density  20.0 risk

   89.5    src/components/sidebar/Sidebar.tsx              risk
             55 LOC    1 fan-in    5 fan-out    0% dead  0.11 density  12.0 risk

   94.9    src/components/sidebar/ProjectItem.tsx          risk
             35 LOC    1 fan-in    1 fan-out    0% dead  0.11 density  12.0 risk

   98.2    src/components/sidebar/SidebarHeader.tsx        risk
             22 LOC    1 fan-in    0 fan-out    0% dead  0.14 density  12.0 risk

   89.9    src/services/ChatSessionManager.ts              risk
             38 LOC    2 fan-in    1 fan-out    0% dead  0.32 density  6.0 risk

   93.3    src/components/sidebar/ChatsList.tsx            risk
             30 LOC    1 fan-in    2 fan-out    0% dead  0.13 density  6.0 risk

   95.2    src/components/settings/SettingsModal.tsx       risk
             69 LOC    0 fan-in    0 fan-out    0% dead  0.16 density  6.0 risk

   96.0    src/components/sidebar/ProjectsSection.tsx      risk
             23 LOC    1 fan-in    1 fan-out    0% dead  0.09 density  6.0 risk

   98.8    src/components/sidebar/SidebarTabLabel.tsx      risk
             14 LOC    1 fan-in    0 fan-out    0% dead  0.14 density  6.0 risk

   90.9    src/pages/ChatPage.tsx                          risk
            128 LOC    2 fan-in    1 fan-out    0% dead  0.21 density  5.1 risk

  ... and 12 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores

✗ 0 above threshold · 75 analyzed · maintainability 96.2 (good) (0.01s)
```

## Dead Code Analysis
```text
34 entry points detected (33 plugin, 1 default index)

✓ No issues found (0.05s)
```

## Duplication Analysis
```text
✓ No code duplication found (0.01s)
```

## Health & Complexity Analysis
```text
Warning: shallow clone detected. Hotspot analysis may be incomplete. Use `git fetch --unshallow` for full history.

● Health score: 90 A
  Deductions: unit size -10.0

■ Metrics: 967 LOC · dead files 0.0% · dead exports 0.0% · avg cyclomatic 1.4 · p90 cyclomatic 2 · maintainability 96.2 (good) · 0 churn hotspots (since 6 months) · duplication 0.0%

● File health scores (22 files) · sorted by triage concern

   93.3    src/components/sidebar/SidebarTab.tsx           risk
             28 LOC    1 fan-in    2 fan-out    0% dead  0.14 density  20.0 risk

   89.5    src/components/sidebar/Sidebar.tsx              risk
             55 LOC    1 fan-in    5 fan-out    0% dead  0.11 density  12.0 risk

   94.9    src/components/sidebar/ProjectItem.tsx          risk
             35 LOC    1 fan-in    1 fan-out    0% dead  0.11 density  12.0 risk

   98.2    src/components/sidebar/SidebarHeader.tsx        risk
             22 LOC    1 fan-in    0 fan-out    0% dead  0.14 density  12.0 risk

   89.9    src/services/ChatSessionManager.ts              risk
             38 LOC    2 fan-in    1 fan-out    0% dead  0.32 density  6.0 risk

   93.3    src/components/sidebar/ChatsList.tsx            risk
             30 LOC    1 fan-in    2 fan-out    0% dead  0.13 density  6.0 risk

   95.2    src/components/settings/SettingsModal.tsx       risk
             69 LOC    0 fan-in    0 fan-out    0% dead  0.16 density  6.0 risk

   96.0    src/components/sidebar/ProjectsSection.tsx      risk
             23 LOC    1 fan-in    1 fan-out    0% dead  0.09 density  6.0 risk

   98.8    src/components/sidebar/SidebarTabLabel.tsx      risk
             14 LOC    1 fan-in    0 fan-out    0% dead  0.14 density  6.0 risk

   90.9    src/pages/ChatPage.tsx                          risk
            128 LOC    2 fan-in    1 fan-out    0% dead  0.21 density  5.1 risk

  ... and 12 more files (--format json for full list)

  Sorted by triage concern: the larger of low-MI concern and CRAP risk. The risk / structure tag marks which one placed each file. MI reflects complexity, coupling, and dead code; risk reflects untested complexity (CRAP) and can diverge from MI. Risk: low <15, moderate 15-30, high >=30. CRAP estimated from export references (85% direct, 40% indirect, 0% untested). Run `fallow health --coverage <coverage-final.json>` for exact scores. https://docs.fallow.tools/explanations/health#file-health-scores

✗ 0 above threshold · 75 analyzed · maintainability 96.2 (good) (0.06s)
```

## Feature Flags
```text
✓ No feature flags detected (0.05s)
  Scanned 34 files for:
    · Env prefixes: FEATURE_*, NEXT_PUBLIC_FEATURE_*, NEXT_PUBLIC_ENABLE_*, REACT_APP_FEATURE_*, REACT_APP_ENABLE_*, VITE_FEATURE_*, VITE_ENABLE_*, NUXT_PUBLIC_FEATURE_*, ENABLE_*, FF_*, FLAG_*, TOGGLE_*
    · SDKs: LaunchDarkly, Statsig, Unleash, GrowthBook, Split, PostHog, ConfigCat, Flagsmith, Optimizely, Eppo, Vercel Flags
  Using a different SDK (in-house, or one not listed)? Add it via `flags.sdkPatterns` in your config.
  For property-access patterns (config.featureX), enable `flags.configObjectHeuristics`.
  Docs: https://docs.fallow.tools/cli/flags#configuration
```

## Security Analysis
```text
Security review: 0 items to check in the scanned code.

No security details to show.
[I] Blind spot: 8 call sites use code patterns that fallow could not resolve, such as dynamic dispatch, computed members, or aliased bindings.
    Most unresolved callees: dynamic-dispatch in tests/chat-performance.test.tsx.

Result: 0 security items to check.
```

## Audit Analysis
```text
Audit scope: 19 changed files vs 445779283727 (merge-base with origin/main) (4457792..HEAD)
✓ No issues in 19 changed files (0.17s)
```

## Project Structure (List)
```text
Active plugins:
  - vite
  - vitest
  - eslint
  - prettier
  - typescript
  - tailwind
  - postcss
Discovered 34 files
eslint.config.js
index.html
postcss.config.cjs
src/App.tsx
src/components/chat/ChatInput.tsx
src/components/settings/SettingsModal.tsx
src/components/sidebar/ChatsList.tsx
src/components/sidebar/GlassyFolderIcon.tsx
src/components/sidebar/ProjectItem.tsx
src/components/sidebar/ProjectsSection.tsx
src/components/sidebar/Sidebar.tsx
src/components/sidebar/SidebarHeader.tsx
src/components/sidebar/SidebarTab.tsx
src/components/sidebar/SidebarTabIcon.tsx
src/components/sidebar/SidebarTabLabel.tsx
src/components/ui/ThinScrollbar.tsx
src/index.css
src/lib/utils.ts
src/main.tsx
src/pages/ChatPage.tsx
src/pages/OnboardingPage.tsx
src/pages/PluginsPage.tsx
src/pages/ProjectPage.tsx
src/pages/SchedulePage.tsx
src/pages/WikiPage.tsx
src/pages/index.tsx
src/services/ChatSessionManager.ts
src/types/chat.ts
tailwind.config.js
tests/chat-performance.test.tsx
tests/setup.ts
types/tauri-globals.d.ts
vite.config.ts
vitest.config.ts
Found 11 entry points
src/main.tsx (default index)
eslint.config.js (eslint)
index.html (vite)
postcss.config.cjs (postcss)
src/main.tsx (vite)
tailwind.config.js (tailwind)
tests/chat-performance.test.tsx (vitest)
tests/setup.ts (vitest)
tsconfig.node.json (typescript)
vite.config.ts (vite)
vitest.config.ts (vitest)
```

## Workspaces
```text
No workspaces declared (single-package project).
```

## Explain (Example: unused-dependencies)
```text
Unused Dependencies
fallow/unused-dependency

Dependency listed but never imported

Why it matters
Packages listed in dependencies that are never imported or required by any source file. Framework plugins and CLI tools may be false positives; use the ignore_dependencies config to suppress.

Example
package.json lists left-pad, but no source, script, config, or plugin-recognized file imports it.

How to fix
Remove the dependency after checking runtime/plugin usage. If another workspace uses it, move the dependency to that workspace.

Docs: https://docs.fallow.tools/explanations/dead-code#unused-dependencies
```

## Impact Tracking
```text
FALLOW IMPACT

Impact tracking is off. Enable it with `fallow impact enable`, then
let your pre-commit gate run a few times to build history.
```

## Configuration
```text
no config file found, using defaults
```

## Config Schema
```text
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FallowConfig",
  "type": "object",
  "properties": {
    "$schema": {
      "type": [
        "string",
        "null"
      ],
      "writeOnly": true
    },
    "extends": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "writeOnly": true
    },
    "entry": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "ignorePatterns": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "framework": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/ExternalPluginDef"
      },
      "default": []
    },
    "workspaces": {
      "anyOf": [
        {
          "$ref": "#/$defs/WorkspaceConfig"
        },
        {
          "type": "null"
        }
      ],
      "default": null
    },
    "ignoreDependencies": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "ignoreUnresolvedImports": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "ignoreExports": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/IgnoreExportRule"
      },
      "default": []
    },
    "ignoreCatalogReferences": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/IgnoreCatalogReferenceRule"
      }
    },
    "ignoreDependencyOverrides": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/IgnoreDependencyOverrideRule"
      }
    },
    "ignoreExportsUsedInFile": {
      "$ref": "#/$defs/IgnoreExportsUsedInFileConfig",
      "default": false
    },
    "ignoreDecorators": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "usedClassMembers": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/UsedClassMemberRule"
      },
      "default": []
    },
    "duplicates": {
      "$ref": "#/$defs/DuplicatesConfig",
      "default": {
        "enabled": true,
        "mode": "mild",
        "minTokens": 50,
        "minLines": 5,
        "minOccurrences": 2,
        "threshold": 0.0,
        "ignore": [],
        "ignoreDefaults": true,
        "skipLocal": false,
        "crossLanguage": false,
        "ignoreImports": false,
        "normalization": {},
        "minCorpusSizeForShingleFilter": 1024,
        "minCorpusSizeForTokenCache": 5000
      }
    },
    "health": {
      "$ref": "#/$defs/HealthConfig",
      "default": {
        "maxCyclomatic": 20,
        "maxCognitive": 15,
        "maxCrap": 30.0,
        "crapRefactorBand": 5,
        "coverage": null,
        "coverageRoot": null,
        "ignore": [],
        "ownership": {
          "botPatterns": [
            "*\\[bot\\]*",
            "dependabot*",
            "renovate*",
            "github-actions*",
            "svc-*",
            "*-service-account*"
          ],
          "emailMode": "handle"
        },
        "suggestInlineSuppression": true
      }
    },
    "rules": {
      "$ref": "#/$defs/RulesConfig",
      "default": {
        "unused-files": "error",
        "unused-exports": "error",
        "unused-types": "error",
        "private-type-leaks": "off",
        "unused-dependencies": "error",
        "unused-dev-dependencies": "warn",
        "unused-optional-dependencies": "warn",
        "unused-enum-members": "error",
        "unused-class-members": "error",
        "unresolved-imports": "error",
        "unlisted-dependencies": "error",
        "duplicate-exports": "error",
        "type-only-dependencies": "warn",
        "test-only-dependencies": "warn",
        "circular-dependencies": "error",
        "re-export-cycle": "warn",
        "boundary-violation": "error",
        "coverage-gaps": "off",
        "feature-flags": "off",
        "stale-suppressions": "warn",
        "unused-catalog-entries": "warn",
        "empty-catalog-groups": "warn",
        "unresolved-catalog-references": "error",
        "unused-dependency-overrides": "warn",
        "misconfigured-dependency-overrides": "error",
        "security-client-server-leak": "off",
        "security-sink": "off",
        "policy-violation": "warn"
      }
    },
    "boundaries": {
      "$ref": "#/$defs/BoundaryConfig",
      "default": {
        "zones": [],
        "rules": []
      }
    },
    "flags": {
      "$ref": "#/$defs/FlagsConfig",
      "default": {
        "configObjectHeuristics": false
      }
    },
    "security": {
      "$ref": "#/$defs/SecurityConfig",
      "default": {}
    },
    "fix": {
      "$ref": "#/$defs/FixConfig",
      "default": {
        "catalog": {
          "deletePrecedingComments": "auto"
        }
      }
    },
    "resolve": {
      "$ref": "#/$defs/ResolveConfig",
      "default": {}
    },
    "production": {
      "$ref": "#/$defs/ProductionConfig",
      "default": false
    },
    "plugins": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "rulePacks": {
      "description": "Paths to declarative rule-pack files (JSON or JSONC), relative to the\nproject root. Each pack declares `banned-call` / `banned-import` rules\nthat report as `policy-violation` findings. Packs are pure data: no\nproject code is executed. Invalid or missing packs fail config load.",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "dynamicallyLoaded": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "overrides": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/ConfigOverride"
      },
      "default": []
    },
    "codeowners": {
      "type": [
        "string",
        "null"
      ]
    },
    "publicPackages": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "regression": {
      "anyOf": [
        {
          "$ref": "#/$defs/RegressionConfig"
        },
        {
          "type": "null"
        }
      ]
    },
    "audit": {
      "$ref": "#/$defs/AuditConfig"
    },
    "sealed": {
      "type": "boolean",
      "default": false
    },
    "includeEntryExports": {
      "type": "boolean",
      "default": false
    },
    "autoImports": {
      "type": "boolean",
      "default": false
    },
    "cache": {
      "$ref": "#/$defs/CacheConfig"
    }
  },
  "additionalProperties": false,
  "$defs": {
    "ExternalPluginDef": {
      "description": "A declarative plugin definition loaded from a standalone file or inline config.\n\nExternal plugins provide the same static pattern capabilities as built-in\nplugins (entry points, always-used files, used exports, tooling dependencies),\nbut are defined in standalone files or inline in the fallow config rather than\ncompiled Rust code.\n\nThey cannot do AST-based config parsing (`resolve_config()`), but cover the\nvast majority of framework integration use cases.\n\nSupports JSONC, JSON, and TOML formats. All use camelCase field names.\n\n```json\n{\n  \"$schema\": \"https://raw.githubusercontent.com/fallow-rs/fallow/main/plugin-schema.json\",\n  \"name\": \"my-framework\",\n  \"enablers\": [\"my-framework\", \"@my-framework/core\"],\n  \"entryPoints\": [\"src/routes/**/*.{ts,tsx}\"],\n  \"configPatterns\": [\"my-framework.config.{ts,js}\"],\n  \"alwaysUsed\": [\"src/setup.ts\"],\n  \"toolingDependencies\": [\"my-framework-cli\"],\n  \"usedExports\": [\n    { \"pattern\": \"src/routes/**/*.{ts,tsx}\", \"exports\": [\"default\", \"loader\", \"action\"] }\n  ]\n}\n```",
      "type": "object",
      "properties": {
        "name": {
          "description": "Unique name for this plugin.",
          "type": "string"
        },
        "detection": {
          "description": "Rich detection logic (dependency checks, file existence, boolean combinators).\nTakes priority over `enablers` when set.",
          "anyOf": [
            {
              "$ref": "#/$defs/PluginDetection"
            },
            {
              "type": "null"
            }
          ],
          "default": null
        },
        "enablers": {
          "description": "Package names that activate this plugin when found in package.json.\nSupports exact matches and prefix patterns (ending with `/`).\nOnly used when `detection` is not set.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "entryPoints": {
          "description": "Glob patterns for entry point files.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "entryPointRole": {
          "description": "Coverage role for `entryPoints`.\n\nDefaults to `support`. Set to `runtime` for application entry points\nor `test` for test framework entry points.",
          "$ref": "#/$defs/EntryPointRole",
          "default": "support"
        },
        "configPatterns": {
          "description": "Glob patterns for config files (marked as always-used when active).",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "alwaysUsed": {
          "description": "Files that are always considered \"used\" when this plugin is active.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "toolingDependencies": {
          "description": "Dependencies that are tooling (used via CLI/config, not source imports).\nThese should not be flagged as unused devDependencies.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "usedExports": {
          "description": "Exports that are always considered used for matching file patterns.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/ExternalUsedExport"
          },
          "default": []
        },
        "usedClassMembers": {
          "description": "Class member method/property rules the framework invokes at runtime.\nSupports plain member names for global suppression and scoped objects\nwith `extends` / `implements` constraints when the method name is too\ncommon to suppress across the whole workspace.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/UsedClassMemberRule"
          },
          "default": []
        }
      },
      "required": [
        "name"
      ]
    },
    "PluginDetection": {
      "description": "How to detect if a plugin should be activated.\n\nWhen set on an `ExternalPluginDef`, this takes priority over `enablers`.\nSupports dependency checks, file existence checks, and boolean combinators.",
      "oneOf": [
        {
          "description": "Plugin detected if this package is in dependencies.",
          "type": "object",
          "properties": {
            "package": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "dependency"
            }
          },
          "required": [
            "type",
            "package"
          ]
        },
        {
          "description": "Plugin detected if this file pattern matches.",
          "type": "object",
          "properties": {
            "pattern": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "fileExists"
            }
          },
          "required": [
            "type",
            "pattern"
          ]
        },
        {
          "description": "All conditions must be true.",
          "type": "object",
          "properties": {
            "conditions": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/PluginDetection"
              }
            },
            "type": {
              "type": "string",
              "const": "all"
            }
          },
          "required": [
            "type",
            "conditions"
          ]
        },
        {
          "description": "Any condition must be true.",
          "type": "object",
          "properties": {
            "conditions": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/PluginDetection"
              }
            },
            "type": {
              "type": "string",
              "const": "any"
            }
          },
          "required": [
            "type",
            "conditions"
          ]
        }
      ]
    },
    "EntryPointRole": {
      "description": "How a plugin's discovered entry points contribute to coverage reachability.",
      "oneOf": [
        {
          "description": "Runtime/application roots that should count toward runtime reachability.",
          "type": "string",
          "const": "runtime"
        },
        {
          "description": "Test roots that should count toward test reachability.",
          "type": "string",
          "const": "test"
        },
        {
          "description": "Support/setup/config roots that should keep files alive but not count as runtime/test.",
          "type": "string",
          "const": "support"
        }
      ]
    },
    "ExternalUsedExport": {
      "description": "Exports considered used for files matching a pattern.",
      "type": "object",
      "properties": {
        "pattern": {
          "description": "Glob pattern for files.",
          "type": "string"
        },
        "exports": {
          "description": "Export names always considered used.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "pattern",
        "exports"
      ]
    },
    "UsedClassMemberRule": {
      "description": "A `usedClassMembers` entry from config or an external plugin.\n\nSupports either a plain member name or glob pattern (`\"agInit\"`,\n`\"enter*\"`) or a scoped rule that only applies when a class matches\nspecific `extends` / `implements` heritage clauses.",
      "anyOf": [
        {
          "description": "Globally suppress this class member name or glob pattern for all classes.",
          "type": "string"
        },
        {
          "description": "Suppress these class member names only for matching classes.",
          "$ref": "#/$defs/ScopedUsedClassMemberRule"
        }
      ]
    },
    "ScopedUsedClassMemberRule": {
      "description": "A heritage-constrained `usedClassMembers` rule.",
      "type": "object",
      "properties": {
        "extends": {
          "description": "Only apply when the class extends this parent class name.",
          "type": [
            "string",
            "null"
          ]
        },
        "implements": {
          "description": "Only apply when the class implements this interface name.",
          "type": [
            "string",
            "null"
          ]
        },
        "members": {
          "description": "Member names or glob patterns that should be treated as framework-used.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "members"
      ]
    },
    "WorkspaceConfig": {
      "description": "Workspace configuration for monorepo support.",
      "type": "object",
      "properties": {
        "patterns": {
          "description": "Additional workspace patterns (beyond what's in root package.json).",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        }
      }
    },
    "IgnoreExportRule": {
      "description": "Rule for ignoring specific exports.",
      "type": "object",
      "properties": {
        "file": {
          "description": "Glob pattern for files.",
          "type": "string"
        },
        "exports": {
          "description": "Export names to ignore (`*` for all).",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "file",
        "exports"
      ]
    },
    "IgnoreCatalogReferenceRule": {
      "description": "Rule for suppressing an `unresolved-catalog-reference` finding.",
      "type": "object",
      "properties": {
        "package": {
          "type": "string"
        },
        "catalog": {
          "type": [
            "string",
            "null"
          ]
        },
        "consumer": {
          "type": [
            "string",
            "null"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "package"
      ]
    },
    "IgnoreDependencyOverrideRule": {
      "description": "Rule for suppressing dependency-override findings.",
      "type": "object",
      "properties": {
        "package": {
          "type": "string"
        },
        "source": {
          "type": [
            "string",
            "null"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "package"
      ]
    },
    "IgnoreExportsUsedInFileConfig": {
      "anyOf": [
        {
          "type": "boolean"
        },
        {
          "$ref": "#/$defs/IgnoreExportsUsedInFileByKind"
        }
      ]
    },
    "IgnoreExportsUsedInFileByKind": {
      "type": "object",
      "properties": {
        "type": {
          "type": "boolean",
          "default": false
        },
        "interface": {
          "type": "boolean",
          "default": false
        }
      }
    },
    "DuplicatesConfig": {
      "description": "Configuration for code duplication detection.",
      "type": "object",
      "properties": {
        "enabled": {
          "description": "Whether duplication detection is enabled.",
          "type": "boolean",
          "default": true
        },
        "mode": {
          "description": "Detection mode: strict, mild, weak, or semantic.",
          "$ref": "#/$defs/DetectionMode",
          "default": "mild"
        },
        "minTokens": {
          "description": "Minimum number of tokens for a clone.",
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 50
        },
        "minLines": {
          "description": "Minimum number of lines for a clone.",
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 5
        },
        "minOccurrences": {
          "description": "Minimum number of occurrences (instances of the same clone) before a\ngroup is reported. Defaults to 2 (every duplicated pair is reported).\nRaise this to focus on widespread copy-paste worth refactoring and skip\ncontext-sensitive pairs.",
          "type": "integer",
          "format": "uint",
          "minimum": 2,
          "default": 2
        },
        "threshold": {
          "description": "Maximum allowed duplication percentage (0 = no limit).",
          "type": "number",
          "format": "double",
          "default": 0.0
        },
        "ignore": {
          "description": "Additional ignore patterns for duplication analysis.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "ignoreDefaults": {
          "description": "Merge built-in generated-framework ignore patterns with `ignore`.\n\nSet to `false` to use only the user-provided `ignore` list.",
          "type": "boolean",
          "default": true
        },
        "skipLocal": {
          "description": "Only report cross-directory duplicates.",
          "type": "boolean",
          "default": false
        },
        "crossLanguage": {
          "description": "Enable cross-language clone detection by stripping type annotations.\n\nWhen enabled, TypeScript type annotations (parameter types, return types,\ngenerics, interfaces, type aliases) are stripped from the token stream,\nallowing detection of clones between `.ts` and `.js` files.",
          "type": "boolean",
          "default": false
        },
        "ignoreImports": {
          "description": "Exclude ES `import` declarations from clone detection.\n\nWhen enabled, all `import` statements (value imports, type imports, and\nside-effect imports) are stripped from the token stream before clone\ndetection. This reduces noise from sorted import blocks that naturally\nlook similar across files. Only affects ES `import` declarations;\nCommonJS `require()` calls are not filtered.",
          "type": "boolean",
          "default": false
        },
        "normalization": {
          "description": "Fine-grained normalization overrides on top of the detection mode.",
          "$ref": "#/$defs/NormalizationConfig",
          "default": {}
        },
        "minCorpusSizeForShingleFilter": {
          "description": "Minimum tokenized file count before focused duplicate analysis prefilters\nunchanged files with k-token shingles.",
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 1024
        },
        "minCorpusSizeForTokenCache": {
          "description": "Minimum source file count before the persistent duplication token cache\nactivates. Below this threshold the cache load/save overhead exceeds the\ntokenize savings, so the cache stays disabled even when not running with\n`--no-cache`.",
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 5000
        }
      }
    },
    "DetectionMode": {
      "description": "Detection mode controlling how aggressively tokens are normalized.\n\nSince fallow uses AST-based tokenization (not lexer-based), whitespace and\ncomments are inherently absent from the token stream. The `Strict` and `Mild`\nmodes are currently equivalent. `Weak` mode additionally blinds string\nliterals. `Semantic` mode blinds all identifiers and literal values for\nType-2 (renamed variable) clone detection.",
      "oneOf": [
        {
          "description": "All tokens preserved including identifier names and literal values (Type-1 only).",
          "type": "string",
          "const": "strict"
        },
        {
          "description": "Default mode -- equivalent to strict for AST-based tokenization.",
          "type": "string",
          "const": "mild"
        },
        {
          "description": "Blind string literal values (structure-preserving).",
          "type": "string",
          "const": "weak"
        },
        {
          "description": "Blind all identifiers and literal values for structural (Type-2) detection.",
          "type": "string",
          "const": "semantic"
        }
      ]
    },
    "NormalizationConfig": {
      "description": "Fine-grained normalization overrides.\n\nEach option, when set to `Some(true)`, forces that normalization regardless of\nthe detection mode. When set to `Some(false)`, it forces preservation. When\n`None`, the detection mode's default behavior applies.",
      "type": "object",
      "properties": {
        "ignoreIdentifiers": {
          "description": "Blind all identifiers (variable names, function names, etc.) to the same hash.\nDefault in `semantic` mode.",
          "type": [
            "boolean",
            "null"
          ]
        },
        "ignoreStringValues": {
          "description": "Blind string literal values to the same hash.\nDefault in `weak` and `semantic` modes.",
          "type": [
            "boolean",
            "null"
          ]
        },
        "ignoreNumericValues": {
          "description": "Blind numeric literal values to the same hash.\nDefault in `semantic` mode.",
          "type": [
            "boolean",
            "null"
          ]
        }
      }
    },
    "HealthConfig": {
      "description": "Configuration for complexity health metrics (`fallow health`).",
      "type": "object",
      "properties": {
        "maxCyclomatic": {
          "description": "Maximum allowed cyclomatic complexity per function (default: 20).\nFunctions exceeding this threshold are reported.",
          "type": "integer",
          "format": "uint16",
          "minimum": 0,
          "maximum": 65535,
          "default": 20
        },
        "maxCognitive": {
          "description": "Maximum allowed cognitive complexity per function (default: 15).\nFunctions exceeding this threshold are reported.",
          "type": "integer",
          "format": "uint16",
          "minimum": 0,
          "maximum": 65535,
          "default": 15
        },
        "maxCrap": {
          "description": "Maximum allowed CRAP (Change Risk Anti-Patterns) score per function\n(default: 30.0). CRAP combines cyclomatic complexity with test\ncoverage: high complexity plus low coverage produces a high CRAP\nscore. Functions meeting or exceeding this threshold are reported.\nUse `--coverage` with Istanbul data for accurate per-function CRAP;\notherwise fallow estimates coverage from the module graph.",
          "type": "number",
          "format": "double",
          "default": 30.0
        },
        "crapRefactorBand": {
          "description": "Band below `maxCyclomatic` where CRAP-only findings also receive a\nsecondary `refactor-function` action (default: 5). Set to `0` to only\nsuggest refactoring when cyclomatic already meets the configured\nthreshold.",
          "type": "integer",
          "format": "uint16",
          "minimum": 0,
          "maximum": 65535,
          "default": 5
        },
        "coverage": {
          "description": "Path to Istanbul-format coverage data for accurate per-function CRAP\nscores. Relative paths resolve against the project root. The CLI\n`--coverage` flag and `FALLOW_COVERAGE` environment variable override\nthis value.",
          "type": [
            "string",
            "null"
          ],
          "default": null
        },
        "coverageRoot": {
          "description": "Absolute prefix to strip from Istanbul file paths before CRAP matching.\nUse when coverage was generated under a different checkout root in CI\nor Docker. The CLI `--coverage-root` flag and `FALLOW_COVERAGE_ROOT`\nenvironment variable override this value.",
          "type": [
            "string",
            "null"
          ],
          "default": null
        },
        "ignore": {
          "description": "Glob patterns to exclude from complexity analysis.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "thresholdOverrides": {
          "description": "Per-file or per-function threshold overrides. These keep exceptional\nfunctions visible as configured numeric ceilings instead of hiding them\nbehind binary suppressions.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/HealthThresholdOverride"
          }
        },
        "ownership": {
          "description": "Ownership analysis configuration. Controls bot filtering and email\nprivacy mode for `--ownership` output.",
          "$ref": "#/$defs/OwnershipConfig",
          "default": {
            "botPatterns": [
              "*\\[bot\\]*",
              "dependabot*",
              "renovate*",
              "github-actions*",
              "svc-*",
              "*-service-account*"
            ],
            "emailMode": "handle"
          }
        },
        "suggestInlineSuppression": {
          "description": "Whether health JSON output emits `suppress-line` action hints\nalongside complexity findings (default: `true`). Set to `false` to\nopt out across the project: useful for teams that manage suppressions\nexclusively through `// fallow-ignore-*` comments authored by hand or\nthrough the `fallow.suppress` LSP code action, but who do not want\nCI-driven `suppress-line` action hints in their JSON output.\n`--baseline` activates auto-omission regardless of this setting,\nsince baseline files are a separate suppression mechanism.",
          "type": "boolean",
          "default": true
        }
      },
      "additionalProperties": false
    },
    "HealthThresholdOverride": {
      "description": "Per-file or per-function health threshold override.",
      "type": "object",
      "properties": {
        "files": {
          "description": "Project-root-relative file globs this override applies to.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "functions": {
          "description": "Exact emitted function names this override applies to. Empty means every\nfunction in matching files.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "maxCyclomatic": {
          "description": "Local cyclomatic complexity ceiling.",
          "type": [
            "integer",
            "null"
          ],
          "format": "uint16",
          "minimum": 0,
          "maximum": 65535
        },
        "maxCognitive": {
          "description": "Local cognitive complexity ceiling.",
          "type": [
            "integer",
            "null"
          ],
          "format": "uint16",
          "minimum": 0,
          "maximum": 65535
        },
        "maxCrap": {
          "description": "Local CRAP ceiling.",
          "type": [
            "number",
            "null"
          ],
          "format": "double"
        },
        "reason": {
          "description": "Human-readable rationale for the exception.",
          "type": [
            "string",
            "null"
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "files"
      ]
    },
    "OwnershipConfig": {
      "description": "Configuration for ownership analysis (`fallow health --hotspots --ownership`).",
      "type": "object",
      "properties": {
        "botPatterns": {
          "description": "Glob patterns (matched against the author email local-part) that\nidentify bot or service-account commits to exclude from ownership\nsignals. Overrides the defaults entirely when set.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": [
            "*\\[bot\\]*",
            "dependabot*",
            "renovate*",
            "github-actions*",
            "svc-*",
            "*-service-account*"
          ]
        },
        "emailMode": {
          "description": "Privacy mode for emitted author emails. Defaults to `handle`.\nOverride on the CLI via `--ownership-emails=raw|handle|anonymized`.\nThe legacy spelling `hash` is still accepted for compatibility.",
          "$ref": "#/$defs/EmailMode",
          "default": "handle"
        }
      }
    },
    "EmailMode": {
      "description": "Privacy mode for author emails emitted in ownership output.\n\nDefaults to `handle` (local-part only, no domain) so SARIF and JSON\nartifacts do not leak raw email addresses into CI pipelines.",
      "oneOf": [
        {
          "description": "Show the raw email address as it appears in git history.\nUse for public repositories where history is already exposed.",
          "type": "string",
          "const": "raw"
        },
        {
          "description": "Show the local-part only (before the `@`). Mailmap-resolved where possible.\nDefault. Balances readability and privacy.",
          "type": "string",
          "const": "handle"
        },
        {
          "description": "Show a stable `xxh3:<16hex>` pseudonym derived from the raw email.\nNon-cryptographic; suitable to keep raw emails out of CI artifacts\n(SARIF, code-scanning uploads) but not as a security primitive:\na known list of org emails can be brute-forced into a rainbow table.\nUse in regulated environments where even local-parts are sensitive.",
          "type": "string",
          "const": "anonymized"
        },
        {
          "description": "Legacy spelling for [`EmailMode::Anonymized`].",
          "type": "string",
          "const": "hash"
        }
      ]
    },
    "RulesConfig": {
      "description": "Per-issue-type severity configuration.\n\nControls which issue types cause CI failure, are reported as warnings,\nor are suppressed entirely. Most fields default to `Severity::Error`.\n\nRule names use kebab-case in config files (e.g., `\"unused-files\": \"error\"`).",
      "type": "object",
      "properties": {
        "unused-files": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unused-exports": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unused-types": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "private-type-leaks": {
          "$ref": "#/$defs/Severity",
          "default": "off"
        },
        "unused-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unused-dev-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "unused-optional-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "unused-enum-members": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unused-class-members": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unresolved-imports": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unlisted-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "duplicate-exports": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "type-only-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "test-only-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "circular-dependencies": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "re-export-cycle": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "boundary-violation": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "coverage-gaps": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "feature-flags": {
          "$ref": "#/$defs/Severity",
          "default": "off"
        },
        "stale-suppressions": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "unused-catalog-entries": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "empty-catalog-groups": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "unresolved-catalog-references": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "unused-dependency-overrides": {
          "$ref": "#/$defs/Severity",
          "default": "warn"
        },
        "misconfigured-dependency-overrides": {
          "$ref": "#/$defs/Severity",
          "default": "error"
        },
        "security-client-server-leak": {
          "description": "Opt-in (default off): a `\"use client\"` file that transitively imports a\nmodule reading a non-public `process.env` secret. Surfaced only by\n`fallow security`; never under bare `fallow` or the `audit` gate.",
          "$ref": "#/$defs/Severity",
          "default": "off"
        },
        "security-sink": {
          "description": "Opt-in (default off): a syntactic tainted-sink candidate matched against\nthe data-driven catalogue (`security_matchers.toml`). ONE knob gates ALL\ncatalogue categories. Surfaced only by `fallow security`; never under\nbare `fallow` or the `audit` gate.",
          "$ref": "#/$defs/Severity",
          "default": "off"
        },
        "policy-violation": {
          "description": "Master severity for rule-pack findings (`rulePacks` config). Defaults\nto `warn` so enabling a brand-new policy pack never hard-fails CI on\nits first run; individual pack rules opt up via `\"severity\": \"error\"`.\n`off` is a kill switch that disables the whole evaluator (per-rule\nseverity cannot resurrect it).",
          "$ref": "#/$defs/Severity",
          "default": "warn"
        }
      }
    },
    "Severity": {
      "description": "Severity level for rules.\n\nControls whether an issue type causes CI failure (`error`), is reported\nwithout failing (`warn`), or is suppressed entirely (`off`).",
      "oneOf": [
        {
          "description": "Report and fail CI (non-zero exit code).",
          "type": "string",
          "const": "error"
        },
        {
          "description": "Report but don't fail CI.",
          "type": "string",
          "const": "warn"
        },
        {
          "description": "Don't detect or report.",
          "type": "string",
          "const": "off"
        }
      ]
    },
    "BoundaryConfig": {
      "description": "Architecture boundary configuration.",
      "type": "object",
      "properties": {
        "preset": {
          "description": "Optional built-in preset.",
          "anyOf": [
            {
              "$ref": "#/$defs/BoundaryPreset"
            },
            {
              "type": "null"
            }
          ]
        },
        "zones": {
          "description": "Zone definitions.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/BoundaryZone"
          },
          "default": []
        },
        "rules": {
          "description": "Zone import rules.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/BoundaryRule"
          },
          "default": []
        },
        "coverage": {
          "description": "Optional policy for files that match no zone.",
          "$ref": "#/$defs/BoundaryCoverageConfig"
        },
        "calls": {
          "description": "Optional forbidden-call policy for zoned files.",
          "$ref": "#/$defs/BoundaryCallsConfig"
        }
      }
    },
    "BoundaryPreset": {
      "description": "Built-in architecture presets.",
      "oneOf": [
        {
          "description": "Layered architecture.",
          "type": "string",
          "const": "layered"
        },
        {
          "description": "Hexagonal / ports-and-adapters.",
          "type": "string",
          "const": "hexagonal"
        },
        {
          "description": "Feature-Sliced Design.",
          "type": "string",
          "const": "feature-sliced"
        },
        {
          "description": "Bulletproof React.",
          "type": "string",
          "const": "bulletproof"
        }
      ]
    },
    "BoundaryZone": {
      "description": "A zone grouping files by directory pattern.",
      "type": "object",
      "properties": {
        "name": {
          "description": "Zone name.",
          "type": "string"
        },
        "patterns": {
          "description": "Membership patterns.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "autoDiscover": {
          "description": "Directories whose children become zones.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "root": {
          "description": "Optional subtree scope.",
          "type": [
            "string",
            "null"
          ]
        }
      },
      "required": [
        "name"
      ]
    },
    "BoundaryRule": {
      "description": "An import rule between zones.",
      "type": "object",
      "properties": {
        "from": {
          "description": "Source zone.",
          "type": "string"
        },
        "allow": {
          "description": "Allowed target zones.",
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "allowTypeOnly": {
          "description": "Allowed type-only targets.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "from"
      ]
    },
    "BoundaryCoverageConfig": {
      "description": "Boundary zone coverage policy.",
      "type": "object",
      "properties": {
        "requireAllFiles": {
          "description": "Report source files that do not match any boundary zone.",
          "type": "boolean"
        },
        "allowUnmatched": {
          "description": "Glob patterns for files that may remain unmatched by any zone.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "BoundaryCallsConfig": {
      "description": "Boundary forbidden-call policy. Applies only to files classified into a\nzone; unzoned files are unrestricted, matching the import rules.",
      "type": "object",
      "properties": {
        "forbidden": {
          "description": "Callee patterns that files in a zone may not call.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/ForbiddenCallRule"
          }
        }
      }
    },
    "ForbiddenCallRule": {
      "description": "One forbidden-call entry: files in zone `from` may not call callees\nmatching `callee`.",
      "type": "object",
      "properties": {
        "from": {
          "description": "Zone whose files may not make matching calls.",
          "type": "string"
        },
        "callee": {
          "description": "Forbidden callee pattern(s). Matching is segment-aware, not substring:\n`child_process.*` matches `child_process.exec` (and named imports from\n`child_process` / `node:child_process`), `fetch` matches only `fetch`,\nand a leading `*.` suffix-matches any object (`*.innerHTML`).",
          "$ref": "#/$defs/ForbiddenCallee"
        }
      },
      "required": [
        "from",
        "callee"
      ]
    },
    "ForbiddenCallee": {
      "description": "One callee pattern or a list of patterns for a single `from` zone.",
      "anyOf": [
        {
          "description": "A single callee pattern.",
          "type": "string"
        },
        {
          "description": "Multiple callee patterns sharing the same `from` zone.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      ]
    },
    "FlagsConfig": {
      "description": "Feature flag detection configuration.\n\nControls which patterns fallow uses to detect feature flags in source code.\nConfigured via the `flags` section in `.fallowrc.json`, `.fallowrc.jsonc`, `fallow.toml`, or `.fallow.toml`.\n\n# Examples\n\n```json\n{\n  \"flags\": {\n    \"sdkPatterns\": [\n      { \"function\": \"useFlag\", \"nameArg\": 0, \"provider\": \"LaunchDarkly\" }\n    ],\n    \"envPrefixes\": [\"FEATURE_\", \"NEXT_PUBLIC_ENABLE_\"],\n    \"configObjectHeuristics\": false\n  }\n}\n```",
      "type": "object",
      "properties": {
        "sdkPatterns": {
          "description": "Additional SDK call patterns to detect as feature flags.\nThese are merged with the built-in patterns for common providers\nincluding LaunchDarkly, Statsig, Unleash, GrowthBook, Split, PostHog,\nVercel Flags, ConfigCat, Flagsmith, Optimizely, and Eppo.",
          "type": "array",
          "items": {
            "$ref": "#/$defs/SdkPattern"
          }
        },
        "envPrefixes": {
          "description": "Environment variable prefixes that indicate feature flags.\nMerged with built-in prefixes. Only `process.env.*` accesses matching\nthese prefixes are reported as feature flags.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "configObjectHeuristics": {
          "description": "Enable config object heuristic detection.\nWhen true, property accesses on objects whose name contains \"feature\",\n\"flag\", or \"toggle\" are reported as low-confidence feature flags.\nDefault: false (opt-in due to higher false positive rate).",
          "type": "boolean",
          "default": false
        }
      }
    },
    "SdkPattern": {
      "description": "A custom SDK call pattern for feature flag detection.\n\nDescribes a function call that evaluates a feature flag, e.g.,\n`useFlag('new-checkout')` or `client.getFeatureValue('parser', false)`.",
      "type": "object",
      "properties": {
        "function": {
          "description": "Function name to match (e.g., `\"useFlag\"`, `\"variation\"`).",
          "type": "string"
        },
        "nameArg": {
          "description": "Zero-based index of the argument containing the flag name.",
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "provider": {
          "description": "Optional SDK/provider label shown in output (e.g., `\"LaunchDarkly\"`).",
          "type": [
            "string",
            "null"
          ]
        }
      },
      "required": [
        "function"
      ]
    },
    "SecurityConfig": {
      "description": "Scopes `fallow security` catalogue behavior. An absent category block admits\nevery catalogue category. `hardcoded-secret` is include-required and only\nruns when explicitly listed in `security.categories.include`.",
      "type": "object",
      "properties": {
        "categories": {
          "description": "Include/exclude filter over category ids (e.g. `dangerous-html`).",
          "anyOf": [
            {
              "$ref": "#/$defs/SecurityCategories"
            },
            {
              "type": "null"
            }
          ]
        },
        "requestReceivers": {
          "description": "Additional project-local names for HTTP request objects. These names\nextend the built-in receiver allowlist for `*.query`, `*.params`, and\n`*.body` source patterns. They do not replace the built-ins and do not\ngate `*.searchParams`, which intentionally stays ungated.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "additionalProperties": false
    },
    "SecurityCategories": {
      "description": "Include/exclude lists scoping the active security categories. When `include`\nis set, only those categories are active; `exclude` removes categories from\nthe admitted set. Both unset admits catalogue categories. `hardcoded-secret`\nstill requires explicit inclusion.",
      "type": "object",
      "properties": {
        "include": {
          "description": "Catalogue category ids to admit. When set, all others are excluded.",
          "type": [
            "array",
            "null"
          ],
          "items": {
            "type": "string"
          }
        },
        "exclude": {
          "description": "Catalogue category ids to remove from the admitted set.",
          "type": [
            "array",
            "null"
          ],
          "items": {
            "type": "string"
          }
        }
      },
      "additionalProperties": false
    },
    "FixConfig": {
      "type": "object",
      "properties": {
        "catalog": {
          "$ref": "#/$defs/CatalogFixConfig",
          "default": {
            "deletePrecedingComments": "auto"
          }
        }
      }
    },
    "CatalogFixConfig": {
      "type": "object",
      "properties": {
        "deletePrecedingComments": {
          "$ref": "#/$defs/CatalogPrecedingCommentPolicy",
          "default": "auto"
        }
      }
    },
    "CatalogPrecedingCommentPolicy": {
      "type": "string",
      "enum": [
        "auto",
        "always",
        "never"
      ]
    },
    "ResolveConfig": {
      "description": "Module resolver configuration.\n\nControls how fallow resolves import specifiers against package.json\n`exports` / `imports` fields and tsconfig paths. Configured via the\n`resolve` section in `.fallowrc.json`, `.fallowrc.jsonc`, `fallow.toml`, or `.fallow.toml`.\n\n# Examples\n\n```json\n{\n  \"resolve\": {\n    \"conditions\": [\"development\", \"worker\"]\n  }\n}\n```",
      "type": "object",
      "properties": {
        "conditions": {
          "description": "Additional export/import condition names to honor during module\nresolution. Merged with fallow's built-in conditions (`development`,\n`import`, `require`, `default`, `types`, `node`; plus `react-native`\nand `browser` when the React Native or Expo plugin is active).\n\nUser conditions are matched with higher priority than the baseline,\nso a package.json `exports` entry like:\n\n```json\n{ \"./api\": { \"worker\": \"./src/api.worker.ts\", \"import\": \"./dist/api.js\" } }\n```\n\nresolves to the `worker` branch when `\"worker\"` is listed here.\n\nSee <https://nodejs.org/api/packages.html#community-conditions-definitions>\nfor the set of community-defined conditions.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "ProductionConfig": {
      "anyOf": [
        {
          "type": "boolean"
        },
        {
          "$ref": "#/$defs/PerAnalysisProductionConfig"
        }
      ]
    },
    "PerAnalysisProductionConfig": {
      "type": "object",
      "properties": {
        "deadCode": {
          "type": "boolean",
          "default": false
        },
        "health": {
          "type": "boolean",
          "default": false
        },
        "dupes": {
          "type": "boolean",
          "default": false
        }
      },
      "additionalProperties": false
    },
    "ConfigOverride": {
      "description": "Per-file override entry.",
      "type": "object",
      "properties": {
        "files": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "rules": {
          "$ref": "#/$defs/PartialRulesConfig",
          "default": {}
        }
      },
      "required": [
        "files"
      ]
    },
    "PartialRulesConfig": {
      "description": "Partial per-issue-type severity for overrides. All fields optional.",
      "type": "object",
      "properties": {
        "unused-files": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-exports": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-types": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "private-type-leaks": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-dev-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-optional-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-enum-members": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-class-members": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unresolved-imports": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unlisted-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "duplicate-exports": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "type-only-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "test-only-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "circular-dependencies": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "re-export-cycle": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "boundary-violation": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "coverage-gaps": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "feature-flags": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "stale-suppressions": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-catalog-entries": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "empty-catalog-groups": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unresolved-catalog-references": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "unused-dependency-overrides": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "misconfigured-dependency-overrides": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "security-client-server-leak": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "security-sink": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        },
        "policy-violation": {
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "RegressionConfig": {
      "type": "object",
      "properties": {
        "baseline": {
          "anyOf": [
            {
              "$ref": "#/$defs/RegressionBaseline"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "RegressionBaseline": {
      "type": "object",
      "properties": {
        "totalIssues": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedFiles": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedExports": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedTypes": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedDevDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedOptionalDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedEnumMembers": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unusedClassMembers": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unresolvedImports": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "unlistedDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "duplicateExports": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "circularDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "reExportCycles": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "typeOnlyDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "testOnlyDependencies": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "boundaryViolations": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "boundaryCoverageViolations": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "boundaryCallViolations": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        },
        "policyViolations": {
          "type": "integer",
          "format": "uint",
          "minimum": 0,
          "default": 0
        }
      }
    },
    "AuditConfig": {
      "type": "object",
      "properties": {
        "gate": {
          "$ref": "#/$defs/AuditGate"
        },
        "deadCodeBaseline": {
          "type": [
            "string",
            "null"
          ]
        },
        "healthBaseline": {
          "type": [
            "string",
            "null"
          ]
        },
        "dupesBaseline": {
          "type": [
            "string",
            "null"
          ]
        },
        "cacheMaxAgeDays": {
          "type": [
            "integer",
            "null"
          ],
          "format": "uint32",
          "minimum": 0
        }
      }
    },
    "AuditGate": {
      "type": "string",
      "enum": [
        "new-only",
        "all"
      ]
    },
    "CacheConfig": {
      "type": "object",
      "properties": {
        "dir": {
          "description": "Directory for fallow's persistent analysis cache. Relative paths resolve\nfrom the project root.",
          "type": [
            "string",
            "null"
          ]
        },
        "maxSizeMb": {
          "description": "Maximum size of the persistent extraction cache, in megabytes.",
          "type": [
            "integer",
            "null"
          ],
          "format": "uint32",
          "minimum": 0
        }
      },
      "additionalProperties": false
    }
  }
}
```

## Plugin Schema
```text
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ExternalPluginDef",
  "description": "A declarative plugin definition loaded from a standalone file or inline config.\n\nExternal plugins provide the same static pattern capabilities as built-in\nplugins (entry points, always-used files, used exports, tooling dependencies),\nbut are defined in standalone files or inline in the fallow config rather than\ncompiled Rust code.\n\nThey cannot do AST-based config parsing (`resolve_config()`), but cover the\nvast majority of framework integration use cases.\n\nSupports JSONC, JSON, and TOML formats. All use camelCase field names.\n\n```json\n{\n  \"$schema\": \"https://raw.githubusercontent.com/fallow-rs/fallow/main/plugin-schema.json\",\n  \"name\": \"my-framework\",\n  \"enablers\": [\"my-framework\", \"@my-framework/core\"],\n  \"entryPoints\": [\"src/routes/**/*.{ts,tsx}\"],\n  \"configPatterns\": [\"my-framework.config.{ts,js}\"],\n  \"alwaysUsed\": [\"src/setup.ts\"],\n  \"toolingDependencies\": [\"my-framework-cli\"],\n  \"usedExports\": [\n    { \"pattern\": \"src/routes/**/*.{ts,tsx}\", \"exports\": [\"default\", \"loader\", \"action\"] }\n  ]\n}\n```",
  "type": "object",
  "properties": {
    "name": {
      "description": "Unique name for this plugin.",
      "type": "string"
    },
    "detection": {
      "description": "Rich detection logic (dependency checks, file existence, boolean combinators).\nTakes priority over `enablers` when set.",
      "anyOf": [
        {
          "$ref": "#/$defs/PluginDetection"
        },
        {
          "type": "null"
        }
      ],
      "default": null
    },
    "enablers": {
      "description": "Package names that activate this plugin when found in package.json.\nSupports exact matches and prefix patterns (ending with `/`).\nOnly used when `detection` is not set.",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "entryPoints": {
      "description": "Glob patterns for entry point files.",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "entryPointRole": {
      "description": "Coverage role for `entryPoints`.\n\nDefaults to `support`. Set to `runtime` for application entry points\nor `test` for test framework entry points.",
      "$ref": "#/$defs/EntryPointRole",
      "default": "support"
    },
    "configPatterns": {
      "description": "Glob patterns for config files (marked as always-used when active).",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "alwaysUsed": {
      "description": "Files that are always considered \"used\" when this plugin is active.",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "toolingDependencies": {
      "description": "Dependencies that are tooling (used via CLI/config, not source imports).\nThese should not be flagged as unused devDependencies.",
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": []
    },
    "usedExports": {
      "description": "Exports that are always considered used for matching file patterns.",
      "type": "array",
      "items": {
        "$ref": "#/$defs/ExternalUsedExport"
      },
      "default": []
    },
    "usedClassMembers": {
      "description": "Class member method/property rules the framework invokes at runtime.\nSupports plain member names for global suppression and scoped objects\nwith `extends` / `implements` constraints when the method name is too\ncommon to suppress across the whole workspace.",
      "type": "array",
      "items": {
        "$ref": "#/$defs/UsedClassMemberRule"
      },
      "default": []
    }
  },
  "required": [
    "name"
  ],
  "$defs": {
    "PluginDetection": {
      "description": "How to detect if a plugin should be activated.\n\nWhen set on an `ExternalPluginDef`, this takes priority over `enablers`.\nSupports dependency checks, file existence checks, and boolean combinators.",
      "oneOf": [
        {
          "description": "Plugin detected if this package is in dependencies.",
          "type": "object",
          "properties": {
            "package": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "dependency"
            }
          },
          "required": [
            "type",
            "package"
          ]
        },
        {
          "description": "Plugin detected if this file pattern matches.",
          "type": "object",
          "properties": {
            "pattern": {
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "fileExists"
            }
          },
          "required": [
            "type",
            "pattern"
          ]
        },
        {
          "description": "All conditions must be true.",
          "type": "object",
          "properties": {
            "conditions": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/PluginDetection"
              }
            },
            "type": {
              "type": "string",
              "const": "all"
            }
          },
          "required": [
            "type",
            "conditions"
          ]
        },
        {
          "description": "Any condition must be true.",
          "type": "object",
          "properties": {
            "conditions": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/PluginDetection"
              }
            },
            "type": {
              "type": "string",
              "const": "any"
            }
          },
          "required": [
            "type",
            "conditions"
          ]
        }
      ]
    },
    "EntryPointRole": {
      "description": "How a plugin's discovered entry points contribute to coverage reachability.",
      "oneOf": [
        {
          "description": "Runtime/application roots that should count toward runtime reachability.",
          "type": "string",
          "const": "runtime"
        },
        {
          "description": "Test roots that should count toward test reachability.",
          "type": "string",
          "const": "test"
        },
        {
          "description": "Support/setup/config roots that should keep files alive but not count as runtime/test.",
          "type": "string",
          "const": "support"
        }
      ]
    },
    "ExternalUsedExport": {
      "description": "Exports considered used for files matching a pattern.",
      "type": "object",
      "properties": {
        "pattern": {
          "description": "Glob pattern for files.",
          "type": "string"
        },
        "exports": {
          "description": "Export names always considered used.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "pattern",
        "exports"
      ]
    },
    "UsedClassMemberRule": {
      "description": "A `usedClassMembers` entry from config or an external plugin.\n\nSupports either a plain member name or glob pattern (`\"agInit\"`,\n`\"enter*\"`) or a scoped rule that only applies when a class matches\nspecific `extends` / `implements` heritage clauses.",
      "anyOf": [
        {
          "description": "Globally suppress this class member name or glob pattern for all classes.",
          "type": "string"
        },
        {
          "description": "Suppress these class member names only for matching classes.",
          "$ref": "#/$defs/ScopedUsedClassMemberRule"
        }
      ]
    },
    "ScopedUsedClassMemberRule": {
      "description": "A heritage-constrained `usedClassMembers` rule.",
      "type": "object",
      "properties": {
        "extends": {
          "description": "Only apply when the class extends this parent class name.",
          "type": [
            "string",
            "null"
          ]
        },
        "implements": {
          "description": "Only apply when the class implements this interface name.",
          "type": [
            "string",
            "null"
          ]
        },
        "members": {
          "description": "Member names or glob patterns that should be treated as framework-used.",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "additionalProperties": false,
      "required": [
        "members"
      ]
    }
  }
}
```

## Rule Pack Schema
```text
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "RulePackDef",
  "description": "A declarative rule pack loaded from a standalone JSON or JSONC file listed\nin the `rulePacks` config key.\n\nRule packs are pure data: loading a pack never executes project code. They\nencode project-specific policy (banned calls, banned imports) evaluated\nover fallow's static extraction data, reporting as `policy-violation`\nfindings.\n\n```jsonc\n{\n  \"$schema\": \"https://raw.githubusercontent.com/fallow-rs/fallow/main/rule-pack-schema.json\",\n  \"version\": 1,\n  \"name\": \"team-policy\",\n  \"description\": \"House rules for the platform team\",\n  \"rules\": [\n    {\n      \"id\": \"no-child-process\",\n      \"kind\": \"banned-call\",\n      \"callees\": [\"child_process.*\"],\n      \"message\": \"Use the sandboxed runner instead.\",\n      \"severity\": \"error\"\n    },\n    {\n      \"id\": \"no-moment\",\n      \"kind\": \"banned-import\",\n      \"specifiers\": [\"moment\"],\n      \"message\": \"Use date-fns.\"\n    }\n  ]\n}\n```",
  "type": "object",
  "properties": {
    "version": {
      "description": "Pack format version. Must be `1`; the field exists so future rule\nkinds can be added without breaking older fallow builds silently.",
      "type": "integer",
      "format": "uint32",
      "minimum": 0
    },
    "name": {
      "description": "Pack name, unique across all loaded packs. Must use only ASCII\nletters, digits, `.`, `_`, and `-` so `\"<pack>/<id>\"` is unambiguous in\noutput, baselines, and scoped suppression comments.",
      "type": "string"
    },
    "description": {
      "description": "Optional human description of the pack's intent.",
      "type": [
        "string",
        "null"
      ]
    },
    "rules": {
      "description": "The policy rules this pack enforces. Must be non-empty: an empty pack\nwould silently enforce nothing.",
      "type": "array",
      "items": {
        "$ref": "#/$defs/RulePackRule"
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "version",
    "name",
    "rules"
  ],
  "$defs": {
    "RulePackRule": {
      "description": "One declarative policy rule inside a rule pack.\n\n`callees` applies only to `banned-call` rules; `specifiers` and\n`ignoreTypeOnly` apply only to `banned-import` rules. Setting a field on\nthe wrong kind is a load error (fail loud, never silently ignore policy).",
      "type": "object",
      "properties": {
        "id": {
          "description": "Rule id, unique within the pack. Must use only ASCII letters, digits,\n`.`, `_`, and `-` so `\"<pack>/<id>\"` is unambiguous in output,\nbaselines, and scoped suppression comments.",
          "type": "string"
        },
        "kind": {
          "description": "Which check this rule performs.",
          "$ref": "#/$defs/RulePackRuleKind"
        },
        "callees": {
          "description": "Callee patterns to ban (`banned-call` only). Matching is segment-aware\nand import-resolved, identical to `boundaries.calls.forbidden`:\n`child_process.*` covers `import { exec } from \"node:child_process\"`,\nthe bare specifier, and namespace/default imports; `fetch` matches only\nthe global `fetch`; a leading `*.member` matches any object.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "specifiers": {
          "description": "Import specifiers to ban (`banned-import` only). Matched segment-aware\nagainst the RAW specifier: `moment` covers `moment` and\n`moment/locale/nl` but not `moment-timezone`. Aliased or rewritten\nspecifiers (e.g. `npm:moment`) are not matched.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "ignoreTypeOnly": {
          "description": "When `true`, type-only imports (`import type ...` and type-only\nre-exports) are ignored by this `banned-import` rule. Defaults to\n`false`: type-only imports are flagged too.",
          "type": "boolean"
        },
        "files": {
          "description": "Optional include globs (project-root-relative). Empty or absent means\nthe rule applies to every analyzed file.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "exclude": {
          "description": "Optional exclude globs (project-root-relative), applied after `files`.",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "message": {
          "description": "Author-provided message naming the sanctioned alternative. Rendered\nnext to each finding.",
          "type": [
            "string",
            "null"
          ]
        },
        "severity": {
          "description": "Per-rule severity overriding the `rules.\"policy-violation\"` master.\n`off` disables this rule. When the master itself is `off`, the whole\nevaluator is disabled and per-rule severity cannot resurrect it.",
          "anyOf": [
            {
              "$ref": "#/$defs/Severity"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "additionalProperties": false,
      "required": [
        "id",
        "kind"
      ]
    },
    "RulePackRuleKind": {
      "description": "Which check a rule-pack rule performs.",
      "oneOf": [
        {
          "description": "Ban call sites whose callee path matches one of `callees`.",
          "type": "string",
          "const": "banned-call"
        },
        {
          "description": "Ban imports and re-exports whose raw specifier matches one of\n`specifiers`.",
          "type": "string",
          "const": "banned-import"
        }
      ]
    },
    "Severity": {
      "description": "Severity level for rules.\n\nControls whether an issue type causes CI failure (`error`), is reported\nwithout failing (`warn`), or is suppressed entirely (`off`).",
      "oneOf": [
        {
          "description": "Report and fail CI (non-zero exit code).",
          "type": "string",
          "const": "error"
        },
        {
          "description": "Report but don't fail CI.",
          "type": "string",
          "const": "warn"
        },
        {
          "description": "Don't detect or report.",
          "type": "string",
          "const": "off"
        }
      ]
    }
  }
}
```

## CI Template
```text
Print or vendor CI integration templates

Usage: fallow ci-template [OPTIONS] <COMMAND>

Commands:
  gitlab  Print or vendor the GitLab CI template and MR integration helpers
  help    Print this message or the help of the given subcommand(s)

Options:
  -r, --root <ROOT>
          Project root directory
  -c, --config <CONFIG>
          Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)
  -f, --format <FORMAT>
          Output format (alias: --output) [default: human] [aliases: --output] [possible values: human, json, sarif, compact, markdown, codeclimate, pr-comment-github, pr-comment-gitlab, review-github, review-gitlab, badge]
  -q, --quiet
          Suppress progress output
      --no-cache
          Disable incremental caching
      --threads <THREADS>
          Number of parser threads
      --changed-since <CHANGED_SINCE>
          Only report issues in files changed since this git ref (e.g., main, HEAD~5) [aliases: --base]
      --diff-file <PATH>
          Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery
      --diff-stdin
          Read the unified diff from stdin. Equivalent to `--diff-file -`
      --churn-file <PATH>
          Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git
      --max-file-size <MB>
          Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`
      --baseline <BASELINE>
          Compare against a previously saved baseline file
      --save-baseline <SAVE_BASELINE>
          Save the current results as a baseline file
      --production
          Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies
      --no-production
          Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`
  -w, --workspace <WORKSPACE>
          Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated
      --changed-workspaces <REF>
          Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`
      --group-by <GROUP_BY>
          Group output by owner or by directory [possible values: owner, directory, package, section]
      --performance
          Show pipeline performance timing breakdown
      --explain
          Include metric definitions and rule descriptions in output
      --legacy-envelope
          Emit legacy JSON root envelopes without the top-level `kind` discriminator
      --explain-skipped
          Show a per-pattern breakdown for default duplicate ignores
      --summary
          Show only category counts without individual items
      --ci
          CI mode: equivalent to --format sarif --fail-on-issues --quiet
      --fail-on-issues
          Exit with code 1 if issues are found
      --sarif-file <PATH>
          Write SARIF output to a file (in addition to the primary --format output)
  -o, --output-file <PATH>
          Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr
      --fail-on-regression
          Fail if issue count increased beyond tolerance compared to a regression baseline
      --tolerance <TOLERANCE>
          Allowed issue count increase before a regression is flagged [default: 0]
      --regression-baseline <PATH>
          Path to the regression baseline file
      --save-regression-baseline [<PATH>]
          Save the current issue counts as a regression baseline
      --dupes-mode <DUPES_MODE>
          Override duplication detection mode in combined mode [possible values: strict, mild, weak, semantic]
      --dupes-threshold <DUPES_THRESHOLD>
          Override duplication threshold in combined mode
      --dupes-min-tokens <DUPES_MIN_TOKENS>
          Override the minimum token count for clones in combined mode
      --dupes-min-lines <DUPES_MIN_LINES>
          Override the minimum line count for clones in combined mode
      --dupes-min-occurrences <DUPES_MIN_OCCURRENCES>
          Override the minimum clone occurrences in combined mode (must be >= 2)
      --dupes-skip-local
          Only report cross-directory duplicates in combined mode
      --dupes-cross-language
          Enable cross-language duplicate detection in combined mode
      --dupes-ignore-imports
          Exclude import declarations from duplicate detection in combined mode
      --include-entry-exports
          Report unused exports in entry files instead of auto-marking them as used
  -h, --help
          Print help (see more with '--help')
```

## Hooks
```text
Install or remove fallow-managed Git and agent hooks

Usage: fallow hooks [OPTIONS] <COMMAND>

Commands:
  status     Show installed hook state for Git, Claude, and Codex surfaces
  install    Install a fallow-managed hook
  uninstall  Remove a fallow-managed hook
  help       Print this message or the help of the given subcommand(s)

Options:
  -r, --root <ROOT>
          Project root directory
  -c, --config <CONFIG>
          Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)
  -f, --format <FORMAT>
          Output format (alias: --output) [default: human] [aliases: --output] [possible values: human, json, sarif, compact, markdown, codeclimate, pr-comment-github, pr-comment-gitlab, review-github, review-gitlab, badge]
  -q, --quiet
          Suppress progress output
      --no-cache
          Disable incremental caching
      --threads <THREADS>
          Number of parser threads
      --changed-since <CHANGED_SINCE>
          Only report issues in files changed since this git ref (e.g., main, HEAD~5) [aliases: --base]
      --diff-file <PATH>
          Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery
      --diff-stdin
          Read the unified diff from stdin. Equivalent to `--diff-file -`
      --churn-file <PATH>
          Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git
      --max-file-size <MB>
          Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`
      --baseline <BASELINE>
          Compare against a previously saved baseline file
      --save-baseline <SAVE_BASELINE>
          Save the current results as a baseline file
      --production
          Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies
      --no-production
          Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`
  -w, --workspace <WORKSPACE>
          Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated
      --changed-workspaces <REF>
          Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`
      --group-by <GROUP_BY>
          Group output by owner or by directory [possible values: owner, directory, package, section]
      --performance
          Show pipeline performance timing breakdown
      --explain
          Include metric definitions and rule descriptions in output
      --legacy-envelope
          Emit legacy JSON root envelopes without the top-level `kind` discriminator
      --explain-skipped
          Show a per-pattern breakdown for default duplicate ignores
      --summary
          Show only category counts without individual items
      --ci
          CI mode: equivalent to --format sarif --fail-on-issues --quiet
      --fail-on-issues
          Exit with code 1 if issues are found
      --sarif-file <PATH>
          Write SARIF output to a file (in addition to the primary --format output)
  -o, --output-file <PATH>
          Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr
      --fail-on-regression
          Fail if issue count increased beyond tolerance compared to a regression baseline
      --tolerance <TOLERANCE>
          Allowed issue count increase before a regression is flagged [default: 0]
      --regression-baseline <PATH>
          Path to the regression baseline file
      --save-regression-baseline [<PATH>]
          Save the current issue counts as a regression baseline
      --dupes-mode <DUPES_MODE>
          Override duplication detection mode in combined mode [possible values: strict, mild, weak, semantic]
      --dupes-threshold <DUPES_THRESHOLD>
          Override duplication threshold in combined mode
      --dupes-min-tokens <DUPES_MIN_TOKENS>
          Override the minimum token count for clones in combined mode
      --dupes-min-lines <DUPES_MIN_LINES>
          Override the minimum line count for clones in combined mode
      --dupes-min-occurrences <DUPES_MIN_OCCURRENCES>
          Override the minimum clone occurrences in combined mode (must be >= 2)
      --dupes-skip-local
          Only report cross-directory duplicates in combined mode
      --dupes-cross-language
          Enable cross-language duplicate detection in combined mode
      --dupes-ignore-imports
          Exclude import declarations from duplicate detection in combined mode
      --include-entry-exports
          Report unused exports in entry files instead of auto-marking them as used
  -h, --help
          Print help (see more with '--help')
```

## Setup Hooks
```text
fallow setup-hooks (install):
  .claude/settings.json                       unchanged
  .claude/hooks/fallow-gate.sh                unchanged
```

## Coverage Analysis
```text
Runtime coverage workflow

Usage: fallow coverage [OPTIONS] <COMMAND>

Commands:
  setup                   Resumable first-run setup: license + sidecar + recipe + analysis
  analyze                 Analyze runtime coverage from a local artifact or explicit cloud source
  upload-inventory        Upload a static function inventory to fallow cloud (Production Coverage, paid). Unlocks the `untracked` filter on the dashboard by pairing runtime coverage data with the AST view of "every function that exists". See <https://docs.fallow.tools/analysis/runtime-coverage>
  upload-source-maps      Upload JavaScript source maps to fallow cloud for bundled runtime coverage
  upload-static-findings  Upload static dead-code findings to fallow cloud for the source-evidence viewer
  help                    Print this message or the help of the given subcommand(s)

Options:
  -r, --root <ROOT>
          Project root directory
  -c, --config <CONFIG>
          Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)
  -f, --format <FORMAT>
          Output format (alias: --output) [default: human] [aliases: --output] [possible values: human, json, sarif, compact, markdown, codeclimate, pr-comment-github, pr-comment-gitlab, review-github, review-gitlab, badge]
  -q, --quiet
          Suppress progress output
      --no-cache
          Disable incremental caching
      --threads <THREADS>
          Number of parser threads
      --changed-since <CHANGED_SINCE>
          Only report issues in files changed since this git ref (e.g., main, HEAD~5) [aliases: --base]
      --diff-file <PATH>
          Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery
      --diff-stdin
          Read the unified diff from stdin. Equivalent to `--diff-file -`
      --churn-file <PATH>
          Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git
      --max-file-size <MB>
          Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`
      --baseline <BASELINE>
          Compare against a previously saved baseline file
      --save-baseline <SAVE_BASELINE>
          Save the current results as a baseline file
      --production
          Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies
      --no-production
          Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`
  -w, --workspace <WORKSPACE>
          Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated
      --changed-workspaces <REF>
          Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`
      --group-by <GROUP_BY>
          Group output by owner or by directory [possible values: owner, directory, package, section]
      --performance
          Show pipeline performance timing breakdown
      --explain
          Include metric definitions and rule descriptions in output
      --legacy-envelope
          Emit legacy JSON root envelopes without the top-level `kind` discriminator
      --explain-skipped
          Show a per-pattern breakdown for default duplicate ignores
      --summary
          Show only category counts without individual items
      --ci
          CI mode: equivalent to --format sarif --fail-on-issues --quiet
      --fail-on-issues
          Exit with code 1 if issues are found
      --sarif-file <PATH>
          Write SARIF output to a file (in addition to the primary --format output)
  -o, --output-file <PATH>
          Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr
      --fail-on-regression
          Fail if issue count increased beyond tolerance compared to a regression baseline
      --tolerance <TOLERANCE>
          Allowed issue count increase before a regression is flagged [default: 0]
      --regression-baseline <PATH>
          Path to the regression baseline file
      --save-regression-baseline [<PATH>]
          Save the current issue counts as a regression baseline
      --dupes-mode <DUPES_MODE>
          Override duplication detection mode in combined mode [possible values: strict, mild, weak, semantic]
      --dupes-threshold <DUPES_THRESHOLD>
          Override duplication threshold in combined mode
      --dupes-min-tokens <DUPES_MIN_TOKENS>
          Override the minimum token count for clones in combined mode
      --dupes-min-lines <DUPES_MIN_LINES>
          Override the minimum line count for clones in combined mode
      --dupes-min-occurrences <DUPES_MIN_OCCURRENCES>
          Override the minimum clone occurrences in combined mode (must be >= 2)
      --dupes-skip-local
          Only report cross-directory duplicates in combined mode
      --dupes-cross-language
          Enable cross-language duplicate detection in combined mode
      --dupes-ignore-imports
          Exclude import declarations from duplicate detection in combined mode
      --include-entry-exports
          Report unused exports in entry files instead of auto-marking them as used
  -h, --help
          Print help (see more with '--help')
```

## License Management
```text
Manage the license for continuous/cloud runtime monitoring

Usage: fallow license [OPTIONS] <COMMAND>

Commands:
  activate    Activate a license JWT
  status      Show the active license tier, seats, features, and days remaining
  refresh     Fetch a fresh JWT from `api.fallow.cloud` (network-only)
  deactivate  Remove the local license file
  help        Print this message or the help of the given subcommand(s)

Options:
  -r, --root <ROOT>
          Project root directory
  -c, --config <CONFIG>
          Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)
  -f, --format <FORMAT>
          Output format (alias: --output) [default: human] [aliases: --output] [possible values: human, json, sarif, compact, markdown, codeclimate, pr-comment-github, pr-comment-gitlab, review-github, review-gitlab, badge]
  -q, --quiet
          Suppress progress output
      --no-cache
          Disable incremental caching
      --threads <THREADS>
          Number of parser threads
      --changed-since <CHANGED_SINCE>
          Only report issues in files changed since this git ref (e.g., main, HEAD~5) [aliases: --base]
      --diff-file <PATH>
          Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery
      --diff-stdin
          Read the unified diff from stdin. Equivalent to `--diff-file -`
      --churn-file <PATH>
          Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git
      --max-file-size <MB>
          Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`
      --baseline <BASELINE>
          Compare against a previously saved baseline file
      --save-baseline <SAVE_BASELINE>
          Save the current results as a baseline file
      --production
          Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies
      --no-production
          Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`
  -w, --workspace <WORKSPACE>
          Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated
      --changed-workspaces <REF>
          Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`
      --group-by <GROUP_BY>
          Group output by owner or by directory [possible values: owner, directory, package, section]
      --performance
          Show pipeline performance timing breakdown
      --explain
          Include metric definitions and rule descriptions in output
      --legacy-envelope
          Emit legacy JSON root envelopes without the top-level `kind` discriminator
      --explain-skipped
          Show a per-pattern breakdown for default duplicate ignores
      --summary
          Show only category counts without individual items
      --ci
          CI mode: equivalent to --format sarif --fail-on-issues --quiet
      --fail-on-issues
          Exit with code 1 if issues are found
      --sarif-file <PATH>
          Write SARIF output to a file (in addition to the primary --format output)
  -o, --output-file <PATH>
          Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr
      --fail-on-regression
          Fail if issue count increased beyond tolerance compared to a regression baseline
      --tolerance <TOLERANCE>
          Allowed issue count increase before a regression is flagged [default: 0]
      --regression-baseline <PATH>
          Path to the regression baseline file
      --save-regression-baseline [<PATH>]
          Save the current issue counts as a regression baseline
      --dupes-mode <DUPES_MODE>
          Override duplication detection mode in combined mode [possible values: strict, mild, weak, semantic]
      --dupes-threshold <DUPES_THRESHOLD>
          Override duplication threshold in combined mode
      --dupes-min-tokens <DUPES_MIN_TOKENS>
          Override the minimum token count for clones in combined mode
      --dupes-min-lines <DUPES_MIN_LINES>
          Override the minimum line count for clones in combined mode
      --dupes-min-occurrences <DUPES_MIN_OCCURRENCES>
          Override the minimum clone occurrences in combined mode (must be >= 2)
      --dupes-skip-local
          Only report cross-directory duplicates in combined mode
      --dupes-cross-language
          Enable cross-language duplicate detection in combined mode
      --dupes-ignore-imports
          Exclude import declarations from duplicate detection in combined mode
      --include-entry-exports
          Report unused exports in entry files instead of auto-marking them as used
  -h, --help
          Print help (see more with '--help')
```

## Telemetry
```text
Manage opt-in product telemetry

Usage: fallow telemetry [OPTIONS] <COMMAND>

Commands:
  status   Show effective telemetry state, precedence, and controls
  enable   Enable opt-in telemetry in the user-level fallow config
  disable  Disable telemetry in the user-level fallow config
  inspect  Explain inspect mode or print example payloads
  help     Print this message or the help of the given subcommand(s)

Options:
  -r, --root <ROOT>
          Project root directory
  -c, --config <CONFIG>
          Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)
  -f, --format <FORMAT>
          Output format (alias: --output) [default: human] [aliases: --output] [possible values: human, json, sarif, compact, markdown, codeclimate, pr-comment-github, pr-comment-gitlab, review-github, review-gitlab, badge]
  -q, --quiet
          Suppress progress output
      --no-cache
          Disable incremental caching
      --threads <THREADS>
          Number of parser threads
      --changed-since <CHANGED_SINCE>
          Only report issues in files changed since this git ref (e.g., main, HEAD~5) [aliases: --base]
      --diff-file <PATH>
          Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery
      --diff-stdin
          Read the unified diff from stdin. Equivalent to `--diff-file -`
      --churn-file <PATH>
          Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git
      --max-file-size <MB>
          Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`
      --baseline <BASELINE>
          Compare against a previously saved baseline file
      --save-baseline <SAVE_BASELINE>
          Save the current results as a baseline file
      --production
          Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies
      --no-production
          Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`
  -w, --workspace <WORKSPACE>
          Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated
      --changed-workspaces <REF>
          Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`
      --group-by <GROUP_BY>
          Group output by owner or by directory [possible values: owner, directory, package, section]
      --performance
          Show pipeline performance timing breakdown
      --explain
          Include metric definitions and rule descriptions in output
      --legacy-envelope
          Emit legacy JSON root envelopes without the top-level `kind` discriminator
      --explain-skipped
          Show a per-pattern breakdown for default duplicate ignores
      --summary
          Show only category counts without individual items
      --ci
          CI mode: equivalent to --format sarif --fail-on-issues --quiet
      --fail-on-issues
          Exit with code 1 if issues are found
      --sarif-file <PATH>
          Write SARIF output to a file (in addition to the primary --format output)
  -o, --output-file <PATH>
          Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr
      --fail-on-regression
          Fail if issue count increased beyond tolerance compared to a regression baseline
      --tolerance <TOLERANCE>
          Allowed issue count increase before a regression is flagged [default: 0]
      --regression-baseline <PATH>
          Path to the regression baseline file
      --save-regression-baseline [<PATH>]
          Save the current issue counts as a regression baseline
      --dupes-mode <DUPES_MODE>
          Override duplication detection mode in combined mode [possible values: strict, mild, weak, semantic]
      --dupes-threshold <DUPES_THRESHOLD>
          Override duplication threshold in combined mode
      --dupes-min-tokens <DUPES_MIN_TOKENS>
          Override the minimum token count for clones in combined mode
      --dupes-min-lines <DUPES_MIN_LINES>
          Override the minimum line count for clones in combined mode
      --dupes-min-occurrences <DUPES_MIN_OCCURRENCES>
          Override the minimum clone occurrences in combined mode (must be >= 2)
      --dupes-skip-local
          Only report cross-directory duplicates in combined mode
      --dupes-cross-language
          Enable cross-language duplicate detection in combined mode
      --dupes-ignore-imports
          Exclude import declarations from duplicate detection in combined mode
      --include-entry-exports
          Report unused exports in entry files instead of auto-marking them as used
  -h, --help
          Print help (see more with '--help')
```

## Machine Readable Schema
```text
{
  "name": "fallow",
  "version": "2.95.0",
  "manifest_version": "1",
  "description": "Codebase analyzer for TypeScript/JavaScript: unused code, circular dependencies, code duplication, complexity hotspots, and architecture boundary violations",
  "global_flags": [
    {
      "name": "--root",
      "type": "string",
      "required": false,
      "description": "Project root directory",
      "short": "-r"
    },
    {
      "name": "--config",
      "type": "string",
      "required": false,
      "description": "Path to config file (.fallowrc.json, .fallowrc.jsonc, fallow.toml, or .fallow.toml)",
      "short": "-c"
    },
    {
      "name": "--format",
      "type": "string",
      "required": false,
      "description": "Output format (alias: --output)",
      "short": "-f",
      "default": "human",
      "possible_values": [
        "human",
        "json",
        "sarif",
        "compact",
        "markdown",
        "codeclimate",
        "pr-comment-github",
        "pr-comment-gitlab",
        "review-github",
        "review-gitlab",
        "badge"
      ]
    },
    {
      "name": "--quiet",
      "type": "bool",
      "required": false,
      "description": "Suppress progress output",
      "short": "-q",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--no-cache",
      "type": "bool",
      "required": false,
      "description": "Disable incremental caching",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--threads",
      "type": "string",
      "required": false,
      "description": "Number of parser threads"
    },
    {
      "name": "--changed-since",
      "type": "string",
      "required": false,
      "description": "Only report issues in files changed since this git ref (e.g., main, HEAD~5)"
    },
    {
      "name": "--diff-file",
      "type": "string",
      "required": false,
      "description": "Unified diff for line-level scoping. Use `-` to read from stdin. Project-level findings still bypass this filter. When both this and `--changed-since` are set, the diff filter wins for finding scope while `--changed-since` still drives file discovery"
    },
    {
      "name": "--diff-stdin",
      "type": "bool",
      "required": false,
      "description": "Read the unified diff from stdin. Equivalent to `--diff-file -`",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--churn-file",
      "type": "string",
      "required": false,
      "description": "Import change history from a `fallow-churn/v1` JSON file instead of `git log`, powering hotspots, ownership, and bus-factor on projects with no git repository (Yandex Arc, Mercurial, Perforce). A small wrapper translates your VCS log into the contract. Resolved relative to `--root`. Affects `health --hotspots` / `--ownership` / `--targets` only; `audit`, `impact`, and `--changed-since` still require git"
    },
    {
      "name": "--max-file-size",
      "type": "string",
      "required": false,
      "description": "Skip source files larger than this many megabytes (default 5) instead of parsing them, guarding against the out-of-memory blowup a single multi-MB generated/vendored/bundled file causes on large repos. Use `0` for no limit. Declaration files (`.d.ts`) are always analyzed. Skipped files are reported and excluded from every analysis. Also settable via `FALLOW_MAX_FILE_SIZE`"
    },
    {
      "name": "--baseline",
      "type": "string",
      "required": false,
      "description": "Compare against a previously saved baseline file"
    },
    {
      "name": "--parent-run",
      "type": "string",
      "required": false,
      "description": "Correlate this run with a previous telemetry analysis run"
    },
    {
      "name": "--save-baseline",
      "type": "string",
      "required": false,
      "description": "Save the current results as a baseline file"
    },
    {
      "name": "--production",
      "type": "bool",
      "required": false,
      "description": "Production mode: exclude test/story/dev files, only start/build scripts, report type-only dependencies",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--no-production",
      "type": "bool",
      "required": false,
      "description": "Force production mode OFF for every analysis, overriding a project config's `production: true` (and `FALLOW_PRODUCTION`). Conflicts with `--production`",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--production-dead-code",
      "type": "bool",
      "required": false,
      "description": "Run dead-code analysis in production mode when using bare combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--production-health",
      "type": "bool",
      "required": false,
      "description": "Run health analysis in production mode when using bare combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--production-dupes",
      "type": "bool",
      "required": false,
      "description": "Run duplication analysis in production mode when using bare combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--workspace",
      "type": "string",
      "required": false,
      "description": "Scope output to selected workspaces. Accepts exact names, glob patterns, and `!`-prefixed negations. Values can be comma-separated or repeated",
      "short": "-w"
    },
    {
      "name": "--changed-workspaces",
      "type": "string",
      "required": false,
      "description": "Scope output to workspaces touched since the given git ref. Git is required. Mutually exclusive with `--workspace`"
    },
    {
      "name": "--group-by",
      "type": "string",
      "required": false,
      "description": "Group output by owner or by directory",
      "possible_values": [
        "owner",
        "directory",
        "package",
        "section"
      ]
    },
    {
      "name": "--performance",
      "type": "bool",
      "required": false,
      "description": "Show pipeline performance timing breakdown",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--explain",
      "type": "bool",
      "required": false,
      "description": "Include metric definitions and rule descriptions in output",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--legacy-envelope",
      "type": "bool",
      "required": false,
      "description": "Emit legacy JSON root envelopes without the top-level `kind` discriminator",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--explain-skipped",
      "type": "bool",
      "required": false,
      "description": "Show a per-pattern breakdown for default duplicate ignores",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--summary",
      "type": "bool",
      "required": false,
      "description": "Show only category counts without individual items",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--ci",
      "type": "bool",
      "required": false,
      "description": "CI mode: equivalent to --format sarif --fail-on-issues --quiet",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--fail-on-issues",
      "type": "bool",
      "required": false,
      "description": "Exit with code 1 if issues are found",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--sarif-file",
      "type": "string",
      "required": false,
      "description": "Write SARIF output to a file (in addition to the primary --format output)"
    },
    {
      "name": "--output-file",
      "type": "string",
      "required": false,
      "description": "Write the report to a file instead of stdout, for any --format (no ANSI codes). Useful on large projects where the terminal scrollback truncates the top. Progress and the confirmation stay on stderr",
      "short": "-o"
    },
    {
      "name": "--fail-on-regression",
      "type": "bool",
      "required": false,
      "description": "Fail if issue count increased beyond tolerance compared to a regression baseline",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--tolerance",
      "type": "string",
      "required": false,
      "description": "Allowed issue count increase before a regression is flagged",
      "default": "0"
    },
    {
      "name": "--regression-baseline",
      "type": "string",
      "required": false,
      "description": "Path to the regression baseline file"
    },
    {
      "name": "--save-regression-baseline",
      "type": "string",
      "required": false,
      "description": "Save the current issue counts as a regression baseline"
    },
    {
      "name": "--only",
      "type": "string",
      "required": false,
      "description": "Run only specific analyses when no subcommand is given",
      "possible_values": [
        "dead-code",
        "dupes",
        "health"
      ]
    },
    {
      "name": "--skip",
      "type": "string",
      "required": false,
      "description": "Skip specific analyses when no subcommand is given",
      "possible_values": [
        "dead-code",
        "dupes",
        "health"
      ]
    },
    {
      "name": "--dupes-mode",
      "type": "string",
      "required": false,
      "description": "Override duplication detection mode in combined mode",
      "possible_values": [
        "strict",
        "mild",
        "weak",
        "semantic"
      ]
    },
    {
      "name": "--dupes-threshold",
      "type": "string",
      "required": false,
      "description": "Override duplication threshold in combined mode"
    },
    {
      "name": "--dupes-min-tokens",
      "type": "string",
      "required": false,
      "description": "Override the minimum token count for clones in combined mode"
    },
    {
      "name": "--dupes-min-lines",
      "type": "string",
      "required": false,
      "description": "Override the minimum line count for clones in combined mode"
    },
    {
      "name": "--dupes-min-occurrences",
      "type": "string",
      "required": false,
      "description": "Override the minimum clone occurrences in combined mode (must be >= 2)"
    },
    {
      "name": "--dupes-skip-local",
      "type": "bool",
      "required": false,
      "description": "Only report cross-directory duplicates in combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--dupes-cross-language",
      "type": "bool",
      "required": false,
      "description": "Enable cross-language duplicate detection in combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--dupes-ignore-imports",
      "type": "bool",
      "required": false,
      "description": "Exclude import declarations from duplicate detection in combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--score",
      "type": "bool",
      "required": false,
      "description": "Compute health score in combined mode",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--trend",
      "type": "bool",
      "required": false,
      "description": "Compare current health metrics against the most recent saved snapshot",
      "possible_values": [
        "true",
        "false"
      ]
    },
    {
      "name": "--save-snapshot",
      "type": "string",
      "required": false,
      "description": "Save a vital signs snapshot for trend tracking in combined mode. Provide a path or omit for the default `.fallow/snapshots/` location"
    },
    {
      "name": "--coverage",
      "type": "string",
      "required": false,
      "description": "Path to Istanbul coverage data for exact CRAP scores in combined mode. Also settable via `FALLOW_COVERAGE` or `health.coverage`"
    },
    {
      "name": "--coverage-root",
      "type": "string",
      "required": false,
      "description": "Absolute prefix to strip from Istanbul file paths in combined mode. Also settable via `FALLOW_COVERAGE_ROOT` or `health.coverageRoot`"
    },
    {
      "name": "--include-entry-exports",
      "type": "bool",
      "required": false,
      "description": "Report unused exports in entry files instead of auto-marking them as used",
      "possible_values": [
        "true",
        "false"
      ]
    }
  ],
  "commands": [
    {
      "name": "dead-code",
      "description": "Analyze project for unused code and circular dependencies",
      "flags": [
        {
          "name": "--unused-files",
          "type": "bool",
          "required": false,
          "description": "Only report unused files",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-exports",
          "type": "bool",
          "required": false,
          "description": "Only report unused exports",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-deps",
          "type": "bool",
          "required": false,
          "description": "Only report unused dependencies",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-types",
          "type": "bool",
          "required": false,
          "description": "Only report unused type exports",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--private-type-leaks",
          "type": "bool",
          "required": false,
          "description": "Opt in to private type leak API hygiene findings and only report that issue type",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-enum-members",
          "type": "bool",
          "required": false,
          "description": "Only report unused enum members",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-class-members",
          "type": "bool",
          "required": false,
          "description": "Only report unused class members",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unresolved-imports",
          "type": "bool",
          "required": false,
          "description": "Only report unresolved imports",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unlisted-deps",
          "type": "bool",
          "required": false,
          "description": "Only report unlisted dependencies",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--duplicate-exports",
          "type": "bool",
          "required": false,
          "description": "Only report duplicate exports",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--circular-deps",
          "type": "bool",
          "required": false,
          "description": "Only report circular dependencies",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--re-export-cycles",
          "type": "bool",
          "required": false,
          "description": "Only report re-export cycles",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--boundary-violations",
          "type": "bool",
          "required": false,
          "description": "Only report boundary violations",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--policy-violations",
          "type": "bool",
          "required": false,
          "description": "Only report rule-pack policy violations",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--stale-suppressions",
          "type": "bool",
          "required": false,
          "description": "Only report stale suppressions",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-catalog-entries",
          "type": "bool",
          "required": false,
          "description": "Only report unused pnpm catalog entries",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--empty-catalog-groups",
          "type": "bool",
          "required": false,
          "description": "Only report empty pnpm catalog groups",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unresolved-catalog-references",
          "type": "bool",
          "required": false,
          "description": "Only report unresolved pnpm catalog references",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--unused-dependency-overrides",
          "type": "bool",
          "required": false,
          "description": "Only report unused pnpm dependency overrides",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--misconfigured-dependency-overrides",
          "type": "bool",
          "required": false,
          "description": "Only report misconfigured pnpm dependency overrides",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--include-dupes",
          "type": "bool",
          "required": false,
          "description": "Also run duplication analysis and cross-reference with dead code",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--trace",
          "type": "string",
          "required": false,
          "description": "Trace why an export is used/unused (format: `FILE:EXPORT_NAME`)"
        },
        {
          "name": "--trace-file",
          "type": "string",
          "required": false,
          "description": "Trace all edges for a file (imports, exports, importers)"
        },
        {
          "name": "--trace-dependency",
          "type": "string",
          "required": false,
          "description": "Trace where a dependency is used"
        },
        {
          "name": "--top",
          "type": "string",
          "required": false,
          "description": "Show only the top N items per category"
        },
        {
          "name": "--file",
          "type": "string",
          "required": false,
          "description": "Only report issues in the specified file(s). Accepts multiple values. The full project graph is still built, but only issues in matching files are reported. Useful for lint-staged pre-commit hooks"
        }
      ]
    },
    {
      "name": "watch",
      "description": "Watch for changes and re-run analysis",
      "flags": [
        {
          "name": "--no-clear",
          "type": "bool",
          "required": false,
          "description": "Don't clear the screen between re-analyses",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "fix",
      "description": "Auto-fix issues: remove unused exports, dependencies, and enum members; add duplicate-export rules to a fallow config file",
      "flags": [
        {
          "name": "--dry-run",
          "type": "bool",
          "required": false,
          "description": "Dry run, show what would be changed without modifying files",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--yes",
          "type": "bool",
          "required": false,
          "description": "Skip confirmation prompt (required in non-TTY environments like CI or AI agents)",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--no-create-config",
          "type": "bool",
          "required": false,
          "description": "Refuse to create a new fallow config file when none exists. Use this from pre-commit hooks, CI bots, and `fallow watch` where silently materialising a new top-level config file would surprise the user. The duplicate-export config-add path is skipped with an explanatory message; source-file edits proceed normally",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "init",
      "description": "Initialize a .fallowrc.json configuration file, AGENTS.md guide, or git pre-commit hook. Use `.fallowrc.jsonc` for editor-native JSON-with-comments support; both extensions are auto-discovered",
      "flags": [
        {
          "name": "--toml",
          "type": "bool",
          "required": false,
          "description": "Generate TOML instead of JSONC",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--agents",
          "type": "bool",
          "required": false,
          "description": "Scaffold a starter AGENTS.md guidance file for coding agents",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--hooks",
          "type": "bool",
          "required": false,
          "description": "Scaffold a shell-level pre-commit git hook in `.git/hooks/` that runs fallow on changed files. Alias for `fallow hooks install --target git`",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--branch",
          "type": "string",
          "required": false,
          "description": "Fallback base branch/ref for the pre-commit hook when no upstream is set"
        },
        {
          "name": "--decline",
          "type": "bool",
          "required": false,
          "description": "Record that this project deliberately stays unconfigured: persists a decline so the first-contact setup hint and the `setup` next-step stop appearing here. Writes no config file; idempotent",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "hooks",
      "description": "Install or remove fallow-managed Git and agent hooks",
      "flags": []
    },
    {
      "name": "ci",
      "description": "CI helpers for PR/MR feedback envelopes",
      "flags": []
    },
    {
      "name": "config-schema",
      "description": "Print the JSON Schema for fallow configuration files",
      "flags": []
    },
    {
      "name": "plugin-schema",
      "description": "Print the JSON Schema for external plugin files",
      "flags": []
    },
    {
      "name": "rule-pack-schema",
      "description": "Print the JSON Schema for rule pack files",
      "flags": []
    },
    {
      "name": "config",
      "description": "Show the resolved config and which config file was loaded",
      "flags": [
        {
          "name": "--path",
          "type": "bool",
          "required": false,
          "description": "Print only the config file path (one line, no JSON)",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "list",
      "description": "List discovered entry points, files, plugins, boundaries, and workspaces",
      "flags": [
        {
          "name": "--entry-points",
          "type": "bool",
          "required": false,
          "description": "Show entry points",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--files",
          "type": "bool",
          "required": false,
          "description": "Show all discovered files",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--plugins",
          "type": "bool",
          "required": false,
          "description": "Show active plugins",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--boundaries",
          "type": "bool",
          "required": false,
          "description": "Show architecture boundary zones, rules, and per-zone file counts",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--workspaces",
          "type": "bool",
          "required": false,
          "description": "Show monorepo workspaces and any workspace-discovery diagnostics (malformed package.json, unreachable glob matches, missing tsconfig references)",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "workspaces",
      "description": "Show monorepo workspaces and any workspace-discovery diagnostics",
      "flags": []
    },
    {
      "name": "dupes",
      "description": "Find code duplication / clones across the project",
      "flags": [
        {
          "name": "--mode",
          "type": "string",
          "required": false,
          "description": "Detection mode: strict, mild, weak, or semantic (defaults to the value in `.fallowrc.jsonc`, or `mild` if unset)",
          "possible_values": [
            "strict",
            "mild",
            "weak",
            "semantic"
          ]
        },
        {
          "name": "--min-tokens",
          "type": "string",
          "required": false,
          "description": "Minimum token count for a clone (defaults to the value in `.fallowrc.jsonc`, or `50` if unset)"
        },
        {
          "name": "--min-lines",
          "type": "string",
          "required": false,
          "description": "Minimum line count for a clone (defaults to the value in `.fallowrc.jsonc`, or `5` if unset)"
        },
        {
          "name": "--min-occurrences",
          "type": "string",
          "required": false,
          "description": "Minimum number of occurrences before a clone group is reported. Raise to focus on widespread copy-paste worth refactoring and skip pair-only clones. (defaults to the value in `.fallowrc.jsonc`, or `2` if unset)"
        },
        {
          "name": "--threshold",
          "type": "string",
          "required": false,
          "description": "Fail if duplication exceeds this percentage (0 = no limit) (defaults to the value in `.fallowrc.jsonc`, or `0` if unset)"
        },
        {
          "name": "--skip-local",
          "type": "bool",
          "required": false,
          "description": "Only report cross-directory duplicates",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--cross-language",
          "type": "bool",
          "required": false,
          "description": "Enable cross-language detection (strip TS type annotations for TS↔JS matching)",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--ignore-imports",
          "type": "bool",
          "required": false,
          "description": "Exclude import declarations from clone detection (reduces noise from sorted import blocks)",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--top",
          "type": "string",
          "required": false,
          "description": "Show only the N most-duplicated clone groups (sorted by instance count descending, then line count descending)"
        },
        {
          "name": "--trace",
          "type": "string",
          "required": false,
          "description": "Trace all clones at a specific location (format: `FILE:LINE`)"
        }
      ]
    },
    {
      "name": "health",
      "description": "Analyze function complexity (cyclomatic + cognitive)",
      "flags": [
        {
          "name": "--max-cyclomatic",
          "type": "string",
          "required": false,
          "description": "Maximum cyclomatic complexity threshold (overrides config)"
        },
        {
          "name": "--max-cognitive",
          "type": "string",
          "required": false,
          "description": "Maximum cognitive complexity threshold (overrides config)"
        },
        {
          "name": "--max-crap",
          "type": "string",
          "required": false,
          "description": "Maximum CRAP score threshold (overrides config, default 30.0). Functions meeting or exceeding this score are reported alongside complexity findings. Pair with `--coverage` for accurate scoring"
        },
        {
          "name": "--top",
          "type": "string",
          "required": false,
          "description": "Show only the N most complex functions"
        },
        {
          "name": "--sort",
          "type": "string",
          "required": false,
          "description": "Sort by: cyclomatic (default), cognitive, lines, or severity",
          "default": "cyclomatic",
          "possible_values": [
            "severity",
            "cyclomatic",
            "cognitive",
            "lines"
          ]
        },
        {
          "name": "--complexity",
          "type": "bool",
          "required": false,
          "description": "Show only complexity findings (functions exceeding thresholds). By default all sections are shown; use this to select only complexity",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--complexity-breakdown",
          "type": "bool",
          "required": false,
          "description": "Include the per-decision-point complexity breakdown (`contributions[]`) on each complexity finding in `--format json` output. Each entry names the construct (if, else-if, loop, boolean operator, ...) and its cyclomatic/cognitive weight, so a consumer can explain WHY a function scored high. Used by the VS Code inline editor breakdown. Off by default to keep CI/default output lean",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--file-scores",
          "type": "bool",
          "required": false,
          "description": "Show only per-file health scores (fan-in, fan-out, dead code ratio, maintainability index). Requires full analysis pipeline (graph + dead code detection). Sorted by risk-aware triage concern: lower MI and higher CRAP risk first. --sort and --baseline apply to complexity findings only, not file scores",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--coverage-gaps",
          "type": "bool",
          "required": false,
          "description": "Show only static test coverage gaps: runtime files and exports with no dependency path from any discovered test root. Requires full analysis pipeline",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--hotspots",
          "type": "bool",
          "required": false,
          "description": "Show only hotspots: files that are both complex and frequently changing. Combines git churn history with complexity data. Requires a git repository",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--ownership",
          "type": "bool",
          "required": false,
          "description": "Attach ownership signals to hotspot entries: bus factor, contributor count, declared CODEOWNERS owner, and ownership drift. Implies `--hotspots`. Requires a git repository",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--ownership-emails",
          "type": "string",
          "required": false,
          "description": "Privacy mode for author emails emitted with `--ownership`. Defaults to `handle` (local-part only). Use `raw` for OSS repos where authors are public, or `anonymized` to emit non-reversible pseudonyms in regulated environments. Implies `--ownership`",
          "possible_values": [
            "raw",
            "handle",
            "anonymized",
            "hash"
          ]
        },
        {
          "name": "--targets",
          "type": "bool",
          "required": false,
          "description": "Show only refactoring targets: ranked recommendations based on complexity, coupling, churn, and dead code signals. Requires full analysis pipeline",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--effort",
          "type": "string",
          "required": false,
          "description": "Filter refactoring targets by effort level (low, medium, high). Implies --targets",
          "possible_values": [
            "low",
            "medium",
            "high"
          ]
        },
        {
          "name": "--score",
          "type": "bool",
          "required": false,
          "description": "Show only the project health score (0–100) with letter grade (A/B/C/D/F). The score is included by default when no section flags are set",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--min-score",
          "type": "string",
          "required": false,
          "description": "Fail if the health score is below this threshold (0-100). Implies --score. The authoritative CI quality gate: when set, complexity findings become informational and the exit code is driven solely by the score (so --min-score 0 always exits 0). Composes with --min-severity (fails if either gate trips). Plain `fallow health` (no gate flag) stays advisory and exits 1 on any finding; for a gate on newly-introduced complexity use `fallow audit --gate new-only`"
        },
        {
          "name": "--min-severity",
          "type": "string",
          "required": false,
          "description": "Only exit with error for findings at or above this severity. Use --min-severity critical to ignore moderate/high findings in CI. Composes with --min-score (the run fails if either gate trips)",
          "possible_values": [
            "moderate",
            "high",
            "critical"
          ]
        },
        {
          "name": "--report-only",
          "type": "bool",
          "required": false,
          "description": "Print the score and findings but never fail CI (always exit 0). Advisory mode for surfacing health in logs without blocking. Mutually exclusive with --min-score and --min-severity",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--since",
          "type": "string",
          "required": false,
          "description": "Git history window for hotspot analysis (default: 6m). Accepts durations (6m, 90d, 1y, 2w) or ISO dates (2025-06-01)"
        },
        {
          "name": "--min-commits",
          "type": "string",
          "required": false,
          "description": "Minimum number of commits for a file to be included in hotspot ranking (default: 3)"
        },
        {
          "name": "--save-snapshot",
          "type": "string",
          "required": false,
          "description": "Save a vital signs snapshot for trend tracking. Defaults to `.fallow/snapshots/{timestamp}.json` if no path is given. Forces file-scores, hotspot, and score computation for complete metrics"
        },
        {
          "name": "--trend",
          "type": "bool",
          "required": false,
          "description": "Compare current metrics against the most recent saved snapshot. Reads from `.fallow/snapshots/` and shows per-metric deltas with directional indicators. Implies --score",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--coverage",
          "type": "string",
          "required": false,
          "description": "Path to coverage data (coverage-final.json) for exact per-function CRAP scores. Generate with `jest --coverage`, `vitest run --coverage --provider istanbul`, or any Istanbul-compatible tool. Requires Istanbul format (not v8/c8 native format). Accepts a single Istanbul coverage map JSON file or a directory containing coverage-final.json. Use --coverage-root when the file was generated in a different environment (CI runner, Docker). Affects CRAP scores only, not --coverage-gaps. Also configurable via FALLOW_COVERAGE env var"
        },
        {
          "name": "--coverage-root",
          "type": "string",
          "required": false,
          "description": "Absolute prefix to strip from file paths in coverage data before prepending the project root. Use when coverage was generated in a different environment (CI runner, Docker). Example: if coverage paths start with /home/runner/work/myapp and the project root is ./, pass --coverage-root /home/runner/work/myapp"
        },
        {
          "name": "--runtime-coverage",
          "type": "string",
          "required": false,
          "description": "File or directory containing runtime coverage input. Accepts a V8 coverage directory, a single V8 JSON file, or a single Istanbul coverage map JSON file (commonly coverage-final.json)"
        },
        {
          "name": "--min-invocations-hot",
          "type": "string",
          "required": false,
          "description": "Threshold for hot-path classification",
          "default": "100"
        },
        {
          "name": "--min-observation-volume",
          "type": "string",
          "required": false,
          "description": "Minimum total trace volume before the sidecar allows high-confidence `safe_to_delete` / `review_required` verdicts. Below this the sidecar caps confidence at `medium` to protect against overconfident verdicts on new or low-traffic services. Omit to use the sidecar's spec default (5000)"
        },
        {
          "name": "--low-traffic-threshold",
          "type": "string",
          "required": false,
          "description": "Fraction of total trace count below which an invoked function is classified as `low_traffic` rather than `active`. Expressed as a decimal (e.g. `0.001` for 0.1%). Omit to use the sidecar's spec default (0.001)"
        }
      ]
    },
    {
      "name": "flags",
      "description": "Detect feature flag patterns in the codebase",
      "flags": [
        {
          "name": "--top",
          "type": "string",
          "required": false,
          "description": "Show only the top N flags"
        }
      ]
    },
    {
      "name": "explain",
      "description": "Explain one fallow issue type without running an analysis",
      "flags": [
        {
          "name": "issue_type",
          "type": "string",
          "required": true,
          "description": "Issue type, issue label, or rule id to explain"
        }
      ]
    },
    {
      "name": "audit",
      "description": "Audit changed files for dead code, complexity, and duplication",
      "flags": [
        {
          "name": "--production-dead-code",
          "type": "bool",
          "required": false,
          "description": "Run dead-code analysis in production mode for this audit",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--production-health",
          "type": "bool",
          "required": false,
          "description": "Run health analysis in production mode for this audit",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--production-dupes",
          "type": "bool",
          "required": false,
          "description": "Run duplication analysis in production mode for this audit",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--dead-code-baseline",
          "type": "string",
          "required": false,
          "description": "Compare dead-code issues against a saved baseline (produced by `fallow dead-code --save-baseline`)"
        },
        {
          "name": "--health-baseline",
          "type": "string",
          "required": false,
          "description": "Compare health findings against a saved baseline (produced by `fallow health --save-baseline`)"
        },
        {
          "name": "--dupes-baseline",
          "type": "string",
          "required": false,
          "description": "Compare duplication clone groups against a saved baseline (produced by `fallow dupes --save-baseline`)"
        },
        {
          "name": "--max-crap",
          "type": "string",
          "required": false,
          "description": "Maximum CRAP score threshold (overrides config, default 30.0). Functions meeting or exceeding this score cause audit to fail. Pair with `--coverage` for accurate scoring"
        },
        {
          "name": "--coverage",
          "type": "string",
          "required": false,
          "description": "Path to Istanbul-format coverage data (coverage-final.json) for accurate per-function CRAP scores in the health sub-analysis. Also configurable via FALLOW_COVERAGE"
        },
        {
          "name": "--coverage-root",
          "type": "string",
          "required": false,
          "description": "Absolute prefix to strip from coverage data paths before CRAP matching. Use when coverage was generated under a different checkout root in CI or Docker"
        },
        {
          "name": "--gate",
          "type": "string",
          "required": false,
          "description": "Which findings affect the audit verdict",
          "possible_values": [
            "new-only",
            "all"
          ]
        },
        {
          "name": "--runtime-coverage",
          "type": "string",
          "required": false,
          "description": "Paid runtime-coverage sidecar input. Accepts a V8 directory, a single V8 JSON file, or an Istanbul coverage map JSON. Spawns the `fallow-cov` sidecar as part of the audit pipeline so the `hot-path-touched` verdict surfaces alongside dead-code and complexity findings without requiring a second `fallow health` invocation in CI. License-gated; the verdict is informational (no exit code change) until a future `--gate hot-path-touched` knob lands"
        },
        {
          "name": "--min-invocations-hot",
          "type": "string",
          "required": false,
          "description": "Threshold for hot-path classification, forwarded to the sidecar when `--runtime-coverage` is set",
          "default": "100"
        },
        {
          "name": "--gate-marker",
          "type": "string",
          "required": false,
          "description": "Internal marker identifying a gate run (e.g. `pre-commit`), set by the generated git hook so Fallow Impact can record a containment event when the gate blocks then clears. Hidden; never changes the verdict, exit code, or output"
        }
      ]
    },
    {
      "name": "impact",
      "description": "Show what fallow has done for you: how many issues it is surfacing, the trend since the last recorded run, and how many commits it contained at the pre-commit gate",
      "flags": []
    },
    {
      "name": "security",
      "description": "Surface local security candidates for downstream agent verification (opt-in)",
      "flags": [
        {
          "name": "--runtime-coverage",
          "type": "string",
          "required": false,
          "description": "Paid runtime-coverage sidecar input. Accepts a V8 directory, a single V8 JSON file, or an Istanbul coverage map JSON. When set, `fallow security` annotates tainted-sink candidates with production runtime state and uses that state as an additive ranking signal"
        },
        {
          "name": "--min-invocations-hot",
          "type": "string",
          "required": false,
          "description": "Threshold for hot-path classification, forwarded to the sidecar when `--runtime-coverage` is set",
          "default": "100"
        },
        {
          "name": "--file",
          "type": "string",
          "required": false,
          "description": "Only report security candidates in or reachable from the specified files. The full project graph is still built, but output is scoped to matching finding anchors or trace hops. Accepts multiple values"
        },
        {
          "name": "--gate",
          "type": "string",
          "required": false,
          "description": "Opt-in regression gate: fail (exit 8) only when the change introduces a NEW security-sink candidate in the changed lines, not on the whole candidate backlog. Requires a diff source: `--changed-since <ref>`, `--diff-file <path>`, or `--diff-stdin`. There is deliberately no `all` mode (gating on the full backlog is the anti-feature this gate avoids)",
          "possible_values": [
            "new",
            "newly-reachable"
          ]
        },
        {
          "name": "--surface",
          "type": "bool",
          "required": false,
          "description": "Include the agent-facing attack-surface inventory in JSON output",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    },
    {
      "name": "schema",
      "description": "Dump fallow's capability manifest (CLI commands and flags, issue types, MCP tools, framework plugins, env vars) as machine-readable JSON for agent introspection. Always JSON, regardless of --format",
      "flags": []
    },
    {
      "name": "ci-template",
      "description": "Print or vendor CI integration templates",
      "flags": []
    },
    {
      "name": "migrate",
      "description": "Migrate configuration from knip or jscpd to fallow",
      "flags": [
        {
          "name": "--toml",
          "type": "bool",
          "required": false,
          "description": "Generate `fallow.toml` instead of JSONC",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--jsonc",
          "type": "bool",
          "required": false,
          "description": "Write JSONC content to `.fallowrc.jsonc` instead of `.fallowrc.json`. The generated content is the same JSONC (with `//` comments) either way; the `.jsonc` extension lets editors auto-detect JSON-with-comments syntax highlighting and silences linters that flag comments in `.json`. Without `--jsonc` or `--toml`, fallow auto-mirrors the source extension: a `knip.jsonc` migration writes `.fallowrc.jsonc`, a `knip.json` migration writes `.fallowrc.json`",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--dry-run",
          "type": "bool",
          "required": false,
          "description": "Only preview the generated config without writing",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--from",
          "type": "string",
          "required": false,
          "description": "Path to source config file (auto-detect if not specified)"
        }
      ]
    },
    {
      "name": "license",
      "description": "Manage the license for continuous/cloud runtime monitoring",
      "flags": []
    },
    {
      "name": "telemetry",
      "description": "Manage opt-in product telemetry",
      "flags": []
    },
    {
      "name": "coverage",
      "description": "Runtime coverage workflow",
      "flags": []
    },
    {
      "name": "setup-hooks",
      "description": "Install or remove a Claude Code PreToolUse hook that gates `git commit` / `git push` on `fallow audit`, so the agent cleans findings before the command runs",
      "flags": [
        {
          "name": "--agent",
          "type": "string",
          "required": false,
          "description": "Target a specific agent surface (default: auto-detect)",
          "possible_values": [
            "claude",
            "codex"
          ]
        },
        {
          "name": "--dry-run",
          "type": "bool",
          "required": false,
          "description": "Print what would be written or removed without touching the filesystem",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--force",
          "type": "bool",
          "required": false,
          "description": "Overwrite a user-edited hook script, invalid settings.json, or remove a user-edited script during uninstall",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--user",
          "type": "bool",
          "required": false,
          "description": "Write to the user's home directory instead of the project root",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--gitignore-claude",
          "type": "bool",
          "required": false,
          "description": "Append `.claude/` to the project's `.gitignore`",
          "possible_values": [
            "true",
            "false"
          ]
        },
        {
          "name": "--uninstall",
          "type": "bool",
          "required": false,
          "description": "Remove the fallow-gate handler, hook script, and AGENTS.md managed block instead of installing them. Idempotent: reports \"unchanged\" when nothing to remove",
          "possible_values": [
            "true",
            "false"
          ]
        }
      ]
    }
  ],
  "default_command": null,
  "default_behavior": "Runs all analyses (check + dupes + health). Use --only/--skip to select.",
  "issue_types": [
    {
      "id": "unused-file",
      "rule_id": "fallow/unused-file",
      "command": "dead-code",
      "category": "Dead code",
      "description": "File is not reachable from any entry point",
      "filter_flag": "--unused-files",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file unused-file",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-files"
    },
    {
      "id": "unused-export",
      "rule_id": "fallow/unused-export",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Export is never imported",
      "filter_flag": "--unused-exports",
      "fixable": true,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line unused-export",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-exports"
    },
    {
      "id": "unused-type",
      "rule_id": "fallow/unused-type",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Type export is never imported",
      "filter_flag": "--unused-types",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line unused-type",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-types"
    },
    {
      "id": "private-type-leak",
      "rule_id": "fallow/private-type-leak",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Exported signature references a private type",
      "filter_flag": "--private-type-leaks",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line private-type-leak",
      "note": "Opt-in API hygiene check; the rule defaults to off",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#private-type-leaks"
    },
    {
      "id": "unused-dependency",
      "rule_id": "fallow/unused-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Dependency listed but never imported",
      "filter_flag": "--unused-deps",
      "fixable": true,
      "suppressible": false,
      "suppress_comment": null,
      "note": "--unused-deps controls unused-dependency, unused-dev-dependency, unused-optional-dependency, type-only-dependency, and test-only-dependency",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-dependencies"
    },
    {
      "id": "unused-dev-dependency",
      "rule_id": "fallow/unused-dev-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Dev dependency listed but never imported",
      "filter_flag": "--unused-deps",
      "fixable": true,
      "suppressible": false,
      "suppress_comment": null,
      "note": "--unused-deps controls unused-dependency, unused-dev-dependency, unused-optional-dependency, type-only-dependency, and test-only-dependency",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-devdependencies"
    },
    {
      "id": "unused-optional-dependency",
      "rule_id": "fallow/unused-optional-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Optional dependency listed but never imported",
      "filter_flag": "--unused-deps",
      "fixable": true,
      "suppressible": false,
      "suppress_comment": null,
      "note": "--unused-deps controls unused-dependency, unused-dev-dependency, unused-optional-dependency, type-only-dependency, and test-only-dependency",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-optionaldependencies"
    },
    {
      "id": "type-only-dependency",
      "rule_id": "fallow/type-only-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Production dependency only used via type-only imports",
      "filter_flag": "--unused-deps",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Only reported in --production mode; --unused-deps scopes it together with the other dependency kinds",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#type-only-dependencies"
    },
    {
      "id": "test-only-dependency",
      "rule_id": "fallow/test-only-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Production dependency only imported by test files",
      "filter_flag": "--unused-deps",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Not reported in --production mode (test files are excluded there); --unused-deps scopes it together with the other dependency kinds",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#test-only-dependencies"
    },
    {
      "id": "unused-enum-member",
      "rule_id": "fallow/unused-enum-member",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Enum member is never referenced",
      "filter_flag": "--unused-enum-members",
      "fixable": true,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line unused-enum-member",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-enum-members"
    },
    {
      "id": "unused-class-member",
      "rule_id": "fallow/unused-class-member",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Class member is never referenced",
      "filter_flag": "--unused-class-members",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line unused-class-member",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-class-members"
    },
    {
      "id": "unresolved-import",
      "rule_id": "fallow/unresolved-import",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Import could not be resolved",
      "filter_flag": "--unresolved-imports",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line unresolved-import",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unresolved-imports"
    },
    {
      "id": "unlisted-dependency",
      "rule_id": "fallow/unlisted-dependency",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Dependency used but not in package.json",
      "filter_flag": "--unlisted-deps",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unlisted-dependencies"
    },
    {
      "id": "duplicate-export",
      "rule_id": "fallow/duplicate-export",
      "command": "dead-code",
      "category": "Dead code",
      "description": "Export name appears in multiple modules",
      "filter_flag": "--duplicate-exports",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file duplicate-export",
      "note": "fallow fix can add an ignoreExports rule to the fallow config instead of editing source",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#duplicate-exports"
    },
    {
      "id": "circular-dependency",
      "rule_id": "fallow/circular-dependency",
      "command": "dead-code",
      "category": "Architecture",
      "description": "Circular dependency chain detected",
      "filter_flag": "--circular-deps",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line circular-dependency",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#circular-dependencies"
    },
    {
      "id": "re-export-cycle",
      "rule_id": "fallow/re-export-cycle",
      "command": "dead-code",
      "category": "Architecture",
      "description": "Two or more barrel files re-export from each other in a loop",
      "filter_flag": "--re-export-cycles",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file re-export-cycle",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#re-export-cycles"
    },
    {
      "id": "boundary-violation",
      "rule_id": "fallow/boundary-violation",
      "command": "dead-code",
      "category": "Architecture",
      "description": "Import crosses a configured architecture boundary",
      "filter_flag": "--boundary-violations",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line boundary-violation",
      "note": "Requires configured boundary zones (boundaries config)",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#boundary-violations"
    },
    {
      "id": "boundary-coverage",
      "rule_id": "fallow/boundary-coverage",
      "command": "dead-code",
      "category": "Architecture",
      "description": "Source file matches no configured architecture boundary zone",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file boundary-violation",
      "note": "Requires boundaries.coverage.requireAllFiles",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#boundary-violations"
    },
    {
      "id": "boundary-call-violation",
      "rule_id": "fallow/boundary-call-violation",
      "command": "dead-code",
      "category": "Architecture",
      "description": "Zoned file calls a callee its zone forbids",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line boundary-call-violation",
      "note": "Requires boundaries.calls.forbidden patterns",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#boundary-violations"
    },
    {
      "id": "policy-violation",
      "rule_id": "fallow/policy-violation",
      "command": "dead-code",
      "category": "Policy",
      "description": "Banned call or import matched a rule-pack rule",
      "filter_flag": "--policy-violations",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line policy-violation",
      "note": "Requires a configured rule pack (rulePacks config)",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#policy-violations"
    },
    {
      "id": "stale-suppression",
      "rule_id": "fallow/stale-suppression",
      "command": "dead-code",
      "category": "Suppressions",
      "description": "Suppression comment or tag no longer matches any issue",
      "filter_flag": "--stale-suppressions",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Fix by removing the stale suppression marker itself",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#stale-suppressions"
    },
    {
      "id": "unused-catalog-entry",
      "rule_id": "fallow/unused-catalog-entry",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Catalog entry in pnpm-workspace.yaml not referenced by any workspace package",
      "filter_flag": "--unused-catalog-entries",
      "fixable": true,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-catalog-entries"
    },
    {
      "id": "empty-catalog-group",
      "rule_id": "fallow/empty-catalog-group",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "Named catalog group in pnpm-workspace.yaml has no entries",
      "filter_flag": "--empty-catalog-groups",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#empty-catalog-groups"
    },
    {
      "id": "unresolved-catalog-reference",
      "rule_id": "fallow/unresolved-catalog-reference",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "package.json references a catalog that does not declare the package",
      "filter_flag": "--unresolved-catalog-references",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unresolved-catalog-references"
    },
    {
      "id": "unused-dependency-override",
      "rule_id": "fallow/unused-dependency-override",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "pnpm.overrides entry targets a package not declared or resolved",
      "filter_flag": "--unused-dependency-overrides",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#unused-dependency-overrides"
    },
    {
      "id": "misconfigured-dependency-override",
      "rule_id": "fallow/misconfigured-dependency-override",
      "command": "dead-code",
      "category": "Dependencies",
      "description": "pnpm.overrides entry has an unparsable key or value",
      "filter_flag": "--misconfigured-dependency-overrides",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/dead-code#misconfigured-dependency-overrides"
    },
    {
      "id": "high-cyclomatic-complexity",
      "rule_id": "fallow/high-cyclomatic-complexity",
      "command": "health",
      "category": "Health",
      "description": "Function has high cyclomatic complexity",
      "filter_flag": "--complexity",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line complexity",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#cyclomatic-complexity"
    },
    {
      "id": "high-cognitive-complexity",
      "rule_id": "fallow/high-cognitive-complexity",
      "command": "health",
      "category": "Health",
      "description": "Function has high cognitive complexity",
      "filter_flag": "--complexity",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line complexity",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#cognitive-complexity"
    },
    {
      "id": "high-complexity",
      "rule_id": "fallow/high-complexity",
      "command": "health",
      "category": "Health",
      "description": "Function exceeds both complexity thresholds",
      "filter_flag": "--complexity",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line complexity",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#complexity-metrics"
    },
    {
      "id": "high-crap-score",
      "rule_id": "fallow/high-crap-score",
      "command": "health",
      "category": "Health",
      "description": "Function has a high CRAP score (complexity combined with low coverage)",
      "filter_flag": "--complexity",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line complexity",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#crap-score"
    },
    {
      "id": "refactoring-target",
      "rule_id": "fallow/refactoring-target",
      "command": "health",
      "category": "Health",
      "description": "File identified as a high-priority refactoring candidate",
      "filter_flag": "--targets",
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#refactoring-targets"
    },
    {
      "id": "untested-file",
      "rule_id": "fallow/untested-file",
      "command": "health",
      "category": "Health",
      "description": "Runtime-reachable file has no test dependency path",
      "filter_flag": "--coverage-gaps",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file coverage-gaps",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-gaps"
    },
    {
      "id": "untested-export",
      "rule_id": "fallow/untested-export",
      "command": "health",
      "category": "Health",
      "description": "Runtime-reachable export has no test dependency path",
      "filter_flag": "--coverage-gaps",
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file coverage-gaps",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-gaps"
    },
    {
      "id": "runtime-safe-to-delete",
      "rule_id": "fallow/runtime-safe-to-delete",
      "command": "health",
      "category": "Health",
      "description": "Statically unused AND never invoked in production with V8 tracking",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Requires --runtime-coverage input (V8 directory, V8 JSON, or Istanbul map)",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#runtime-coverage"
    },
    {
      "id": "runtime-review-required",
      "rule_id": "fallow/runtime-review-required",
      "command": "health",
      "category": "Health",
      "description": "Statically used but never invoked in production",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Requires --runtime-coverage input (V8 directory, V8 JSON, or Istanbul map)",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#runtime-coverage"
    },
    {
      "id": "runtime-low-traffic",
      "rule_id": "fallow/runtime-low-traffic",
      "command": "health",
      "category": "Health",
      "description": "Function was invoked below the low-traffic threshold",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Requires --runtime-coverage input (V8 directory, V8 JSON, or Istanbul map)",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#runtime-coverage"
    },
    {
      "id": "runtime-coverage-unavailable",
      "rule_id": "fallow/runtime-coverage-unavailable",
      "command": "health",
      "category": "Health",
      "description": "Runtime coverage could not be resolved for this function",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Requires --runtime-coverage input (V8 directory, V8 JSON, or Istanbul map)",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#runtime-coverage"
    },
    {
      "id": "runtime-coverage",
      "rule_id": "fallow/runtime-coverage",
      "command": "health",
      "category": "Health",
      "description": "Runtime coverage finding",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Requires --runtime-coverage input (V8 directory, V8 JSON, or Istanbul map)",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#runtime-coverage"
    },
    {
      "id": "coverage-intelligence-risky-change",
      "rule_id": "fallow/coverage-intelligence-risky-change",
      "command": "health",
      "category": "Health",
      "description": "Changed hot path combines high CRAP and low test coverage",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Produced by fallow coverage analyze",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-intelligence"
    },
    {
      "id": "coverage-intelligence-delete",
      "rule_id": "fallow/coverage-intelligence-delete",
      "command": "health",
      "category": "Health",
      "description": "Static and runtime evidence indicate code can be deleted",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Produced by fallow coverage analyze",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-intelligence"
    },
    {
      "id": "coverage-intelligence-review",
      "rule_id": "fallow/coverage-intelligence-review",
      "command": "health",
      "category": "Health",
      "description": "Cold reachable uncovered code needs owner review",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Produced by fallow coverage analyze",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-intelligence"
    },
    {
      "id": "coverage-intelligence-refactor",
      "rule_id": "fallow/coverage-intelligence-refactor",
      "command": "health",
      "category": "Health",
      "description": "Hot covered code has high CRAP and should be refactored carefully",
      "filter_flag": null,
      "fixable": false,
      "suppressible": false,
      "suppress_comment": null,
      "note": "Produced by fallow coverage analyze",
      "license": "freemium",
      "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
      "docs_url": "https://docs.fallow.tools/explanations/health#coverage-intelligence"
    },
    {
      "id": "code-duplication",
      "rule_id": "fallow/code-duplication",
      "command": "dupes",
      "category": "Duplication",
      "description": "Duplicated code block",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line code-duplication",
      "note": "Reported by fallow dupes (and bare fallow / fallow audit)",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/explanations/duplication#clone-groups"
    },
    {
      "id": "feature-flag",
      "rule_id": "fallow/feature-flag",
      "command": "flags",
      "category": "Flags",
      "description": "Detected feature flag pattern",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line feature-flag",
      "note": "Reported by fallow flags",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/flags"
    },
    {
      "id": "tainted-sink",
      "rule_id": "security/tainted-sink",
      "command": "security",
      "category": "Security",
      "description": "Syntactic security sink candidates require verification",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "client-server-leak",
      "rule_id": "security/client-server-leak",
      "command": "security",
      "category": "Security",
      "description": "Client-bound code reaches a non-public env read",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-file security-client-server-leak",
      "note": null,
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "hardcoded-secret",
      "rule_id": "security/hardcoded-secret",
      "command": "security",
      "category": "Security",
      "description": "Provider-prefixed or contextual secret literals require verification",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Include-required category: enable via security.categories.include",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "dangerous-html",
      "rule_id": "security/dangerous-html",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-79",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "template-escape-bypass",
      "rule_id": "security/template-escape-bypass",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-79",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "command-injection",
      "rule_id": "security/command-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-78",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "code-injection",
      "rule_id": "security/code-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-94",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "dynamic-regex",
      "rule_id": "security/dynamic-regex",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1333",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "redos-regex",
      "rule_id": "security/redos-regex",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1333",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "resource-amplification",
      "rule_id": "security/resource-amplification",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-400",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "dynamic-module-load",
      "rule_id": "security/dynamic-module-load",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-95",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "sql-injection",
      "rule_id": "security/sql-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-89",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "ssrf",
      "rule_id": "security/ssrf",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-918",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "secret-to-network",
      "rule_id": "security/secret-to-network",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-201",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "path-traversal",
      "rule_id": "security/path-traversal",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-22",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "header-injection",
      "rule_id": "security/header-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-113",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "open-redirect",
      "rule_id": "security/open-redirect",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-601",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "postmessage-wildcard-origin",
      "rule_id": "security/postmessage-wildcard-origin",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-346",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "tls-validation-disabled",
      "rule_id": "security/tls-validation-disabled",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-295",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "cleartext-transport",
      "rule_id": "security/cleartext-transport",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-319",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "electron-unsafe-webpreferences",
      "rule_id": "security/electron-unsafe-webpreferences",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1188",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "world-writable-permission",
      "rule_id": "security/world-writable-permission",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-732",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "insecure-temp-file",
      "rule_id": "security/insecure-temp-file",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-377",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "mysql-multiple-statements",
      "rule_id": "security/mysql-multiple-statements",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-89",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "permissive-cors",
      "rule_id": "security/permissive-cors",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-942",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "insecure-cookie",
      "rule_id": "security/insecure-cookie",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-614",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "mass-assignment",
      "rule_id": "security/mass-assignment",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-915",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "weak-crypto",
      "rule_id": "security/weak-crypto",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-327",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "insecure-randomness",
      "rule_id": "security/insecure-randomness",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-338",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "jwt-alg-none",
      "rule_id": "security/jwt-alg-none",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-347",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "jwt-verify-missing-algorithms",
      "rule_id": "security/jwt-verify-missing-algorithms",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-347",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "deprecated-cipher",
      "rule_id": "security/deprecated-cipher",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-327",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "unsafe-buffer-alloc",
      "rule_id": "security/unsafe-buffer-alloc",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1188",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "unsafe-deserialization",
      "rule_id": "security/unsafe-deserialization",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-502",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "angular-trusted-html",
      "rule_id": "security/angular-trusted-html",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-79",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "nextjs-open-redirect",
      "rule_id": "security/nextjs-open-redirect",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-601",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "dom-document-write",
      "rule_id": "security/dom-document-write",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-79",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "jquery-html",
      "rule_id": "security/jquery-html",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-79",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "route-send-file",
      "rule_id": "security/route-send-file",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-22",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "webview-injection",
      "rule_id": "security/webview-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-94",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "prototype-pollution",
      "rule_id": "security/prototype-pollution",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1321",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "zip-slip",
      "rule_id": "security/zip-slip",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-22",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "nosql-injection",
      "rule_id": "security/nosql-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-943",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "ssti",
      "rule_id": "security/ssti",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-1336",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "xxe",
      "rule_id": "security/xxe",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-611",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "secret-pii-log",
      "rule_id": "security/secret-pii-log",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-532",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    },
    {
      "id": "xpath-injection",
      "rule_id": "security/xpath-injection",
      "command": "security",
      "category": "Security",
      "description": "Catalogue security candidate for CWE-643",
      "filter_flag": null,
      "fixable": false,
      "suppressible": true,
      "suppress_comment": "// fallow-ignore-next-line security-sink",
      "note": "Tainted-sink catalogue category; the security-sink suppression token covers every category",
      "license": "free",
      "license_note": null,
      "docs_url": "https://docs.fallow.tools/cli/security"
    }
  ],
  "suppression_comments": {
    "next_line": "// fallow-ignore-next-line [issue-type]",
    "file": "// fallow-ignore-file [issue-type]",
    "note": "Omit [issue-type] to suppress all issue types. Unknown tokens are silently ignored."
  },
  "output_formats": [
    "human",
    "json",
    "sarif",
    "compact",
    "markdown",
    "codeclimate",
    "gitlab-codequality",
    "pr-comment-github",
    "pr-comment-gitlab",
    "review-github",
    "review-gitlab",
    "badge"
  ],
  "exit_codes": {
    "0": "Success (no error-severity issues found)",
    "1": "Error-severity issues found (per rules config, or --fail-on-issues promotes warn→error)",
    "2": "Error (invalid config, invalid input, etc.). When --format json is active, errors are emitted as structured JSON on stdout: {\"error\": true, \"message\": \"...\", \"exit_code\": 2}"
  },
  "environment_variables": {
    "FALLOW_FORMAT": "Default output format (json/human/sarif/compact/markdown/codeclimate/gitlab-codequality/pr-comment-github/pr-comment-gitlab/review-github/review-gitlab/badge). CLI --format flag overrides this.",
    "FALLOW_QUIET": "Set to \"1\" or \"true\" to suppress progress output. CLI --quiet flag overrides this.",
    "FALLOW_PRODUCTION": "Set to true/false to override production mode for all analyses.",
    "FALLOW_PRODUCTION_DEAD_CODE": "Set to true/false to override production mode for dead-code analysis.",
    "FALLOW_PRODUCTION_HEALTH": "Set to true/false to override production mode for health analysis.",
    "FALLOW_PRODUCTION_DUPES": "Set to true/false to override production mode for duplication analysis.",
    "FALLOW_REVIEW_GUIDANCE": "Set to true to append collapsed guidance blocks to review-github/review-gitlab inline comment bodies.",
    "FALLOW_SUMMARY_SCOPE": "Summary scope for pr-comment-github/pr-comment-gitlab: all (default) keeps project-level dependency/catalog/override findings outside the diff filter; diff applies the diff filter to them too. Inline review comments are unaffected.",
    "FALLOW_DIFF_CONTEXT": "Line radius around changed diff lines when scoping findings to a diff in the review/PR-comment formats (default 3).",
    "FALLOW_BOT_LOGIN": "Bot or token username treated as fallow's own when reconciling existing PR/MR comments in review-github/review-gitlab. Required when posting with a personal access token (the author then carries a human identity).",
    "FALLOW_API_RETRIES": "Maximum HTTP attempts for review-comment reconciliation API calls (default 3).",
    "FALLOW_API_RETRY_DELAY": "Floor delay in seconds between HTTP retry attempts (default 2); a server-supplied Retry-After overrides it on 429 responses.",
    "FALLOW_CACHE_DIR": "Directory for fallow's persistent analysis cache. Relative paths resolve from the project root and override cache.dir.",
    "FALLOW_CACHE_MAX_SIZE": "Extraction cache size cap in megabytes (default 256). Wins over the cache.maxSizeMb config field.",
    "FALLOW_EXTENDS_TIMEOUT_SECS": "Timeout in seconds for fetching https:// configs referenced via the extends field (default 5).",
    "FALLOW_COVERAGE": "Path to Istanbul coverage data (coverage-final.json) for accurate per-function CRAP scores. CLI --coverage flag overrides this.",
    "FALLOW_MAX_FILE_SIZE": "Per-file size ceiling in megabytes for source discovery (default 5; 0 = no limit). CLI --max-file-size flag overrides this.",
    "FALLOW_AUDIT_BASE": "Pins the fallow audit comparison base ref when no --base/--changed-since is passed (e.g. upstream/main).",
    "FALLOW_AUDIT_CACHE_MAX_AGE_DAYS": "GC threshold in days for reusable audit base-snapshot caches (default 30; 0 disables the sweep).",
    "FALLOW_ROOT": "Project root used by the review-github/review-gitlab renderers to read source for suggestion blocks. Set it alongside --root when rendering review formats outside the bundled CI integrations.",
    "FALLOW_LICENSE": "License JWT (full string) for the paid runtime intelligence layer; intended for shared CI runners.",
    "FALLOW_LICENSE_PATH": "File path containing the license JWT.",
    "FALLOW_LICENSE_SKEW_TOLERANCE_SECONDS": "Clock-skew tolerance applied to the license JWT's iat claim (default 86400).",
    "FALLOW_COV_BIN": "Explicit path override for the fallow-cov runtime-coverage sidecar binary.",
    "FALLOW_COV_BINARY_PATH": "Secondary explicit path override for the fallow-cov sidecar, checked after FALLOW_COV_BIN (air-gapped installs, distro-packaged sidecars, shared Docker images).",
    "FALLOW_RUNTIME_COVERAGE_SOURCE": "Set to cloud to select cloud runtime coverage in fallow coverage analyze without passing --cloud.",
    "FALLOW_REPO": "owner/repo fallback for fallow coverage analyze --cloud when --repo is not passed (otherwise parsed from the git origin remote).",
    "FALLOW_API_URL": "Base URL override for fallow cloud API calls (license refresh, trial, coverage uploads).",
    "FALLOW_API_KEY": "fallow cloud bearer token for coverage upload commands.",
    "FALLOW_CA_BUNDLE": "Path to a PEM certificate bundle for fallow cloud and provider HTTP calls (replaces the default WebPKI roots).",
    "FALLOW_UPDATE_CHECK": "Set to off/0/false to disable the human-TTY upgrade nudge and its background version check.",
    "FALLOW_SUGGESTIONS": "Set to off/0/false/no/disabled to suppress the next_steps[] array of read-only follow-up commands in JSON output (and the human Next: line). Useful for CI consumers that snapshot-diff raw --format json output. Default on.",
    "FALLOW_TELEMETRY": "Opt-in telemetry mode: off, on, or inspect (print the payload to stderr without sending). Telemetry is off by default.",
    "FALLOW_TELEMETRY_DISABLED": "Admin/fleet kill switch: truthy values hard-disable telemetry and refuse fallow telemetry enable.",
    "FALLOW_TELEMETRY_DEBUG": "Truthy values alias FALLOW_TELEMETRY=inspect.",
    "FALLOW_AGENT_SOURCE": "Normalized agent vendor for telemetry classification (e.g. claude_code, codex, cursor). Only read when telemetry is on.",
    "DO_NOT_TRACK": "Honored as a top-precedence telemetry kill switch (consoledonottrack.com convention).",
    "FALLOW_BIN": "Path to the fallow binary (used by the fallow-mcp server to spawn the CLI).",
    "FALLOW_TIMEOUT_SECS": "MCP server: per-tool-call CLI subprocess timeout in seconds (default 120). Raise for long runs like production coverage on large dumps.",
    "FALLOW_DIFF_FILE": "MCP server: path to a unified diff that scopes all findings by changed line.",
    "FALLOW_CHANGED_SINCE": "MCP server: git ref that scopes file discovery for analysis tools.",
    "FALLOW_INTEGRATION_SURFACE": "Telemetry integration_surface override for non-CLI surfaces (mcp/lsp/vscode/napi/programmatic). Set by the MCP server on the CLI it spawns.",
    "FALLOW_MCP_TOOL": "Telemetry mcp_tool dimension, validated against the MCP tool-name allowlist. Set by the MCP server alongside FALLOW_INTEGRATION_SURFACE=mcp."
  },
  "severity_levels": [
    "error",
    "warn",
    "off"
  ],
  "mcp_tools": {
    "server": "fallow-mcp",
    "note": "key_params is a curated subset; the live MCP input schemas (list_tools) are authoritative for the full parameter list",
    "tools": [
      {
        "name": "code_execute",
        "kind": "composition",
        "description": "Run a bounded read-only JavaScript snippet that composes fallow's analysis tools inside a sandbox (Code Mode meta-tool, not a plain analysis call)",
        "key_params": [
          "code",
          "timeout_ms",
          "max_output_bytes"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "analyze",
        "kind": "analysis",
        "description": "Full dead-code analysis: unused files, exports, types, dependencies, circular dependencies, and boundary violations",
        "key_params": [
          "issue_types",
          "production",
          "workspace",
          "baseline",
          "group_by",
          "file"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "check_changed",
        "kind": "analysis",
        "description": "Incremental dead-code analysis scoped to files changed since a git ref (ideal for PR review)",
        "key_params": [
          "since",
          "baseline",
          "fail_on_regression"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "security_candidates",
        "kind": "analysis",
        "description": "Unverified local security candidates (tainted sinks) for downstream agent verification",
        "key_params": [
          "gate",
          "surface",
          "changed_since",
          "paths"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "inspect_target",
        "kind": "analysis",
        "description": "One evidence bundle for a file or exported symbol: trace, dead-code actions, duplication, complexity, and security candidates",
        "key_params": [
          "target",
          "production"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "find_dupes",
        "kind": "analysis",
        "description": "Code duplication detection with clone groups and refactoring suggestions",
        "key_params": [
          "mode",
          "min_tokens",
          "min_occurrences",
          "top",
          "threshold"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "check_health",
        "kind": "analysis",
        "description": "Complexity metrics, health score, hotspots, ownership, refactoring targets, and coverage gaps",
        "key_params": [
          "score",
          "file_scores",
          "hotspots",
          "targets",
          "coverage",
          "runtime_coverage",
          "max_crap",
          "group_by"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "check_runtime_coverage",
        "kind": "runtime-coverage",
        "description": "Merge V8 or Istanbul runtime coverage into the health report (hot paths, cold paths, verdicts)",
        "key_params": [
          "coverage",
          "min_invocations_hot",
          "min_observation_volume",
          "low_traffic_threshold",
          "group_by"
        ],
        "license": "freemium",
        "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
        "read_only": true
      },
      {
        "name": "get_hot_paths",
        "kind": "runtime-coverage",
        "description": "Production hot paths from runtime coverage, sorted by invocation volume",
        "key_params": [
          "coverage",
          "top",
          "min_invocations_hot"
        ],
        "license": "freemium",
        "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
        "read_only": true
      },
      {
        "name": "get_blast_radius",
        "kind": "runtime-coverage",
        "description": "Blast-radius context (caller counts, risk bands) from runtime coverage",
        "key_params": [
          "coverage",
          "group_by"
        ],
        "license": "freemium",
        "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
        "read_only": true
      },
      {
        "name": "get_importance",
        "kind": "runtime-coverage",
        "description": "Production-importance scores (0-100) combining invocations, complexity, and ownership",
        "key_params": [
          "coverage",
          "group_by"
        ],
        "license": "freemium",
        "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
        "read_only": true
      },
      {
        "name": "get_cleanup_candidates",
        "kind": "runtime-coverage",
        "description": "Cleanup candidates with safe_to_delete, review_required, and low_traffic verdicts from runtime coverage",
        "key_params": [
          "coverage",
          "group_by"
        ],
        "license": "freemium",
        "license_note": "A single local runtime-coverage capture is free; continuous or multi-capture runtime monitoring requires an active license (fallow license activate).",
        "read_only": true
      },
      {
        "name": "audit",
        "kind": "analysis",
        "description": "Combined dead-code, complexity, and duplication audit for changed files with a pass/warn/fail verdict",
        "key_params": [
          "gate",
          "base",
          "max_crap",
          "coverage",
          "runtime_coverage"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "fallow_explain",
        "kind": "introspection",
        "description": "Explain one issue type (rationale, examples, fix guidance) without running an analysis",
        "key_params": [
          "issue_type"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "fix_preview",
        "kind": "fix",
        "description": "Dry-run auto-fix preview; shows what would change without modifying files",
        "key_params": [
          "no_create_config"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "fix_apply",
        "kind": "fix",
        "description": "Apply auto-fixes: removes unused exports, dependencies, and enum members (mutates files)",
        "key_params": [
          "no_create_config"
        ],
        "license": "free",
        "license_note": null,
        "read_only": false
      },
      {
        "name": "project_info",
        "kind": "introspection",
        "description": "Project metadata: active framework plugins, discovered files, entry points, and boundary zones",
        "key_params": [
          "entry_points",
          "files",
          "plugins",
          "boundaries"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "list_boundaries",
        "kind": "introspection",
        "description": "List architecture boundary zones and access rules",
        "key_params": [],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "feature_flags",
        "kind": "analysis",
        "description": "Detect feature flag patterns (environment variables, SDK calls, config objects)",
        "key_params": [
          "workspace",
          "production"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "impact",
        "kind": "introspection",
        "description": "Read the local Fallow Impact value-tracking report (.fallow/impact.json, local-dev only)",
        "key_params": [
          "root"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "trace_export",
        "kind": "trace",
        "description": "Trace why an export is used or unused, including re-export chains and entry-point status",
        "key_params": [
          "file",
          "export_name"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "trace_file",
        "kind": "trace",
        "description": "Trace all module-graph edges for a file (imports, exports, importers, re-exports)",
        "key_params": [
          "file"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "trace_dependency",
        "kind": "trace",
        "description": "Trace where a dependency is imported and whether scripts or CI use it",
        "key_params": [
          "package_name"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      },
      {
        "name": "trace_clone",
        "kind": "trace",
        "description": "Deep-dive a duplicate-code clone group by location or fingerprint",
        "key_params": [
          "file",
          "line",
          "fingerprint"
        ],
        "license": "free",
        "license_note": null,
        "read_only": true
      }
    ]
  },
  "plugins": {
    "count": 122,
    "note": "Built-in framework plugins, auto-activated when their enabler dependency is present; run fallow list --plugins for the set active in a specific project",
    "names": [
      "nextjs",
      "nuxt",
      "pinia",
      "remix",
      "astro",
      "browser-extension",
      "wxt",
      "angular",
      "react-router",
      "redwoodsdk",
      "tanstack-router",
      "react-native",
      "expo",
      "expo-router",
      "firebase",
      "nestjs",
      "adonis",
      "docusaurus",
      "gatsby",
      "sveltekit",
      "nitro",
      "capacitor",
      "ionic",
      "sanity",
      "supabase",
      "vitepress",
      "rspress",
      "next-intl",
      "relay",
      "electron",
      "i18next",
      "qwik",
      "convex",
      "lit",
      "lexical",
      "obsidian",
      "content-collections",
      "contentlayer",
      "fumadocs",
      "mintlify",
      "velite",
      "ember",
      "vite",
      "vscode",
      "webpack",
      "rollup",
      "rolldown",
      "rspack",
      "rsbuild",
      "tsup",
      "tsdown",
      "pkg-utils",
      "parcel",
      "vitest",
      "jest",
      "playwright",
      "cypress",
      "mocha",
      "ava",
      "tap",
      "tsd",
      "k6",
      "storybook",
      "stryker",
      "karma",
      "cucumber",
      "webdriverio",
      "eslint",
      "biome",
      "stylelint",
      "prettier",
      "oxlint",
      "markdownlint",
      "cspell",
      "remark",
      "typescript",
      "babel",
      "swc",
      "tailwind",
      "postcss",
      "unocss",
      "pandacss",
      "prisma",
      "drizzle",
      "knex",
      "typeorm",
      "kysely",
      "turborepo",
      "nx",
      "changesets",
      "syncpack",
      "commitlint",
      "commitizen",
      "semantic-release",
      "danger",
      "hardhat",
      "vercel",
      "wrangler",
      "opennext-cloudflare",
      "sentry",
      "husky",
      "lint-staged",
      "lefthook",
      "simple-git-hooks",
      "svgo",
      "svgr",
      "graphql-codegen",
      "typedoc",
      "openapi-ts",
      "plop",
      "c8",
      "nyc",
      "msw",
      "napi-rs",
      "opencode",
      "nodemon",
      "pm2",
      "dependency-cruiser",
      "wuchale",
      "varlock",
      "pnpm",
      "bun"
    ]
  },
  "task_matrix": [
    {
      "task": "delete an \"unused\" export or file",
      "command": "fallow dead-code --trace <file>:<export>",
      "note": null
    },
    {
      "task": "delete an \"unused\" dependency",
      "command": "fallow dead-code --trace-dependency <name>",
      "note": null
    },
    {
      "task": "commit or open a PR",
      "command": "fallow audit --base <ref>",
      "note": null
    },
    {
      "task": "prioritize refactoring",
      "command": "fallow health --hotspots --targets",
      "note": null
    },
    {
      "task": "ask who owns code",
      "command": "fallow health --ownership",
      "note": null
    },
    {
      "task": "check untested-but-reachable code",
      "command": "fallow health --coverage-gaps",
      "note": null
    },
    {
      "task": "consolidate duplication",
      "command": "fallow dupes --trace dup:<fingerprint>",
      "note": null
    },
    {
      "task": "find feature flags",
      "command": "fallow flags",
      "note": null
    },
    {
      "task": "surface security candidates",
      "command": "fallow security",
      "note": null
    },
    {
      "task": "understand a finding",
      "command": "fallow explain <issue-type>",
      "note": null
    },
    {
      "task": "scope a monorepo",
      "command": "--workspace <glob> / --changed-workspaces <ref>",
      "note": "global flags, prefix any command"
    }
  ]
}
```

## Version Information
```text
fallow 2.95.0
verified: yes (cache hit at /app/node_modules/@fallow-cli/linux-x64-gnu/.fallow-verified); fallow 2.95.0 signed
```
