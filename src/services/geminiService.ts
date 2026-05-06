import { auth } from '../lib/firebase';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function getBettingInsights(message: string, history: ChatMessage[] = [], oddsData?: any, mode?: string | null) {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ message, history, oddsData, mode })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text || "Direct feed interruption. Please re-query.";
  } catch (error) {
    console.error("Baseline Error:", error);
    return "The data feed is temporarily unavailable. Terminal synchronization in progress.";
  }
}
