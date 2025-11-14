import { config } from 'dotenv';
config();

import '@/ai/flows/prompt-from-template.ts';
import '@/ai/flows/maintain-conversation-history.ts';
import '@/ai/flows/generate-response.ts';
import '@/ai/flows/text-to-speech.ts';
