require('dotenv').config();

const Fastify = require('fastify');

const app = Fastify({
  logger: true,
});

app.get('/health', async () => {
  return {
    success: true,
    status: 'ok',
  };
});

app.post('/flow', async (req) => {
  console.log(req.body);

  return {
    success: true,
  };
});

app.listen({
  port: 3212,
  host: '0.0.0.0',
}).then(() => {
  console.log('Running on 3212');
});