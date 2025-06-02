import React, { useEffect, useRef, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { AudioStreamManager } from '../services/webrtc';

interface AudioPlayerProps {
  onAudioPause?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onAudioPause }) => {
  const { isHost, roomData, roomCode } = useRoom();
  const [leftFiles, setLeftFiles] = useState<File[]>([]);
  const [rightFiles, setRightFiles] = useState<File[]>([]);
  const [masterVolume, setMasterVolume] = useState(1);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentColumn, setCurrentColumn] = useState<'left' | 'right' | null>(null);
  const [nowPlaying, setNowPlaying] = useState({ left: '', right: '' });
  const [loopMode, setLoopMode] = useState({ left: false, right: false });
  const [searchFilter, setSearchFilter] = useState({ left: '', right: '' });
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [isRemotePlaying, setIsRemotePlaying] = useState(false);

  const leftTbodyRef = useRef<HTMLTableSectionElement>(null);
  const rightTbodyRef = useRef<HTMLTableSectionElement>(null);
  const streamManagerRef = useRef<AudioStreamManager | null>(null);

  // Inizializza WebRTC quando necessario
  useEffect(() => {
    if (roomCode && isHost) {
      streamManagerRef.current = new AudioStreamManager(roomCode, true);
      streamManagerRef.current.initialize().catch(console.error);

      return () => {
        streamManagerRef.current?.stop();
      };
    }
  }, [roomCode, isHost]);

  // Funzione per fermare la riproduzione audio
  const stopAudioPlayback = () => {
    if (currentAudio) {
      // Fade out effect
      const fadeOut = setInterval(() => {
        if (currentAudio && currentAudio.volume > 0.1) {
          currentAudio.volume = Math.max(0, currentAudio.volume - 0.1);
        } else {
          if (currentAudio) {
            currentAudio.pause();
            currentAudio.volume = masterVolume;
          }
          clearInterval(fadeOut);
        }
      }, 50);
    }
    setCurrentAudio(null);
    setNowPlaying({ left: '', right: '' });
    if (onAudioPause) onAudioPause();
  };

  // Esponi la funzione di pausa globalmente
  useEffect(() => {
    window.pauseAudioPlayer = stopAudioPlayback;

    return () => {
      delete window.pauseAudioPlayer;
    };
  }, [currentAudio]);

  // Ascolta i cambiamenti nel roomData per fermare l'audio quando qualcuno preme il buzz
  useEffect(() => {
    if (roomData?.winnerInfo) {
      stopAudioPlayback();
    }
  }, [roomData?.winnerInfo]);

  // Gestione stato riproduzione audio remoto per utenti non host
  useEffect(() => {
    if (!isHost) {
      const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement | null;
      if (remoteAudio) {
        const handlePlay = () => setIsRemotePlaying(true);
        const handlePause = () => setIsRemotePlaying(false);
        remoteAudio.addEventListener('play', handlePlay);
        remoteAudio.addEventListener('pause', handlePause);
        return () => {
          remoteAudio.removeEventListener('play', handlePlay);
          remoteAudio.removeEventListener('pause', handlePause);
        };
      }
    }
  }, [isHost]);

  const handleFileSelect = (column: 'left' | 'right') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.wav,.ogg';
    input.multiple = true;
    input.webkitdirectory = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
        .filter(file => /\.(mp3|wav|ogg)$/i.test(file.name));
      
      if (column === 'left') {
        setLeftFiles(files);
      } else {
        setRightFiles(files);
      }
      
      document.body.removeChild(input);
    });

    input.click();
  };

  const playAudio = (file: File, column: 'left' | 'right') => {
    if (currentAudio) {
      currentAudio.pause();
    }

    const audio = new Audio(URL.createObjectURL(file));
    audio.volume = 0; // Inizia con volume 0 per il fade in
    
    // Cattura l'audio del sistema quando viene riprodotto
    if (isHost && streamManagerRef.current) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);

      // Invia lo stream audio attraverso WebRTC
      const stream = destination.stream;
      streamManagerRef.current.setAudioStream(stream);
    }
    
    audio.onended = () => {
      if ((column === 'left' && loopMode.left) || (column === 'right' && loopMode.right)) {
        playAudio(file, column);
      } else {
        setCurrentAudio(null);
        setNowPlaying(prev => ({ ...prev, [column]: '' }));
      }
    };

    // Fade in effect
    audio.play().then(() => {
      const fadeIn = setInterval(() => {
        if (audio && audio.volume < masterVolume) {
          audio.volume = Math.min(masterVolume, audio.volume + 0.1);
        } else {
          clearInterval(fadeIn);
        }
      }, 50);
    });

    setCurrentAudio(audio);
    setCurrentColumn(column);
    setNowPlaying(prev => ({ ...prev, [column]: file.name }));
  };

  const toggleLoop = (column: 'left' | 'right') => {
    setLoopMode(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setMasterVolume(volume);
    if (currentAudio) {
      currentAudio.volume = volume;
    }
  };

  const togglePlayPause = () => {
    if (currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play();
      } else {
        currentAudio.pause();
      }
    }
  };

  const toggleMute = () => {
    if (currentAudio) {
      if (isMuted) {
        currentAudio.volume = previousVolume;
        setMasterVolume(previousVolume);
      } else {
        setPreviousVolume(masterVolume);
        currentAudio.volume = 0;
        setMasterVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  // Rendi il player visibile anche agli utenti non host, ma solo la barra fissa per loro
  if (!isHost) {
    return (
      <>
        {/* Barra di controllo fissa per utenti non host */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/20 p-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
            {isRemotePlaying ? (
              <div className="flex items-center gap-2 text-white">
                <Play className="w-6 h-6 text-green-400 animate-pulse" />
                <span>Audio in riproduzione dal padrone della stanza</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/60">
                <Pause className="w-6 h-6" />
                <span>Nessun audio in riproduzione</span>
              </div>
            )}
          </div>
        </div>
        {/* Audio element per lo stream remoto */}
        <audio
          id="remote-audio"
          autoPlay
          playsInline
          className="hidden"
        />
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-6 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Player Sx */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary">Player Sx</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFileSelect('left')}
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                >
                  Carica File
                </button>
                <button
                  onClick={() => toggleLoop('left')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    loopMode.left ? 'bg-primary text-white' : 'bg-primary/20 hover:bg-primary/30'
                  }`}
                >
                  Loop
                </button>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Cerca brani..."
              value={searchFilter.left}
              onChange={(e) => setSearchFilter(prev => ({ ...prev, left: e.target.value }))}
              className="w-full p-2 mb-4 bg-white/10 rounded-lg border border-white/20"
            />

            <div className="bg-white/5 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/10">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Titolo</th>
                    <th className="p-2 text-left">Play</th>
                  </tr>
                </thead>
                <tbody ref={leftTbodyRef}>
                  {leftFiles
                    .filter(file => file.name.toLowerCase().includes(searchFilter.left.toLowerCase()))
                    .map((file, index) => (
                      <tr key={file.name} className="hover:bg-white/10 transition-colors">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">
                          {file.name}
                          {nowPlaying.left === file.name && (
                            <span className="ml-2 px-2 py-1 bg-primary/20 rounded-full text-xs">
                              In riproduzione
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => playAudio(file, 'left')}
                            className="p-2 hover:bg-primary/20 rounded-full transition-colors"
                          >
                            ▶️
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Player Dx */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary">Player Dx</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFileSelect('right')}
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                >
                  Carica File
                </button>
                <button
                  onClick={() => toggleLoop('right')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    loopMode.right ? 'bg-primary text-white' : 'bg-primary/20 hover:bg-primary/30'
                  }`}
                >
                  Loop
                </button>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Cerca brani..."
              value={searchFilter.right}
              onChange={(e) => setSearchFilter(prev => ({ ...prev, right: e.target.value }))}
              className="w-full p-2 mb-4 bg-white/10 rounded-lg border border-white/20"
            />

            <div className="bg-white/5 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/10">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Titolo</th>
                    <th className="p-2 text-left">Play</th>
                  </tr>
                </thead>
                <tbody ref={rightTbodyRef}>
                  {rightFiles
                    .filter(file => file.name.toLowerCase().includes(searchFilter.right.toLowerCase()))
                    .map((file, index) => (
                      <tr key={file.name} className="hover:bg-white/10 transition-colors">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">
                          {file.name}
                          {nowPlaying.right === file.name && (
                            <span className="ml-2 px-2 py-1 bg-primary/20 rounded-full text-xs">
                              In riproduzione
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => playAudio(file, 'right')}
                            className="p-2 hover:bg-primary/20 rounded-full transition-colors"
                          >
                            ▶️
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Volume Control */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm">Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={masterVolume}
            onChange={handleVolumeChange}
            className="flex-1"
          />
          <span className="text-sm">{Math.round(masterVolume * 100)}%</span>
        </div>
      </div>

      {/* Barra di controllo fissa */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/20 p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              disabled={!currentAudio}
            >
              {currentAudio && !currentAudio.paused ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            <div className="flex-1">
              <div className="text-sm text-white/80 mb-1">
                {currentAudio ? (currentColumn === 'left' ? nowPlaying.left : nowPlaying.right) : 'Nessun brano in riproduzione'}
              </div>
              {currentAudio && (
                <div className="w-full h-1 bg-white/20 rounded-full">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(currentAudio.currentTime / currentAudio.duration) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              disabled={!currentAudio}
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </button>

            <div className="flex items-center gap-2 w-32">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={masterVolume}
                onChange={handleVolumeChange}
                className="flex-1"
                disabled={!currentAudio}
              />
              <span className="text-sm text-white/80 w-12">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audio element per lo stream remoto */}
      <audio
        id="remote-audio"
        autoPlay
        playsInline
        className="hidden"
      />
    </>
  );
};

export default AudioPlayer; 