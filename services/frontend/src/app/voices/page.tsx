'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Play, Pause, Plus, Mic2, Upload } from 'lucide-react';
import { voicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Voice } from '@/types';

const FILTERS = ['All', 'ElevenLabs', 'Cartesia', 'OpenAI', 'Sarvam', 'Custom'];
const LANGUAGE_FILTERS = ['All', 'English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Chinese'];

export default function VoiceLibraryPage() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('All');
  const [lang, setLang] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ['voices'],
    queryFn: () => voicesApi.list().then(r => r.data?.voices ?? []),
    placeholderData: [],
  });

  const filtered = (voices as Voice[]).filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (provider !== 'All' && v.provider !== provider) return false;
    if (lang !== 'All' && v.language && !v.language.toLowerCase().includes(lang.toLowerCase())) return false;
    return true;
  });

  const togglePlay = async (voice: Voice) => {
    if (playingId === voice.voice_id) { setPlayingId(null); return; }
    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      setPlayingId(voice.voice_id);
    }
  };

  return (
    <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Voice Library</h1>
            <p className="text-sm text-white/45 mt-0.5">{filtered.length} voices available</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-3.5 w-3.5" /> Clone Voice
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" /> Add Custom Voice
            </Button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search voices..."
              className="h-8 w-56 bg-white/5 border border-white/10 rounded-md pl-8 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setProvider(f)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  provider === f ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25' : 'bg-white/5 text-white/45 border border-white/8 hover:border-white/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-white/25">
              <Mic2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No voices found</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(voice => (
              <div key={voice.voice_id} className="tn-card tn-card-hover p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#00D4FF] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {voice.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{voice.name}</p>
                    <p className="text-xs text-white/40">{voice.provider}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {voice.gender && <Badge variant="draft">{voice.gender}</Badge>}
                  {voice.language && <Badge variant="cyan">{voice.language}</Badge>}
                  {voice.is_custom && <Badge variant="purple">Custom</Badge>}
                </div>

                {voice.tags?.map(tag => (
                  <Badge key={tag} variant="draft" className="text-[10px]">{tag}</Badge>
                ))}

                <button
                  onClick={() => togglePlay(voice)}
                  className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-md border border-white/10 text-xs text-white/60 hover:text-white/90 hover:bg-white/6 transition-all"
                >
                  {playingId === voice.voice_id
                    ? <><Pause className="h-3.5 w-3.5" /> Stop preview</>
                    : <><Play className="h-3.5 w-3.5" /> Preview voice</>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
