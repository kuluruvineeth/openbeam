import { describe, expect, it } from "bun:test";
import { validateCode } from "../code-generation";

describe("validateCode", () => {
  describe("shell execution detection", () => {
    it("detects subprocess.call", () => {
      const code = `
import subprocess
subprocess.call(["ls", "-la"])
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(false);
      expect(result.severity).toBe("dangerous");
      expect(result.issues.some((i) => i.type === "shell_execution")).toBe(
        true
      );
    });

    it("detects os.system", () => {
      const code = `
import os
os.system("rm -rf /")
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "shell_execution")).toBe(
        true
      );
    });

    it("detects child_process in JavaScript", () => {
      const code = `
const { exec } = require('child_process');
exec('ls -la', (error, stdout) => console.log(stdout));
      `;
      const result = validateCode(code, "javascript");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "shell_execution")).toBe(
        true
      );
    });
  });

  describe("network access detection", () => {
    it("detects requests library", () => {
      const code = `
import requests
response = requests.get("https://example.com")
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "network_access")).toBe(true);
      expect(result.severity).toBe("warning");
    });

    it("detects fetch in JavaScript", () => {
      const code = `
fetch("https://example.com")
  .then(r => r.json())
      `;
      const result = validateCode(code, "javascript");

      expect(result.issues.some((i) => i.type === "network_access")).toBe(true);
    });

    it("detects socket usage", () => {
      const code = `
import socket
s = socket.socket()
s.connect(("example.com", 80))
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "network_access")).toBe(true);
    });
  });

  describe("file system access detection", () => {
    it("detects file write in Python", () => {
      const code = `
with open("file.txt", "w") as f:
    f.write("data")
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "file_system_access")).toBe(
        true
      );
    });

    it("detects fs.writeFile in JavaScript", () => {
      const code = `
const fs = require('fs');
fs.writeFile('file.txt', 'data', () => {});
      `;
      const result = validateCode(code, "javascript");

      expect(result.issues.some((i) => i.type === "file_system_access")).toBe(
        true
      );
    });

    it("detects shutil.rmtree", () => {
      const code = `
import shutil
shutil.rmtree("/important")
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "file_system_access")).toBe(
        true
      );
    });
  });

  describe("environment access detection", () => {
    it("detects os.environ", () => {
      const code = `
import os
secret = os.environ["API_KEY"]
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "environment_access")).toBe(
        true
      );
    });

    it("detects process.env", () => {
      const code = `
const key = process.env.API_KEY;
      `;
      const result = validateCode(code, "javascript");

      expect(result.issues.some((i) => i.type === "environment_access")).toBe(
        true
      );
    });
  });

  describe("dangerous import detection", () => {
    it("detects ctypes import", () => {
      const code = `
import ctypes
ctypes.CDLL("libc.so.6")
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "dangerous_import")).toBe(
        true
      );
    });

    it("detects eval usage", () => {
      const code = `
eval("console.log('hacked')")
      `;
      const result = validateCode(code, "javascript");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "dangerous_import")).toBe(
        true
      );
    });

    it("detects pickle import", () => {
      const code = `
import pickle
pickle.loads(data)
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "dangerous_import")).toBe(
        true
      );
    });
  });

  describe("infinite loop detection", () => {
    it("detects while True", () => {
      const code = `
while True:
    pass
      `;
      const result = validateCode(code, "python");

      expect(result.issues.some((i) => i.type === "infinite_loop")).toBe(true);
    });

    it("detects while(true) in JavaScript", () => {
      const code = `
while(true) {
    console.log("forever");
}
      `;
      const result = validateCode(code, "javascript");

      expect(result.issues.some((i) => i.type === "infinite_loop")).toBe(true);
    });

    it("detects for(;;)", () => {
      const code = `
for(;;) {
    console.log("infinite");
}
      `;
      const result = validateCode(code, "javascript");

      expect(result.issues.some((i) => i.type === "infinite_loop")).toBe(true);
    });
  });

  describe("safe code", () => {
    it("accepts simple math", () => {
      const code = `
def add(a, b):
    return a + b

print(add(1, 2))
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(true);
      expect(result.severity).toBe("safe");
      expect(result.issues).toHaveLength(0);
    });

    it("accepts pure functions", () => {
      const code = `
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
      `;
      const result = validateCode(code, "javascript");

      expect(result.valid).toBe(true);
      expect(result.severity).toBe("safe");
    });

    it("accepts file reading", () => {
      const code = `
with open("data.txt", "r") as f:
    content = f.read()
print(content)
      `;
      const result = validateCode(code, "python");

      expect(result.valid).toBe(true);
    });
  });

  describe("code length validation", () => {
    it("rejects excessively long code", () => {
      const code = "x = 1\n".repeat(20_000);
      const result = validateCode(code, "python");

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === "excessive_memory")).toBe(
        true
      );
    });
  });

  describe("line number tracking", () => {
    it("reports correct line numbers", () => {
      const code = `line1
line2
import subprocess
subprocess.call(["ls"])
line5`;
      const result = validateCode(code, "python");

      const shellIssue = result.issues.find(
        (i) => i.type === "shell_execution"
      );
      expect(shellIssue?.line).toBe(4);
    });
  });

  describe("severity classification", () => {
    it("marks dangerous when errors present", () => {
      const code = `eval("bad")`;
      const result = validateCode(code, "javascript");

      expect(result.severity).toBe("dangerous");
    });

    it("marks warning when only warnings present", () => {
      const code = `fetch("https://example.com")`;
      const result = validateCode(code, "javascript");

      expect(result.severity).toBe("warning");
    });

    it("marks safe when no issues", () => {
      const code = `console.log("hello")`;
      const result = validateCode(code, "javascript");

      expect(result.severity).toBe("safe");
    });
  });
});
