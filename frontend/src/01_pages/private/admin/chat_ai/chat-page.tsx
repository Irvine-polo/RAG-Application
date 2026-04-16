import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Database,
  Globe,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { mainInstance } from '@/07_instances/main-instance';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  source_type?: 'database' | 'web' | 'database_not_found';
  action_required?: string;
  original_query?: string;
  timestamp: Date;
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I am your AI assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await mainInstance.post('/rag/search', {
        query: newMessage.content,
        allow_web_search: false,
      });

      const data = response.data;
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        sender: 'ai',
        source_type: data.source_type,
        action_required: data.action_required,
        original_query: newMessage.content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting to the server.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleWebSearchConfirm = async (message: Message) => {
    const query = message.original_query;
    if (!query) {
      console.error('Web search confirm: original_query is missing from message', message);
      return;
    }
    setIsTyping(true);

    try {
      const response = await mainInstance.post('/rag/search', {
        query,
        allow_web_search: true,
      });

      const data = response.data;
      const updatedMessage: Message = {
        id: message.id, // replace the existing message ID to overwrite it
        content: data.answer,
        sender: 'ai',
        source_type: data.source_type,
        timestamp: new Date(),
      };

      // Map over messages and replace the confirm prompt with the actual answer
      setMessages(prev =>
        prev.map(m => (m.id === message.id ? updatedMessage : m)),
      );
    } catch (error) {
      console.error('Web search error:', error);
      // Replace with error
      setMessages(prev =>
        prev.map(m =>
          m.id === message.id
            ? {
                ...m,
                content:
                  "Sorry, I'm having trouble connecting to the Web Search.",
                action_required: undefined,
              }
            : m,
        ),
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      {/* Header */}
      <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
            <Sparkles size={20} />
            <span className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-green-500 dark:border-slate-900"></span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              AI Assistant
            </h1>
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>{' '}
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <button className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <Search size={18} />
          </button>
          <button className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 space-y-6 overflow-y-auto scroll-smooth px-10 py-6">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out`}
          >
            <div
              className={`flex max-w-[85%] gap-3 sm:max-w-[75%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {message.sender === 'ai' && (
                <div className="mt-auto mb-5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`flex flex-col gap-1.5 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`group relative rounded-2xl px-5 py-3.5 shadow-sm ${
                    message.sender === 'user'
                      ? 'rounded-br-sm bg-indigo-600 text-white'
                      : 'rounded-bl-sm border border-slate-100 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1.5 text-[11px] font-medium text-slate-400 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <span>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {message.sender === 'ai' && message.source_type && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      {message.source_type === 'web' ? (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Globe size={12} /> Web Search
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Database size={12} /> Knowledge Base
                        </span>
                      )}
                    </>
                  )}
                </span>
                {message.action_required === 'confirm_web_search' &&
                  message.original_query && (
                    <div className="mt-2 w-full pt-2">
                      <button
                        onClick={() => handleWebSearchConfirm(message)}
                        disabled={isTyping}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                      >
                        <Search size={16} />
                        Search the Internet Instead
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="animate-in fade-in flex w-full justify-start duration-300">
            <div className="flex max-w-[85%] flex-row gap-3 sm:max-w-[75%]">
              <div className="mt-auto mb-5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                <Bot size={16} />
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1 w-full" />
      </div>

      {/* Input Area */}
      <div className="z-10 bg-white px-10 py-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.2)]">
        <form
          onSubmit={handleSendMessage}
          className="mx-auto flex w-full max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-2 shadow-sm transition-all duration-200 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/50"
        >
          <button
            type="button"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white hover:text-slate-600 hover:shadow-sm dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Message AI assistant..."
            className="scrollbar-thin max-h-32 min-h-[44px] flex-1 resize-none self-center bg-transparent px-2 py-3 text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
            rows={1}
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </form>
        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
