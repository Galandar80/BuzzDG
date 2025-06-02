import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  listenToRoom,
  registerBuzz,
  resetBuzz,
  removePlayer,
  joinRoom,
  createRoom,
  checkRoomExists,
  generateRoomCode,
  assignPoints,
  subtractPoints,
  rejectPlayerAnswer,
  database,
  ref,
  update,
  updateRoomActivity
} from '../services/firebase';
import { AudioStreamManager } from '../services/webrtc';

interface Player {
  name: string;
  isHost: boolean;
  joinedAt: number;
  points?: number;
}

interface WinnerInfo {
  playerId: string;
  playerName: string;
  timestamp: number;
  answer?: string;
}

interface RoomData {
  hostName: string;
  createdAt: number;
  winnerInfo: WinnerInfo | null;
  players: Record<string, Player>;
}

interface RoomContextType {
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string | null;
  setPlayerId: (id: string | null) => void;
  roomData: RoomData | null;
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  playersList: { id: string; name: string; isHost: boolean; points?: number }[];
  winnerName: string | null;
  handleCreateRoom: (name: string) => Promise<void>;
  handleJoinRoom: (roomCode: string, name: string) => Promise<void>;
  handleBuzz: () => Promise<void>;
  handleResetBuzz: () => Promise<void>;
  handleLeaveRoom: () => Promise<void>;
  awardPoints: (amount?: number) => Promise<void>;
  subtractPlayerPoints: (amount?: number) => Promise<void>;
  rejectAnswer: () => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  audioStreamManager: AudioStreamManager | null;
  setAudioStreamManager: (manager: AudioStreamManager | null) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStreamManager, setAudioStreamManager] = useState<AudioStreamManager | null>(null);
  
  const navigate = useNavigate();

  const isHost = !!playerId && 
                 !!roomData?.players && 
                 !!roomData.players[playerId]?.isHost;
  
  const playersList = roomData ? Object.entries(roomData.players || {}).map(([id, player]) => ({
    id,
    name: player.name,
    isHost: player.isHost,
    points: player.points || 0
  })) : [];
  
  const winnerName = roomData?.winnerInfo?.playerName || null;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    if (roomCode) {
      console.log(`Setting up room listener for room ${roomCode}`);
      unsubscribe = listenToRoom(roomCode, (data) => {
        if (data) {
          setRoomData(data);
          
          if (playerId && data.players && !data.players[playerId]) {
            console.log(`Player ${playerId} not found in room data, may have been removed`);
            toast.error('Sei stato rimosso dalla stanza');
            setRoomCode(null);
            setRoomData(null);
            navigate('/');
          } else if (playerId && data.players && data.players[playerId]) {
            console.log(`Player data in room: ${JSON.stringify(data.players[playerId])}`);
            console.log(`Current points: ${data.players[playerId].points || 0}`);
          }
        } else {
          console.log("Room no longer exists");
          setError("La stanza non esiste più");
          setRoomCode(null);
          setRoomData(null);
          navigate('/');
        }
      });
    }
    
    return () => {
      if (unsubscribe) {
        console.log(`Cleaning up room listener for room ${roomCode}`);
        unsubscribe();
      }
    };
  }, [roomCode, navigate, playerId]);

  useEffect(() => {
    if (!roomCode || !playerId) return;
    
    const interval = setInterval(() => {
      if (roomCode) {
        updateRoomActivity(roomCode).catch(err => {
          console.error("Error updating room activity:", err);
        });
      }
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [roomCode, playerId]);

  useEffect(() => {
    if (roomCode && isHost) {
      const manager = new AudioStreamManager(roomCode, true);
      manager.initialize().catch(console.error);
      setAudioStreamManager(manager);

      return () => {
        manager.stop();
        setAudioStreamManager(null);
      };
    }
  }, [roomCode, isHost]);

  const handleCreateRoom = async (name: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let code = generateRoomCode();
      let roomExists = await checkRoomExists(code);
      
      while (roomExists) {
        code = generateRoomCode();
        roomExists = await checkRoomExists(code);
      }
      
      const generatedPlayerId = `${name.toLowerCase().replace(/\s/g, '_')}_${Date.now().toString().slice(-6)}`;
      await createRoom(code, name, generatedPlayerId);
      
      setPlayerName(name);
      setRoomCode(code);
      setPlayerId(generatedPlayerId);
      
      navigate(`/room/${code}`);
      toast.success(`Stanza ${code} creata con successo!`);
    } catch (err) {
      console.error('Errore nella creazione della stanza:', err);
      setError('Errore nella creazione della stanza. Riprova.');
      toast.error('Errore nella creazione della stanza');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (code: string, name: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const roomExists = await checkRoomExists(code);
      
      if (!roomExists) {
        setError('Stanza non trovata');
        toast.error('Stanza non trovata');
        return;
      }
      
      console.log(`Joining room ${code} with name ${name}`);
      const id = await joinRoom(code, name);
      console.log(`Received player ID: ${id}`);
      
      setPlayerName(name);
      setRoomCode(code);
      setPlayerId(id);
      
      navigate(`/room/${code}`);
      toast.success(`Sei entrato nella stanza ${code}`);
    } catch (err) {
      console.error('Errore nell\'entrare nella stanza:', err);
      setError('Errore nell\'entrare nella stanza. Riprova.');
      toast.error('Errore nell\'entrare nella stanza');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuzz = async () => {
    if (!roomCode || !playerId || !playerName) return;
    
    try {
      await registerBuzz(roomCode, playerId, playerName);
    } catch (err) {
      console.error('Errore nel registrare il buzz:', err);
      toast.error('Errore nel registrare il buzz');
    }
  };

  const handleResetBuzz = async () => {
    if (!roomCode || !isHost) return;
    
    try {
      await resetBuzz(roomCode);
      await updateRoomActivity(roomCode);
      toast.success('Buzz resettato');
    } catch (err) {
      console.error('Errore nel resettare il buzz:', err);
      toast.error('Errore nel resettare il buzz');
    }
  };

  const awardPoints = async (amount: number = 10) => {
    if (!roomCode || !isHost || !roomData?.winnerInfo) return;
    
    try {
      await assignPoints(roomCode, roomData.winnerInfo.playerId, amount);
      toast.success(`Assegnati ${amount} punti a ${roomData.winnerInfo.playerName}!`);
    } catch (err) {
      console.error('Errore nell\'assegnare punti:', err);
      toast.error('Errore nell\'assegnare punti');
    }
  };

  const subtractPlayerPoints = async (amount: number = 5) => {
    if (!roomCode || !isHost || !roomData?.winnerInfo) return;
    
    try {
      await subtractPoints(roomCode, roomData.winnerInfo.playerId, amount);
      toast.error(`Sottratti ${amount} punti a ${roomData.winnerInfo.playerName}!`);
    } catch (err) {
      console.error('Errore nel sottrarre punti:', err);
      toast.error('Errore nel sottrarre punti');
    }
  };

  const rejectAnswer = async () => {
    if (!roomCode || !isHost || !roomData?.winnerInfo) return;
    
    try {
      await rejectPlayerAnswer(roomCode);
    } catch (err) {
      console.error('Errore nel rifiutare la risposta:', err);
      toast.error('Errore nel rifiutare la risposta');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomCode || !playerId) return;
    
    try {
      await removePlayer(roomCode, playerId);
      await updateRoomActivity(roomCode);
      
      setRoomCode(null);
      setPlayerId(null);
      setRoomData(null);
      
      navigate('/');
      toast.success('Hai lasciato la stanza');
    } catch (err) {
      console.error('Errore nel lasciare la stanza:', err);
      toast.error('Errore nel lasciare la stanza');
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!roomCode || !roomData?.winnerInfo) return;
    
    try {
      // Aggiorno il riferimento diretto alla stanza per aggiungere la risposta
      const winnerRef = ref(database, `rooms/${roomCode}`);
      
      // Imposto esplicitamente l'answer nel winnerInfo
      await update(winnerRef, {
        'winnerInfo/answer': answer,  // Percorso corretto alla proprietà answer
        lastActivity: Date.now()
      });
      
      console.log(`Risposta "${answer}" inviata con successo alla room ${roomCode}`);
      toast.success('Risposta inviata con successo');
    } catch (err) {
      console.error('Errore nell\'inviare la risposta:', err);
      toast.error('Errore nell\'inviare la risposta');
    }
  };

  const value = {
    roomCode,
    setRoomCode,
    playerName,
    setPlayerName,
    playerId,
    setPlayerId,
    roomData,
    isHost,
    isLoading,
    error,
    playersList,
    winnerName,
    handleCreateRoom,
    handleJoinRoom,
    handleBuzz,
    handleResetBuzz,
    handleLeaveRoom,
    awardPoints,
    subtractPlayerPoints,
    rejectAnswer,
    submitAnswer,
    audioStreamManager,
    setAudioStreamManager,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = (): RoomContextType => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom deve essere usato all\'interno di un RoomProvider');
  }
  return context;
};
