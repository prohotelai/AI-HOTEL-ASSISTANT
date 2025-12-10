import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-engine' });
});

// TODO: Add AI orchestration routes

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`AI Engine listening on port ${port}`);
});
