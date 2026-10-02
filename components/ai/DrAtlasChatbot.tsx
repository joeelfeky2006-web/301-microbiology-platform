'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Loader2,
  HelpCircle,
  Stethoscope,
  ChevronDown,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';
import { authenticatedHeaders } from '@/lib/authHeaders';
import AiDisclaimer from '@/components/ai/AiDisclaimer';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Explain CSF findings in Bacterial vs Viral Meningitis',
  'Differentiate E. coli vs Proteus mirabilis in UTIs',
  'Primary Syphilis chancre vs Chancroid (H. ducreyi)',
  'High-yield OSPE Gram Stain & Culture Media rules',
];

export default function DrAtlasChatbot({ embedded = false }: { embedded?: boolean }) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: "Hello! I'm **Dr. Atlas**, your personal AI Microbiology & Infectious Diseases Tutor for **MedAtlas Egypt (Micro 301)**. \n\nAsk me anything about **Central Nervous System (CNS)**, **Urinary System (URS)**, or **Reproductive System (REP)** microbiology, differential diagnoses, or exam prep!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for Gemini
      const apiHistory = newHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({
          message: textToSend,
          history: apiHistory.slice(0, -1), // previous turns
          taskComplexity: textToSend.length > 120 ? 'complex' : 'general',
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "I'm reviewing your clinical query. Please try asking again.";

      const aiMessage: Message = {
        id: 'msg-ai-' + Date.now(),
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: 'msg-err-' + Date.now(),
        role: 'model',
        text: 'Sorry, I encountered a temporary connection issue. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: 'Conversation reset. How can I help you with Micro 301 today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Ultra-compact edge pill if student dismissed the main floating button
  if (isDismissed && !embedded && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsDismissed(false);
          setIsOpen(true);
        }}
        aria-label="Restore Dr. Atlas AI Tutor"
        title="Open Dr. Atlas AI Tutor"
        className="fixed bottom-4 right-3 z-40 flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-600/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-3 w-3 text-cyan-300" />
        <span>AI Tutor</span>
      </button>
    );
  }

  // Render floating button if closed and not embedded
  if (!isOpen && !embedded) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex items-center rounded-full shadow-lg shadow-blue-500/25 sm:bottom-6 sm:right-6 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Dr. Atlas AI Tutor"
          className="flex items-center gap-2 rounded-l-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 py-2.5 pl-3.5 pr-2.5 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Stethoscope className="h-3.5 w-3.5" />
          </span>
          <span>Ask AI Tutor</span>
          <span className="rounded-full bg-cyan-400 px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-950">
            301
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          title="Dismiss / hide to view features behind"
          aria-label="Hide AI Tutor button"
          className="flex h-[38px] w-7 items-center justify-center rounded-r-full bg-indigo-700 text-white/80 hover:bg-indigo-800 hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {!embedded && isOpen && !isMinimized && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] sm:hidden"
          aria-hidden="true"
        />
      )}
      <div
        className={
          embedded
            ? 'w-full'
            : `fixed bottom-4 right-4 z-50 w-[94vw] max-w-md sm:bottom-6 sm:right-6 transition-all duration-300 ${
                isMinimized ? 'h-14' : 'h-[580px] max-h-[85vh]'
              }`
        }
      >
        <div
          className={`${cardClass} flex h-full flex-col overflow-hidden border border-indigo-200 bg-white shadow-2xl dark:border-indigo-900/60 dark:bg-slate-900`}
        >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Stethoscope className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  Dr. Atlas AI
                </h3>
                <span className="rounded bg-cyan-400/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-cyan-300 ring-1 ring-cyan-400/30">
                  Micro 301 Tutor
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Gemini Multi-Turn Clinical Reasoning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            <button
              type="button"
              onClick={clearChat}
              title="Clear conversation"
              className="rounded p-1 hover:bg-white/10 hover:text-white transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {!embedded && (
              <>
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Expand' : 'Minimize'}
                  className="rounded p-1 hover:bg-white/10 hover:text-white transition"
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close tutor"
                  className="rounded p-1 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body content if not minimized */}
        {!isMinimized && (
          <>
            {/* Scrollable Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-3 shadow-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'border border-slate-200 bg-white text-slate-800 rounded-tl-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`mt-1 text-[9px] ${
                        msg.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white animate-pulse">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>Dr. Atlas is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="border-t border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="font-bold text-slate-400 whitespace-nowrap">Suggested:</span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Dr. Atlas about CNS, Urinary, or REP..."
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <AiDisclaimer className="mt-2 text-[10px]" />
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}
