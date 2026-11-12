# PLTS Rooftop Maintenance Documentation System

Web-based field documentation and reporting application for solar rooftop photovoltaic (PLTS Rooftop) maintenance operations. Generates official Word (.docx) inspection deliverables directly from structured in-browser data.

## System Overview

The system automates multi-phase field inspections, standardizes image framing, verifies electrical performance against Standard Test Conditions (STC), and provides disk-backed persistence via a lightweight PHP JSON backend.

### Key Capabilities

- **Phase-Guided Workflow**: Separates inspection into structured stages:
  - Phase II.I: Initial physical condition check and 45-item hardware checklist.
  - Phase II.II: Pre-cleaning electrical parameter measurements (DC Vmp/Imp, 3-phase AC, grounding).
  - Phase II.III: Solar panel washing and thermal imaging verification.
  - Phase II.IV: Post-cleaning electrical measurements and performance comparison.
  - Section V: Auto-calculated theoretical STC deviation formulas `((STC - MEAS) / STC) * 100` and datasheet validation.
  - Section VI & VII: Component damage inventory, actionable recommendations, and narrative summaries.
- **3:4 Aspect Ratio Enforcement**: Dedicated camera modal and gesture controls (drag-to-pan, double-tap letterbox fit) ensuring strict image proportions for document templates.
- **Payload Optimization**: Discrete image asset handling decoupling binary image files from JSON document metadata.
- **OpenXML Generation**: Direct client-side DOCX compilation preserving government formatting standards, tables, and fallback placeholders (`pl.jpg`).
- **Team Synchronization**: Quick-copy summary tools formatting uncompleted fields and missing photos for field dispatch messaging.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite.
- **Archive & Processing**: JSZip for OpenXML file mutation, HTML5 Canvas API for client-side image processing.
- **Backend / Storage**: PHP 8.0+ JSON file store and discrete file upload API (`public/api/reports.php`).
- **Runtime / Package Management**: Bun.

## Getting Started

### Prerequisites

- Bun runtime
- PHP 8.0 or newer

### Installation

```bash
bun install
```

### Running Locally

To run both the backend server and frontend development server simultaneously:

```batch
run.bat
```

Or manually in separate terminals:

1. **Start Backend API Server**:
   ```bash
   php -S 127.0.0.1:8000 -t public/
   ```

2. **Start Frontend Dev Server**:
   ```bash
   bun run dev --port 3000
   ```

Open `http://localhost:3000` in a web browser.

### Production Build

```bash
bun run build
```

Compiled static assets are placed in `dist/`.

## Project Structure

```text
myapp/
├── public/
│   ├── api/reports.php       # PHP REST endpoint for reports and image uploads
│   ├── data/reports/         # JSON document saves and image storage
│   ├── pl.jpg                # Missing image fallback graphic
│   └── template.docx         # Canonical OpenXML maintenance template
├── src/
│   ├── components/
│   │   ├── common/           # Header, PhotoCard, CameraModal, tables, modals
│   │   ├── layout/           # Phase navigation and workflow hubs
│   │   └── phases/           # Phase-specific views (GeneralInfo, Measure, etc.)
│   ├── constants/            # Photo slot catalogs and initial datasets
│   ├── context/              # State management and API persistence adapters
│   ├── lib/                  # DOCX engine, calculations, date & image utils
│   └── types/                # System schema and data contract definitions
└── run.bat                   # Simultaneous PHP + Vite launch script# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
