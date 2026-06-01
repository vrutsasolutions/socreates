// ════════════════════════════════════════════════════════════════════════
//  Google Gemini AI — idea generation & enhancement.
//  Backend: ⏳ under development (Vishakha). Mock-backed until live.
//  Flip USE_MOCK.ai → false in config.js when /api/ai/* is ready.
// ════════════════════════════════════════════════════════════════════════
import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';
import { MOCK_AI } from './mockData';

// POST /api/ai/generate   { prompt, category? } → { title, description, category, tags[] }
export const generateIdea = ({ prompt, category }) =>
  USE_MOCK.ai
    ? mockResponse(MOCK_AI.generate(prompt))
    : api.post('/ai/generate', { prompt, category });

// POST /api/ai/enhance    { title, description } → { enhancedDescription, suggestions[] }
export const enhanceIdea = ({ title, description }) =>
  USE_MOCK.ai
    ? mockResponse(MOCK_AI.enhance(description))
    : api.post('/ai/enhance', { title, description });

// POST /api/ai/summarize  { description } → { summary }
export const summarizeIdea = ({ description }) =>
  USE_MOCK.ai
    ? mockResponse(MOCK_AI.summarize(description))
    : api.post('/ai/summarize', { description });

// POST /api/ai/categorize { title, description } → { category, confidence }
export const categorizeIdea = ({ title, description }) =>
  USE_MOCK.ai
    ? mockResponse(MOCK_AI.categorize())
    : api.post('/ai/categorize', { title, description });

// POST /api/ai/chat       { messages: [{role, content}] } → { reply }
export const chatWithAssistant = (messages) =>
  USE_MOCK.ai
    ? mockResponse(MOCK_AI.chat(messages?.[messages.length - 1]?.content))
    : api.post('/ai/chat', { messages });
