import { Router } from 'itty-router';
import { handleAuthRoutes } from './routes/auth.js';
import { handleMessageRoutes } from './routes/messages.js';
import { handleAIRoutes } from './routes/ai.js';
import { handleGameRoutes } from './routes/games.js';

const router = Router();

router.get('/', () => new Response('CrowMail API running'));

// mount routes
router.all('/api/auth/*', (req, env, ctx) => handleAuthRoutes(req, env, ctx));
router.all('/api/messages/*', (req, env, ctx) => handleMessageRoutes(req, env, ctx));
router.all('/api/ai/*', (req, env, ctx) => handleAIRoutes(req, env, ctx));
router.all('/api/games/*', (req, env, ctx) => handleGameRoutes(req, env, ctx));

// fallback to static site (handled by Pages), or 404
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
  fetch: (request, env, ctx) => router.handle(request, env, ctx),
};
