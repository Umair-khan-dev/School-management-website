import { useState } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';
import { apiRequest } from '../services/api';

export function AiAssistant() {
  const [prompt, setPrompt] = useState('Show me the current school record summary.');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Please enter a question for the assistant.');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const result = await apiRequest<{ success: boolean; answer?: string; message?: string }>(
        '/ai/ask',
        {
          method: 'POST',
          body: JSON.stringify({ prompt: trimmed }),
        }
      );

      if (!result.success) {
        throw new Error(result.message || 'Unable to fetch the current record summary.');
      }

      setAnswer(result.answer || 'No answer returned.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch record summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-violet-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Suffah School AI Assistant</p>
            <p className="text-[11px] text-slate-500">Ask about students, teachers, fees, and school records</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-semibold text-pink-700">
          <Sparkles className="h-3 w-3" />
          Live records
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Prompt
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Show me the fee status for the school."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </form>

      {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {answer && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-700 shadow-inner">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Assistant response</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">{answer}</pre>
        </div>
      )}
    </div>
  );
}
