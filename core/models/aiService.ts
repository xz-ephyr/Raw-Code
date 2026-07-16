function redactSensitiveInfo(msg: string): string {
  return msg
    .replace(/([?&]key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/([?&]api_key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/([?&]api-key)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/x-api-key\s*:\s*\S+/gi, 'x-api-key: REDACTED')
    .replace(/Authorization\s*:\s*Bearer\s*\S+/gi, 'Authorization: Bearer REDACTED');
}

export function getAIErrorMessage(error: unknown) {
  if (error == null) return 'The AI request failed for an unknown reason.';
  let msg: string;
  if (typeof error === 'string') msg = error;
  else if (error instanceof Error) msg = error.message;
  else {
    try {
      msg = JSON.stringify(error);
    } catch {
      return 'The AI request failed and the error could not be serialized.';
    }
  }
  return redactSensitiveInfo(msg);
}

export { refreshProviders } from './providerCache';
export { generateSessionTitle } from './sessionTitle';