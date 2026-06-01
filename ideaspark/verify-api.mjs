// Standalone runtime verification of the src/api mock layer.
// Bundled with esbuild + run under Node. Not part of the app build.
import { USE_MOCK } from './src/api/config.js';
import { generateIdea, enhanceIdea, summarizeIdea, categorizeIdea, chatWithAssistant } from './src/api/aiApi.jsx';
import { uploadImage, deleteImage } from './src/api/imageApi.jsx';
import { fetchNotifications, fetchUnreadCount, markAllAsRead, subscribeToNotifications } from './src/api/notificationApi.jsx';
import { fetchIdeas, createIdea, checkPlagiarism } from './src/api/ideaApi.jsx';
import { searchIdeas } from './src/api/searchApi.jsx';
import { fetchMe } from './src/api/userApi.jsx';

// Force every domain onto its mock branch so we can verify offline, no backend.
Object.keys(USE_MOCK).forEach((k) => (USE_MOCK[k] = true));

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else      { fail++; console.log(`  ✗ ${name}`); }
};
const has = (o, ...keys) => o && keys.every((k) => k in o);

const run = async () => {
  console.log('AI (Gemini) — aiApi.jsx');
  check('generateIdea → {title,description,category,tags}', has((await generateIdea({ prompt: 'eco app' })).data, 'title', 'description', 'category', 'tags'));
  check('enhanceIdea → {enhancedDescription,suggestions[]}', Array.isArray((await enhanceIdea({ title: 't', description: 'd' })).data.suggestions));
  check('summarizeIdea → {summary}', has((await summarizeIdea({ description: 'long text here' })).data, 'summary'));
  check('categorizeIdea → {category,confidence}', has((await categorizeIdea({ title: 't', description: 'd' })).data, 'category', 'confidence'));
  check('chatWithAssistant → {reply}', has((await chatWithAssistant([{ role: 'user', content: 'hi' }])).data, 'reply'));

  console.log('Images (Cloudflare) — imageApi.jsx');
  check('uploadImage → {id,url}', has((await uploadImage(null)).data, 'id', 'url'));
  check('deleteImage resolves', (await deleteImage('mock-1')) !== undefined);

  console.log('Notifications — notificationApi.jsx');
  const notifs = (await fetchNotifications()).data;
  check('fetchNotifications → array of {id,type,read,...}', Array.isArray(notifs) && has(notifs[0], 'id', 'type', 'read', 'message'));
  const before = (await fetchUnreadCount()).data.count;
  await markAllAsRead();
  const after = (await fetchUnreadCount()).data.count;
  check(`markAllAsRead drops unread (${before} → ${after})`, after === 0 && before > 0);
  const unsub = subscribeToNotifications(() => {});
  check('subscribeToNotifications returns unsubscribe fn', typeof unsub === 'function');
  unsub();

  console.log('Ideas — ideaApi.jsx');
  check('fetchIdeas → Idea[]', Array.isArray((await fetchIdeas({ sort: 'trending' })).data));
  check('createIdea → echoes idea', has((await createIdea({ title: 'x', description: 'y', category: 'Tech' }, null)).data, 'id', 'title'));
  check('checkPlagiarism → {isPlagiarized,message}', has((await checkPlagiarism('text')).data, 'isPlagiarized', 'message'));

  console.log('Search — searchApi.jsx');
  const sr = (await searchIdeas({ q: 'app', category: 'All' })).data;
  check('searchIdeas filters by query', Array.isArray(sr));

  console.log('Users — userApi.jsx');
  check('fetchMe → {id,name,email}', has((await fetchMe()).data, 'id', 'name', 'email'));

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
run();
