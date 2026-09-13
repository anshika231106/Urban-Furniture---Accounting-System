import app from './app.js';
import { PORT } from './config/index.js';

app.listen(PORT, () => {
  console.log(`\n  Urban Furniture API running on http://localhost:${PORT}`);
  console.log(`  Default admin: loginId="admin1", password="Admin@123!"\n`);
});
