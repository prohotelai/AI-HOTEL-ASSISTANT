require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const { ensureDefaultRoles } = require('./utils/roles');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/core/auth', authRoutes);
app.use('/api/core/hotels', hotelRoutes);
app.use('/api/core/users', userRoutes);
app.use('/api/core/roles', roleRoutes);

const PORT = process.env.PORT || 3000;
ensureDefaultRoles().then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${PORT}`);
  });
});
