# Mermaid Diagrams — Examples

Open this file and try **double-clicking** any diagram below to enter edit mode. Move the cursor out to return to reading mode.

---

## Flowchart

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it!]
    B -->|No| D[Debug it]
    D --> E[Fix the bug]
    E --> B
    C --> F[Done]
```

---

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Vault

    User->>App: Open file
    App->>Vault: Read file content
    Vault-->>App: Return content
    App-->>User: Display in editor
    User->>App: Edit & save (Ctrl+S)
    App->>Vault: Write to disk
    Vault-->>App: Saved
    App-->>User: Tab dot disappears
```

---

## Gantt Chart

```mermaid
gantt
    title Nodepad Build Phases
    dateFormat  YYYY-MM-DD
    section Phase 4
    Mermaid Plugin     :done,    p1, 2024-01-01, 7d
    Timeline Plugin    :done,    p2, after p1, 7d
    Mindmap Plugin     :done,    p3, after p2, 7d
    Graph View Plugin  :done,    p4, after p3, 7d
    section Phase 5
    Electron Wrapper   :active,  p5, after p4, 14d
    section Phase 6
    Mobile (Capacitor) :         p6, after p5, 14d
```

---

## Class Diagram

```mermaid
classDiagram
    class Plugin {
        +string id
        +string name
        +string version
        +Permission[] permissions
        +onLoad(app)
        +onUnload()
    }
    class App {
        +readFile(path)
        +writeFile(path, content)
        +listFiles()
        +openModal(content)
        +addSidebarIcon(icon, title, onClick)
        +onFileSave(cb)
    }
    Plugin --> App : uses
```

---

## Entity Relationship

```mermaid
erDiagram
    VAULT ||--o{ FILE : contains
    FILE ||--o{ SNAPSHOT : has
    FILE ||--o{ WIKILINK : references
    WIKILINK }o--|| FILE : points-to
    SNAPSHOT {
        string id
        string fileId
        string content
        number timestamp
    }
```

---

## Pie Chart

```mermaid
pie title Nodepad Tech Stack
    "CodeMirror 6" : 30
    "D3.js" : 20
    "Mermaid.js" : 15
    "Fuse.js" : 10
    "idb-keyval" : 10
    "Vite + TypeScript" : 15
```
