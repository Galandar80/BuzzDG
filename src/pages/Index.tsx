
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JoinRoomForm from '../components/JoinRoomForm';
import CreateRoomForm from '../components/CreateRoomForm';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Headphones } from 'lucide-react';
import QRCodeLink from '../components/QRCodeLink';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/50">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Indovina la Canzone</h1>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Connettiti con amici e metti alla prova la tua conoscenza musicale premendo il buzzer più velocemente!
            </p>
            <div className="flex justify-center mb-8">
              <QRCodeLink size="large" showLabel={true} />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6 animate-scale-in">
            <Tabs defaultValue="join" className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="join">Entra</TabsTrigger>
                <TabsTrigger value="create">Crea</TabsTrigger>
              </TabsList>
              
              <TabsContent value="join" className="mt-0">
                <JoinRoomForm />
              </TabsContent>
              
              <TabsContent value="create" className="mt-0">
                <CreateRoomForm />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="mt-8 flex flex-col items-center animate-fade-in">
            <p className="text-sm text-muted-foreground">
              Crea una stanza o unisciti a una esistente per iniziare a giocare!
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
