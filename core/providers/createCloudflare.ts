export function createCloudflare(apiKey: string, accountId: string) {
  const baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;

  const provider = (modelId: string) => ({
    modelId,
    specVersion: 'v1',
    provider: 'cloudflare',
    async doStream(messages: any[], options?: any) {
      const response = await fetch(`${baseURL}/${modelId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((m: any) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || '',
          })),
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      const data = await response.json();
      const text = data?.result?.response || '';

      return {
        stream: new ReadableStream({
          start(controller: any) {
            controller.enqueue({ type: 'text-delta', textDelta: text });
            controller.close();
          },
        }),
        rawResponse: data,
      };
    },
  });

  return provider;
}
