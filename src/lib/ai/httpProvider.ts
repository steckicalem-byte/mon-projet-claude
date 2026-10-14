import type { AIMessage, AIProvider, StudyTask } from './types';

/**
 * Fournisseur relié à VOTRE backend (ex. fonction serverless) qui appelle
 * le fournisseur d'IA de votre choix. La clé API reste côté serveur.
 *
 * Contrat attendu :
 *   POST {baseUrl}/chat      body: { messages: AIMessage[] }               → { reply: string }
 *   POST {baseUrl}/generate  body: { task: StudyTask, text: string }        → { reply: string }
 */
export function createHttpProvider(baseUrl: string): AIProvider {
  const url = baseUrl.replace(/\/+$/, '');

  async function post(path: string, body: unknown): Promise<string> {
    const res = await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Le serveur IA a répondu ${res.status}`);
    const data = (await res.json()) as { reply?: unknown };
    if (typeof data.reply !== 'string') throw new Error('Réponse du serveur IA invalide');
    return data.reply;
  }

  return {
    id: 'http',
    label: 'IA connectée',
    isDemo: false,
    chat: (messages: AIMessage[]) => post('/chat', { messages }),
    generate: (task: StudyTask, text: string) => post('/generate', { task, text }),
  };
}
