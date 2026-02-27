import type { SandboxTemplate } from "../types";

const BUILTIN_TEMPLATES: SandboxTemplate[] = [
  {
    id: "base",
    name: "Base",
    description: "Ubuntu 22.04 with Python 3.12, Node 22, and common tools",
    image: "ghcr.io/openplane/sandbox-base:latest",
    languages: ["python", "javascript", "bash"],
    preInstalledPackages: ["python3", "node", "git", "curl", "jq"],
  },
  {
    id: "python",
    name: "Python",
    description: "Python 3.12 with pip, virtualenv, and scientific libraries",
    image: "ghcr.io/openplane/sandbox-python:latest",
    languages: ["python", "bash"],
    preInstalledPackages: [
      "python3",
      "pip",
      "virtualenv",
      "numpy",
      "pandas",
      "requests",
    ],
  },
  {
    id: "node",
    name: "Node.js",
    description: "Node.js 22 with npm, TypeScript, and common packages",
    image: "ghcr.io/openplane/sandbox-node:latest",
    languages: ["javascript", "bash"],
    preInstalledPackages: ["node", "npm", "typescript", "tsx"],
  },
  {
    id: "data-science",
    name: "Data Science",
    description:
      "Python with pandas, numpy, matplotlib, scikit-learn, and Jupyter",
    image: "ghcr.io/openplane/sandbox-data-science:latest",
    languages: ["python", "bash"],
    preInstalledPackages: [
      "python3",
      "jupyter",
      "pandas",
      "numpy",
      "matplotlib",
      "scikit-learn",
      "seaborn",
    ],
  },
  {
    id: "browser",
    name: "Browser",
    description: "Playwright with Chromium for web scraping and testing",
    image: "ghcr.io/openplane/sandbox-browser:latest",
    languages: ["python", "javascript", "bash"],
    preInstalledPackages: ["playwright", "chromium", "node", "python3"],
  },
  {
    id: "full",
    name: "Full Stack",
    description: "Everything: Python, Node, Go, Playwright, Jupyter, and more",
    image: "ghcr.io/openplane/sandbox-full:latest",
    languages: ["python", "javascript", "bash"],
    preInstalledPackages: [
      "python3",
      "node",
      "go",
      "playwright",
      "jupyter",
      "git",
      "docker-cli",
    ],
  },
];

const customTemplates = new Map<string, SandboxTemplate>();

export function getTemplate(id: string): SandboxTemplate | undefined {
  return customTemplates.get(id) ?? BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function listTemplates(): SandboxTemplate[] {
  return [...BUILTIN_TEMPLATES, ...customTemplates.values()];
}

export function registerTemplate(template: SandboxTemplate): void {
  customTemplates.set(template.id, template);
}

export function removeTemplate(id: string): boolean {
  return customTemplates.delete(id);
}
