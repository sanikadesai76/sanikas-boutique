
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://sanikas-boutique.vercel.app',
      'https://sanikas-boutique-b2mp915hu-sanikas-projects-e9e7c0e0.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
