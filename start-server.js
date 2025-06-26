const { exec } = require('child_process');
const path = require('path');

// Chemin absolu vers ton dossier frontend
const frontendPath = path.resolve(__dirname, 'frontend');

// Commande pour lancer http-server dans frontend, port 5500, sans cache
const cmd = `npx http-server "${frontendPath}" -c-1 -p 5500`;

console.log('Lancement du serveur http-server...');

const serverProcess = exec(cmd);

serverProcess.stdout.on('data', data => {
  console.log(data);
});

serverProcess.stderr.on('data', data => {
  console.error(data);
});

serverProcess.on('close', code => {
  console.log(`Processus http-server terminé avec le code ${code}`);
});
