"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Mail, User, Calendar, MessageSquare } from 'lucide-react';

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export default function AdminContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/contact');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== id));
      } else {
        alert('Failed to delete message');
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Contact Messages</h1>
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contact Messages</h1>
        <div className="text-sm text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {messages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white/5 rounded-xl border border-white/10"
        >
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Messages Yet</h3>
          <p className="text-gray-400">
            Contact form submissions will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{message.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {message.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDelete(message.id)}
                  disabled={deleting === message.id}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete message"
                >
                  {deleting === message.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-300">Message:</span>
                </div>
                <p className="text-gray-200 leading-relaxed pl-6">
                  {message.message}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href={`mailto:${message.email}?subject=Re: Contact from ${message.name}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Reply via Email
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
