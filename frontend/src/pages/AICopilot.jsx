import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { 
  FiSend, FiMessageSquare, FiShield, FiAlertTriangle, 
  FiFileText, FiUser, FiSliders, FiCheckCircle 
} from 'react-icons/fi';
import { VscCopilot } from 'react-icons/vsc';

const AICopilot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'copilot',
      text: "Hello! I am your Enterprise Access Governance Copilot. How can I help you today? You can type requests like: 'I need access to Engineering Lab A for 3 days to test firmware prototypes.'",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // RAG and Risk metrics states for side panel
  const [activeRAG, setActiveRAG] = useState(null);
  const [activeRisk, setActiveRisk] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/copilot/chat', { message: userMessage.text });
      const data = response.data;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'copilot',
        text: data.response,
        timestamp: new Date()
      }]);

      // Set metrics for the sidebar from API response
      if (data.risk_assessment) {
        setActiveRisk(data.risk_assessment);
      }
      
      // Seed some mock RAG details for display based on entities
      setActiveRAG({
        query: userMessage.text,
        resource: data.entities?.resource || 'General Access',
        duration: data.entities?.duration_days || 1,
        reason: data.entities?.reason || 'Access request via AI Copilot'
      });

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to communicate with AI Copilot.');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'copilot',
        text: "Sorry, I encountered an error processing your request. Please ensure the backend server is reachable.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-200">
      {/* Brand Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <VscCopilot className="text-blue-400 text-2xl drop-shadow-[0_0_10px_rgba(96,165,250,0.4)] animate-pulse" />
          AI Access Copilot
        </h2>
        <p className="text-xs text-gray-405 mt-1">
          Submit natural language access requests and review real-time security policy audits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat box */}
        <div className="lg:col-span-2 flex flex-col h-[600px] glass-card rounded-2xl border border-slate-800/40 shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-800/40 bg-slate-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <VscCopilot />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-200">Access Chat Assistant</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Policy Engine Online
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 border-blue-500/20 text-white shadow-[0_0_8px_rgba(37,99,235,0.3)]' 
                    : 'bg-slate-900 border-slate-800 text-gray-300'
                }`}>
                  {msg.sender === 'user' ? <FiUser /> : <VscCopilot className="text-base text-blue-400" />}
                </div>
                
                <div className={`rounded-xl p-4 text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600/90 text-white font-medium border border-blue-500/20' 
                    : msg.isError
                    ? 'bg-red-950/30 text-red-400 border border-red-500/20'
                    : 'bg-slate-950/40 text-gray-200 border border-slate-800/40'
                }`}>
                  <div className="whitespace-pre-line">
                    {msg.text}
                  </div>
                  <span className={`block text-[9px] mt-2 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <VscCopilot className="text-blue-400" />
                </div>
                <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[10px] text-gray-400">Analyzing policy compliance & calculating risk score...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs bg-red-950/30 text-red-400 border border-red-500/20 rounded-lg flex items-center gap-2">
                <FiAlertTriangle className="flex-shrink-0 text-sm" />
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-800/40 bg-slate-950/20 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={loading}
              placeholder="e.g. Request access to Engineering Lab A for 2 days to test firmware board..."
              className="flex-1 px-4 py-2 text-xs rounded-lg border border-slate-800/50 bg-slate-950/40 text-gray-250 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-[0_0_12px_rgba(37,99,235,0.3)] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              Send <FiSend />
            </button>
          </form>
        </div>

        {/* Audit sidebar */}
        <div className="space-y-6">
          {/* Active Risk Evaluation */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-gray-200 flex items-center gap-2 uppercase tracking-wider">
              <FiShield className="text-blue-400" />
              Active Risk Assessment
            </h3>
            
            {activeRisk ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Threat Score</span>
                  <span className={`text-sm font-extrabold ${activeRisk.score > 0.7 ? 'text-red-400' : activeRisk.score > 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeRisk.score * 100}%
                  </span>
                </div>
                
                {/* Risk Progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${activeRisk.score > 0.7 ? 'bg-red-500' : activeRisk.score > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${activeRisk.score * 100}%` }}
                  />
                </div>

                <div className="p-3 bg-slate-950/45 border border-slate-800 rounded-lg">
                  <p className="text-[10px] font-semibold text-gray-450 uppercase tracking-wider mb-1">Risk Description</p>
                  <p className="text-[11px] text-gray-200 leading-relaxed font-medium">
                    {activeRisk.reason}
                  </p>
                </div>

                {/* Risk factors list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-450 uppercase tracking-wider">Computed Factor Ratios</p>
                  {Object.entries(activeRisk.factors || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-[10px] border-b border-slate-850 py-1">
                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-semibold text-gray-250">{val * 100}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FiSliders className="text-3xl mx-auto mb-2 opacity-50 text-blue-400/60" />
                <p className="text-[11px]">Submit an access query in the chat window to trigger threat evaluation.</p>
              </div>
            )}
          </div>

          {/* Match Policy Document */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/40 shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-gray-200 flex items-center gap-2 uppercase tracking-wider">
              <FiFileText className="text-blue-400" />
              Retrieved Policy Context (RAG)
            </h3>
            
            {activeRAG ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-950/20 border border-blue-900/50 rounded-lg space-y-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Target Resource</p>
                  <p className="text-xs font-semibold text-gray-200">{activeRAG.resource}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-950/45 border border-slate-800 rounded-lg">
                    <p className="text-[9px] text-gray-450 uppercase tracking-wider">Duration</p>
                    <p className="text-xs font-bold text-gray-200">{activeRAG.duration} days</p>
                  </div>
                  <div className="p-2 bg-slate-950/45 border border-slate-800 rounded-lg">
                    <p className="text-[9px] text-gray-450 uppercase tracking-wider">Intent Flag</p>
                    <p className="text-xs font-bold text-gray-200">Access Request</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/45 border border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-gray-450 uppercase tracking-wider mb-1">extracted business justification</p>
                  <p className="text-[11px] text-gray-300 leading-relaxed font-mono">
                    "{activeRAG.reason}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FiFileText className="text-3xl mx-auto mb-2 opacity-50 text-blue-400/60" />
                <p className="text-[11px]">Vector database match context will display here after parsing request syntax.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICopilot;
