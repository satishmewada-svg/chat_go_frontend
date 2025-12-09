import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Do NOT prerender dynamic chat route
  {
    path: 'chat/room/:id',
    renderMode: RenderMode.Server   // <-- Important: SSR, not prerender
  },

  // Everything else can stay prerendered
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
