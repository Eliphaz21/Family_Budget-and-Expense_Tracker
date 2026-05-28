import React, { useState } from 'react';
import { Comment, FamilyUser } from '../types';
import { MessageSquare, BadgeAlert, Coins, User } from 'lucide-react';

interface CommentsBoardProps {
  comments: Comment[];
  currentUser: FamilyUser | null;
  onPostComment: (type: 'comment' | 'request' | 'contribution', text: string) => void;
}

export default function CommentsBoard({ comments, currentUser, onPostComment }: CommentsBoardProps) {
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'request' | 'contribution'>('comment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onPostComment(commentType, commentText.trim());
    setCommentText('');
  };

  const getCommentBadge = (type: 'comment' | 'request' | 'contribution') => {
    switch (type) {
      case 'contribution':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
            <Coins className="w-2.5 h-2.5" /> Credit Added
          </span>
        );
      case 'request':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wider">
            <BadgeAlert className="w-2.5 h-2.5" /> Request
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-700 border border-slate-100 uppercase tracking-wider">
            <MessageSquare className="w-2.5 h-2.5" /> Conversation
          </span>
        );
    }
  };

  const getCommentBg = (type: 'comment' | 'request' | 'contribution') => {
    switch (type) {
      case 'contribution':
        return 'bg-emerald-50/20 border-emerald-100';
      case 'request':
        return 'bg-rose-50/20 border-rose-100';
      default:
        return 'bg-slate-50/40 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-blue-600 rounded"></span>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Family Board Stream
            </h3>
            <p className="text-[10px] text-slate-400">Post notifications & cost updates</p>
          </div>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
          {comments.length} Posts
        </span>
      </div>

      {/* Message List */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-[11px] text-slate-400">Board stream is empty. Kick off the conversation!</p>
          </div>
        ) : (
          comments.map((com) => (
            <div
              key={com.id}
              className={`p-3 border rounded-lg space-y-1.5 transition-all hover:bg-slate-50/40 ${getCommentBg(com.type)}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-full bg-white border border-slate-200 shadow-xs shrink-0">
                    <User className="w-3 h-3 text-slate-500" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block">
                      {com.authorName}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      {new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(com.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                {getCommentBadge(com.type)}
              </div>
              <p className="text-xs text-slate-700 leading-normal font-sans">
                {com.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Post Board Comment Form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 pt-3 space-y-2.5 animate-fade-in">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCommentType('comment')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                commentType === 'comment'
                  ? 'bg-slate-850 text-white border border-slate-850'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              💭 Simple Comment
            </button>
            <button
              type="button"
              onClick={() => setCommentType('request')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                commentType === 'request'
                  ? 'bg-rose-650 text-white border border-rose-650'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              🛑 Money Request
            </button>
            <button
              type="button"
              onClick={() => setCommentType('contribution')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                commentType === 'contribution'
                  ? 'bg-emerald-650 text-white border border-emerald-650'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              💰 Cash Topoff
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                commentType === 'request'
                  ? "Describe amount needed, e.g. Sister: water costs 1200 Birr"
                  : commentType === 'contribution'
                  ? "Describe allocation, e.g. Father Abebe: topoff 4000 Birr"
                  : "Type household comment message..."
              }
              className="flex-1 text-slate-850 bg-white text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 shadow-xs"
            />
            <button
              type="submit"
              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-[11px] text-slate-400 font-medium">
          Select individual profile to unlock posting logs.
        </div>
      )}
    </div>
  );
}
