
import React, { useState, useRef, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const JoinRoomForm: React.FC = () => {
  const [name, setName] = useState('');
  const [code, setCode] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { handleJoinRoom, isLoading, error } = useRoom();
  
  // Inizializza i riferimenti
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 4);
  }, []);
  
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Sposta il focus al campo successivo se è stato inserito un numero
    if (value !== '' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se backspace e campo vuoto, torna al precedente
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim().length < 2) return;
    
    const roomCode = code.join('');
    if (roomCode.length !== 4) return;
    
    await handleJoinRoom(roomCode, name.trim());
  };
  
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Entra in una Stanza</h2>
        <p className="text-muted-foreground">
          Inserisci il codice di 4 cifre per entrare
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="player-name" className="text-sm font-medium">
            Il tuo nome
          </label>
          <Input
            id="player-name"
            type="text"
            placeholder="Inserisci il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="bg-white/10 border-white/20 placeholder:text-muted-foreground/60"
            minLength={2}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Codice stanza
          </label>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={code[index]}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className="code-digit"
                required
              />
            ))}
          </div>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={isLoading || name.trim().length < 2 || code.some(digit => digit === '')}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entra nella Stanza'
          )}
        </Button>
      </form>
    </div>
  );
};

export default JoinRoomForm;
