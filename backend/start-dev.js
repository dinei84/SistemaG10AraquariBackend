
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('Iniciando o servidor em modo de desenvolvimento seguro...');

process.env.NODE_ENV = 'development';

const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
const examplePath = path.join(__dirname, 'firebase-service-account.example.json');

if (!fs.existsSync(serviceAccountPath) && fs.existsSync(examplePath)) {
  console.log('Arquivo de credenciais nu00e3o encontrado. Usando arquivo de exemplo para desenvolvimento.');
  try {
    fs.copyFileSync(examplePath, serviceAccountPath);
    console.log('Arquivo de exemplo copiado com sucesso.');
  } catch (error) {
    console.error('Erro ao copiar arquivo de exemplo:', error.message);
    console.log('Continuando sem arquivo de credenciais...');
  }
}

console.log('Iniciando o servidor...');

try {
  const serverProcess = spawn('nodemon', ['server.js'], { stdio: 'inherit', shell: true });

  serverProcess.on('error', (error) => {
    console.error('Erro ao iniciar o servidor:', error.message);
    if (error.code === 'ENOENT') {
      console.log('\nNodemon nu00e3o encontrado. Tentando iniciar com Node.js diretamente...');
      const nodeProcess = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });
      
      nodeProcess.on('error', (nodeError) => {
        console.error('Erro ao iniciar o servidor com Node.js:', nodeError.message);
      });
    }
  });

  console.log('Servidor iniciado em modo de desenvolvimento');
  console.log('Pressione Ctrl+C para encerrar.');
} catch (error) {
  console.error('Erro ao iniciar o servidor:', error.message);
}