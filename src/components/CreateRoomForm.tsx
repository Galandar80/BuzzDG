
import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const CreateRoomForm: React.FC = () => {
  const [name, setName] = useState('');
  const { handleCreateRoom, isLoading } = useRoom();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    await handleCreateRoom(name.trim());
  };
  
  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Crea una Stanza</h2>
        <p className="text-muted-foreground">
          Crea una nuova stanza e diventa l'host
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="host-name" className="text-sm font-medium">
            Il tuo nome
          </label>
          <Input
            id="host-name"
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
        
        <Button
          type="submit"
          disabled={isLoading || name.trim().length < 2}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creazione...
            </>
          ) : (
            'Crea Stanza'
          )}
        </Button>
      </form>
    </div>
  );
};

export default CreateRoomForm;
