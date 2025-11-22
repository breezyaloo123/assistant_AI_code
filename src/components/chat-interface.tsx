"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, Send, User, Loader2, Volume2, Mic, MicOff, AlertCircle, Paperclip, X } from "lucide-react";
import { getAiResponse, getAiResponseAudio, transcribeAudio } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export type Message = {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string | null;
  fileDataUri?: string | null;
};

const CHAT_HISTORY_KEY = 'streamassist.chatHistory';

const formSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty."),
});

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } else {
        audioRef.current.play();
      }
    }
  };

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => setIsPlaying(false);

      audioElement.addEventListener("play", onPlay);
      audioElement.addEventListener("pause", onPause);
      audioElement.addEventListener("ended", onEnded);

      return () => {
        audioElement.removeEventListener("play", onPlay);
        audioElement.removeEventListener("pause", onPause);
        audioElement.removeEventListener("ended", onEnded);
      };
    }
  }, []);

  return (
    <div className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-lg p-3 text-sm shadow-md flex flex-col gap-2",
           isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        {message.fileDataUri && (
           <Image
              src={message.fileDataUri}
              alt="Uploaded content"
              width={300}
              height={300}
              className="rounded-md object-cover"
            />
        )}
        <div className="flex items-center gap-2">
            <span className="whitespace-pre-wrap">{message.content}</span>
            {!isUser && message.audioUrl && (
            <>
                <Button size="icon" variant="ghost" onClick={handlePlayAudio} className="h-6 w-6 shrink-0">
                <Volume2 className={cn("h-4 w-4", isPlaying && "text-primary")} />
                </Button>
                <audio ref={audioRef} src={message.audioUrl} className="hidden" />
            </>
            )}
        </div>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="bg-accent text-accent-foreground"><User className="h-5 w-5"/></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

const LoadingChatMessage = () => (
  <div className="flex items-start gap-3 justify-start">
    <Avatar className="h-8 w-8 border">
      <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
    </Avatar>
    <div className="bg-card text-card-foreground rounded-lg p-3 text-sm shadow-md flex items-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary"/>
    </div>
  </div>
);

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    try {
      const storedMessages = localStorage.getItem(CHAT_HISTORY_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.error("Failed to parse messages from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        if (messages.length > 0) {
           const messagesToStore = messages.map(({ role, content }) => ({ role, content }));
           localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messagesToStore));
        } else {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        }
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          toast({
            variant: "destructive",
            title: "Erreur de stockage",
            description: "L'historique de la discussion est trop volumineux pour être sauvegardé."
          });
        } else {
          console.error("Failed to save messages to localStorage", error);
        }
      }
    }
  }, [messages, isClient, toast]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        if (selectedFile.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        } else {
             setFilePreview(null);
        }
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleStartRecording = async () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: "destructive",
        title: "Fonctionnalité non prise en charge",
        description: "Votre navigateur ne prend pas en charge l'enregistrement audio.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsTranscribing(true);
          try {
            const transcribedText = await transcribeAudio(base64Audio);
            form.setValue("prompt", transcribedText);
          } catch (error) {
             toast({
              variant: "destructive",
              title: "Erreur de transcription",
              description: "Impossible de transcrire l'audio. Veuillez réessayer.",
            });
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error getting mic permission:", err);
      setHasMicPermission(false);
      toast({
        variant: "destructive",
        title: "Accès au microphone refusé",
        description: "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.",
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all media tracks to turn off the mic indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    let fileDataUri: string | null = null;
    if (file) {
        const reader = new FileReader();
        fileDataUri = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    }

    const userMessage: Message = { role: "user", content: values.prompt, fileDataUri };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    form.reset();
    removeFile();


    try {
      const aiResponseContent = await getAiResponse(newMessages);
      
      const aiMessage: Message = { role: "assistant", content: aiResponseContent, audioUrl: null };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);
      
      const audioUrl = await getAiResponseAudio(aiResponseContent);
      setMessages((currentMessages) =>
        currentMessages.map((msg) =>
          msg === aiMessage ? { ...msg, audioUrl } : msg
        )
      );

    } catch (error) {
      const typedError = error as Error;
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: typedError.message || "There was a problem with the AI response.",
      });
      setMessages((currentMessages) => currentMessages.filter(msg => msg !== userMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const isLoadingAnything = isLoading || isRecording || isTranscribing;

  return (
    <div className="flex flex-col h-full w-full">
      <Toaster />
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {isClient && messages.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground pt-16 flex flex-col items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Bienvenue sur Xaamaal laa say Yéleef</h2>
              <p className="max-w-md">Commencez une conversation en tapant un message ou en utilisant l'icône du microphone. Votre historique de discussion sera sauvegardé dans ce navigateur.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && <LoadingChatMessage />}
          <div ref={scrollEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        {filePreview && (
            <div className="relative mb-2 w-24 h-24">
                <Image src={filePreview} alt="Preview" layout="fill" className="rounded-md object-cover" />
                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-600 hover:bg-slate-700" onClick={removeFile}>
                    <X className="h-4 w-4 text-white" />
                </Button>
            </div>
        )}
         {file && !filePreview && (
            <div className="relative mb-2 flex items-center gap-2 rounded-md border p-2">
                <span className="text-sm">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeFile}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input 
                      placeholder={isRecording ? "Enregistrement en cours..." : "Posez-moi une question..."} 
                      {...field} 
                      disabled={isLoadingAnything}
                      className="text-base"
                      autoComplete="off"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingAnything}
                aria-label="Attach file"
            >
                <Paperclip className="h-5 w-5" />
            </Button>
            <Button 
              type="button" 
              size="icon" 
              onClick={handleStartRecording} 
              disabled={isLoading || isTranscribing} 
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              variant={isRecording ? "destructive" : "ghost"}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button type="submit" size="icon" disabled={isLoadingAnything || (!form.getValues().prompt && !file)} aria-label="Send message">
              {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </Form>
        {hasMicPermission === false && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              L'accès au microphone a été bloqué. Veuillez l'activer dans les paramètres de votre navigateur.
            </p>
        )}
      </div>
    </div>
  );
}
