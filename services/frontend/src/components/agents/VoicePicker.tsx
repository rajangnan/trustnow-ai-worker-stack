'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Play, Pause, Check, SlidersHorizontal } from 'lucide-react';
import { voicesApi } from '@/lib/api';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { Voice } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedVoiceId?: string;
  onSelect: (voice: Voice) => void;
}

const PROVIDERS = ['All', 'ElevenLabs', 'Cartesia', 'OpenAI', 'Sarvam', 'Custom'];
const LANGUAGES = ['All Languages', 'English', 'Hindi', 'Spanish', 'French', 'Arabic'];
const GENDERS = ['All', 'Male', 'Female', 'Neutral'];

export function VoicePicker({ open, onClose, selectedVoiceId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('All');
  const [language, setLanguage] = useState('All Languages');
  const [gender, setGender] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ['voices', { provider, language, gender }],
    queryFn: () => voicesApi.list({ provider: provider !== 'All' ? provider : undefined }).then(r => r.data?.voices ?? []),
    placeholderData: [],
  });

  const filtered = (voices as Voice[]).filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (provider !== 'All' && v.provider !== provider) return false;
    if (language !== 'All Languages' && v.language && !v.language.toLowerCase().includes(language.toLowerCase())) return false;
    if (gender !== 'All' && v.gender?.toLowerCase() !== gender.toLowerCase()) return false;
    return true;
  });

  const togglePlay = async (voice: Voice) => {
    if (playingId === voice.voice_id) {
      audioEl?.pause();
      setPlayingId(null);
      setAudioEl(null);
      return;
    }
    if (audioEl) { audioEl.pause(); }

    try {
      const { data } = await voicesApi.preview(voice.voice_id, 'Hello! This is a sample of my voice. How do I sound?');
      if (data?.preview_url || voice.preview_url) {
        const audio = new Audio(data?.preview_url ?? voice.preview_url);
        audio.onended = () => setPlayingId(null);
        await audio.play();
        setAudioEl(audio);
        setPlayingId(voice.voice_id);
      }
    } catch { }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent title="Voice Library">
        <div className="flex flex-col h-full p-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search voices..."
              className="h-8 w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {PROVIDERS.map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                  provider === p ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25' : 'bg-white/5 text-white/45 border border-white/8 hover:border-white/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GENDERS.map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                  gender === g ? 'bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/25' : 'bg-white/5 text-white/45 border border-white/8 hover:border-white/20'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Voice list */}
          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-white/25 text-sm">
                No voices found
              </div>
            )}
            {filtered.map(voice => (
              <div
                key={voice.voice_id}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 cursor-pointer transition-all group ${
                  selectedVoiceId === voice.voice_id
                    ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/25'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => { onSelect(voice); onClose(); }}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#00D4FF] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {voice.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-white/85 font-medium">{voice.name}</span>
                    {voice.is_custom && <Badge variant="purple">Custom</Badge>}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {voice.provider}
                    {voice.gender && ` · ${voice.gender}`}
                    {voice.language && ` · ${voice.language}`}
                  </p>
                </div>

                {/* Play button */}
                <button
                  onClick={e => { e.stopPropagation(); togglePlay(voice); }}
                  className="p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
                >
                  {playingId === voice.voice_id
                    ? <Pause className="h-3.5 w-3.5" />
                    : <Play className="h-3.5 w-3.5" />
                  }
                </button>

                {selectedVoiceId === voice.voice_id && (
                  <Check className="h-4 w-4 text-[#00D4FF] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
