// Startup file for Node.js hosting (e.g. cPanel "Setup Node.js App"). CommonJS so any loader can require it.
import('./server/index.mjs').then(({startServer})=>startServer()).catch(error=>{console.error(error);process.exit(1);});
