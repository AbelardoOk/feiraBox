import { env } from 'bun';
import { app } from './app';

app.listen(env.PORT);
console.log('🚀 FeiraBox API running on port 3000');
