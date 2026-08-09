// apps/client/src/components/ShareDialog.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Copy, Check, Trash2, Loader2, Link } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Badge }  from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { boardApi } from '@/api/board.api';
import { useAuthStore } from '@/store/auth.store';
import type { BoardRole } from '@/types';

interface Props {
  boardId:  string;
  open:     boolean;
  onClose:  () => void;
  myRole:   BoardRole;
}

const ROLE_COLORS: Record<string, string> = {
  owner:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  editor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export const ShareDialog = ({ boardId, open, onClose, myRole }: Props) => {
  const queryClient    = useQueryClient();
  const { user }       = useAuthStore();
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState<'editor' | 'viewer'>('editor');
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState('');

  // fetch current members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn:  () => boardApi.getMembers(boardId).then((r) => r.data.members),
    enabled:  open,
  });

  const inviteMutation = useMutation({
    mutationFn: () => boardApi.inviteMember(boardId, { email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
      setEmail('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to invite user');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => boardApi.removeMember(boardId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
    },
  });

  const handleInvite = () => {
    if (!email.trim()) return;
    setError('');
    inviteMutation.mutate();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = myRole === 'owner';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Share board
          </DialogTitle>
        </DialogHeader>

        {/* Copy link */}
        <div className="flex items-center gap-2 p-3 bg-slate-700/40 rounded-lg border border-slate-600/50">
          <Link className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-400 flex-1 truncate">
            {window.location.href}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            className="h-7 text-slate-400 hover:text-white flex-shrink-0"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-400" />
              : <Copy className="w-3.5 h-3.5" />
            }
          </Button>
        </div>

        {/* Invite form — only owners/editors can invite */}
        {isOwner && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 font-medium">Invite people</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 flex-1"
              />
              {/* Role selector */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                className="bg-slate-700/50 border border-slate-600 text-white text-sm rounded-lg px-2 focus:outline-none focus:border-blue-500"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <Button
              onClick={handleInvite}
              disabled={!email.trim() || inviteMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              {inviteMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inviting...</>
                : 'Send invite'
              }
            </Button>
          </div>
        )}

        <div className="h-px bg-slate-700/50" />

        {/* Members list */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400 font-medium">
            People with access
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {membersData?.map((member: any) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-slate-600 text-white text-xs">
                      {member.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {member.userId === user?.id ? 'You' : member.userId}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs capitalize flex-shrink-0 ${ROLE_COLORS[member.role]}`}
                  >
                    {member.role}
                  </Badge>

                  {/* Remove button — owners can remove non-owners */}
                  {isOwner && member.role !== 'owner' && member.userId !== user?.id && (
                    <button
                      onClick={() => removeMutation.mutate(member.userId)}
                      className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role explanation */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700/30 rounded-lg p-2 space-y-0.5">
            <p className="text-blue-300 font-medium">Editor</p>
            <p className="text-slate-400">Can draw and edit elements</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2 space-y-0.5">
            <p className="text-slate-300 font-medium">Viewer</p>
            <p className="text-slate-400">Can only view the board</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};