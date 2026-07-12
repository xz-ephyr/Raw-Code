// Backward-compat re-export — delegates to the connector registry singleton
import { registry } from './connectors/registry.js';
import type { GmailConnectorService } from './connectors/gmail.js';

function getGmail(): GmailConnectorService {
  return registry.get('gmail') as GmailConnectorService;
}

export async function getAuthUrl(
  clientId?: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
  state?: string
): Promise<string> {
  return getGmail().getAuthUrl({ clientId, codeChallenge, codeChallengeMethod, state });
}

export async function exchangeCode(code: string, codeVerifier: string | null): Promise<{ email: string }> {
  const result = await getGmail().exchangeCode(code, codeVerifier);
  return { email: result.identity };
}

export async function listMessages(queryStr?: string, maxResults?: number) {
  return getGmail().listMessages(queryStr, maxResults);
}

export async function getMessage(messageId: string) {
  return getGmail().getMessage(messageId);
}

export async function sendMessage(to: string, subject: string, body: string) {
  return getGmail().sendMessage(to, subject, body);
}

export async function isConnected(): Promise<boolean> {
  const status = await getGmail().getStatus();
  return status.connected;
}

export async function disconnect() {
  return getGmail().disconnect();
}

export async function getEmail(): Promise<string | null> {
  const status = await getGmail().getStatus();
  return status.identity;
}
