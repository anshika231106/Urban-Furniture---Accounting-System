import app from './app.js';
import { PORT } from './config/index.js';

const server = app.listen(PORT, () => {
  console.log(`\n  Urban Furniture API running on http://localhost:${PORT}`);
  console.log(`  Default admin: loginId="admin1", password="Admin@123!"\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another process. Please free port ${PORT}.\n`);
  } else {
    console.error('\n❌ Server error:', err);
  }
  process.exit(1);
});
