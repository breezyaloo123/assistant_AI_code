"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { getAiResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_HISTORY_KEY = 'streamassist.chatHistory';

const formSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty."),
});

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-lg p-3 text-sm shadow-md whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        {message.content}
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
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
        } else {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        }
      } catch (error) {
        console.error("Failed to save messages to localStorage", error);
      }
    }
  }, [messages, isClient]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const userMessage: Message = { role: "user", content: values.prompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    form.reset();

    try {
      const aiResponseContent = await getAiResponse(newMessages);
      const aiMessage: Message = { role: "assistant", content: aiResponseContent };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);
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
              <p className="max-w-md">Commencez une conversation en tapant un message ci-dessous. Votre historique de discussion sera sauvegardé dans ce navigateur.</p>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input 
                      placeholder="Posez-moi une question..." 
                      {...field} 
                      disabled={isLoading}
                      className="text-base"
                      autoComplete="off"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={isLoading} aria-label="Send message">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
