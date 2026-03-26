const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.openbeam.work";

export function generateCurlSnippet(slug: string, apiKey: string): string {
  return `curl -X POST "${BASE_URL}/v1/custom/${slug}/push" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documents": [
      {
        "id": "doc-001",
        "title": "My Document",
        "content": "Document content here",
        "url": "https://example.com/doc-001",
        "metadata": {
          "source": "internal-wiki",
          "author": "Jane Doe"
        }
      }
    ]
  }'`;
}

export function generatePythonSnippet(slug: string, apiKey: string): string {
  return `import requests

response = requests.post(
    "${BASE_URL}/v1/custom/${slug}/push",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "documents": [
            {
                "id": "doc-001",
                "title": "My Document",
                "content": "Document content here",
                "url": "https://example.com/doc-001",
                "metadata": {
                    "source": "internal-wiki",
                    "author": "Jane Doe",
                },
            }
        ]
    },
)

print(response.json())`;
}

export function generateNodeSnippet(slug: string, apiKey: string): string {
  return `const response = await fetch(
  "${BASE_URL}/v1/custom/${slug}/push",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer ${apiKey}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documents: [
        {
          id: "doc-001",
          title: "My Document",
          content: "Document content here",
          url: "https://example.com/doc-001",
          metadata: {
            source: "internal-wiki",
            author: "Jane Doe",
          },
        },
      ],
    }),
  }
);

const data = await response.json();
console.log(data);`;
}

export function generateWebhookUrl(slug: string): string {
  return `${BASE_URL}/v1/custom/${slug}/webhook`;
}

export function generatePushUrl(slug: string): string {
  return `${BASE_URL}/v1/custom/${slug}/push`;
}
