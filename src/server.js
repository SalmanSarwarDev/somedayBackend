require('dotenv').config();

const app = require('./app');
const routCron = require('./crons/routineCron');
const { connectDatabase, mongoose } = require('./config/database');

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from .env');
  }

  await connectDatabase();
  routCron();

  const port = Number(process.env.PORT) || 5001;
  const server = app.listen(port, () => {
    console.log(`Someday API listening at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((error) => {
  console.error('Failed to start Someday API:', error.message);
  process.exitCode = 1;
});
