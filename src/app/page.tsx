import ChatInterface from '@/components/chat-interface';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-4 border-b shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h1 className="text-3xl font-bold text-center font-headline text-primary">
          Xaamaal laa say Yéleef
        </h1>
      </header>
      <main className="flex-1 flex flex-col items-center w-full">
        <div className="w-full max-w-3xl flex-1 flex flex-col">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
