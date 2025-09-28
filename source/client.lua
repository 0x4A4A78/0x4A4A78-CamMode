

local CamMovePos = { x = 0, y = 0, z = 0, fov = 0}
local cam, cam2, camera, TrackedEntity, offsetEnd, offsetStart, camTime = nil, nil, nil, nil, nil, nil, nil
local SavedPictures = {}

local isCameraOpen, isFreeCam = false, false

local freeSpeedBase = Config.SpeedBase
local speedFastMul  = Config.SpeedShift
local speedSlowMul  = Config.SpeedAlt 
local lookSensitivity = 6.0


local pitch, yaw, roll = 0.0, 0.0, 0.0


local maxCamDistance = Config.MaxCam


local function clamp(v, mi, ma)
    if v < mi then return mi end
    if v > ma then return ma end
    return v
end

local function rotToForward(rot)
    local zr = math.rad(rot.z)
    local xr = math.rad(rot.x)
    local cosX = math.cos(xr)
    return vector3(-math.sin(zr) * cosX, math.cos(zr) * cosX, math.sin(xr))
end

local function rotToRight(rot)
    local zr = math.rad(rot.z)
    return vector3(math.cos(zr), math.sin(zr), 0.0)
end

local function closeCameraMode()

    SendNUIMessage({ action = "hideui" })
    SendNUIMessage({ action = "cameramode_off" })

    SetNuiFocus(false, false)


    if isFreeCam then
        isFreeCam = false
        EnableAllControlActions(0)
    end

    isCameraOpen = false


    local ped = PlayerPedId()
    if DoesCamExist(cam)  then DestroyCam(cam,  true) end
    if DoesCamExist(cam2) then DestroyCam(cam2, true) end
    if camera and DoesCamExist(camera) then DestroyCam(camera, true) end
    camera = nil

    RenderScriptCams(false, false, 1, true, true)
    FreezeEntityPosition(ped, false)
end


local function stopFreeCam(showUi)
    if not isFreeCam then return end
    isFreeCam = false
    EnableAllControlActions(0)
    if showUi then
        SetNuiFocus(true, true)
        SendNUIMessage({ action = "showui" })
    end
end

local function startFreeCam()
    if not camera or not DoesCamExist(camera) then
        if cam2 and DoesCamExist(cam2) then
            camera = cam2
        elseif cam and DoesCamExist(cam) then
            camera = cam
        else
            local ped = PlayerPedId()
            local pos = GetEntityCoords(ped)
            camera = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", pos.x, pos.y, pos.z + 1.0, 0.0, 0.0, 0.0, 50.0, false, 0)
            SetCamActive(camera, true)
            RenderScriptCams(true, false, 1, true, true)
        end
    end

    local r = GetCamRot(camera, 2)
    pitch, yaw, roll = r.x, r.z, r.y or 0.0


    SetNuiFocus(false, false)
    SendNUIMessage({ action = "hideui" })

    isFreeCam = true
    CreateThread(function()
        while isFreeCam do
            DisableAllControlActions(0)
            EnableControlAction(0, 1, true)  -- LOOK_LR
            EnableControlAction(0, 2, true)  -- LOOK_UD

   
            local lookX = GetDisabledControlNormal(0, 1)
            local lookY = GetDisabledControlNormal(0, 2)
            yaw   = yaw   - (lookX * lookSensitivity)
            pitch = pitch - (lookY * lookSensitivity)
            pitch = clamp(pitch, -89.0, 89.0)

            local dt = GetFrameTime() * 60.0
            if IsDisabledControlPressed(0, 44) then -- Q
                roll = roll - (1.6 * dt)
            end
            if IsDisabledControlPressed(0, 38) then -- E
                roll = roll + (1.6 * dt)
            end
            roll = clamp(roll, -75.0, 75.0)

            SetCamRot(camera, pitch, roll, yaw, 2)

      
            local spd = freeSpeedBase
            if IsDisabledControlPressed(0, 21) then      -- Shift
                spd = spd * speedFastMul
            elseif IsDisabledControlPressed(0, 19) then  -- Left Alt
                spd = spd * speedSlowMul
            end


            local moveF, moveR, moveZ = 0.0, 0.0, 0.0
            if IsDisabledControlPressed(0, 32) then moveF =  1.0 end -- W
            if IsDisabledControlPressed(0, 33) then moveF = -1.0 end -- S
            if IsDisabledControlPressed(0, 35) then moveR =  1.0 end -- D
            if IsDisabledControlPressed(0, 34) then moveR = -1.0 end -- A
            if IsDisabledControlPressed(0, 22) then moveZ =  1.0 end -- Space
            if IsDisabledControlPressed(0, 36) then moveZ = -1.0 end -- LCtrl

            local rot  = GetCamRot(camera, 2)
            local pos  = GetCamCoord(camera)
            local fwd  = rotToForward(rot)
            local right= rotToRight(rot)

            local delta = (fwd * (moveF * spd * dt)) + (right * (moveR * spd * dt)) + vector3(0.0, 0.0, moveZ * spd * dt)
            SetCamCoord(camera, pos.x + delta.x, pos.y + delta.y, pos.z + delta.z)

            -- ถ้าไกลจากผู้เล่นเกิน maxCamDistance -> ปิด CameraMode ทันที
            local ped = PlayerPedId()
            local pedPos = GetEntityCoords(ped)
            local camPos = GetCamCoord(camera)
            local dist = #(camPos - pedPos)
            if dist > maxCamDistance then
                closeCameraMode()
                break
            end

    
            if IsDisabledControlJustPressed(0, 74) then  -- H
                stopFreeCam(true)
            end

            Wait(0)
        end
    end)
end

---@param bool any
local function renderCamMode(bool)
    local ped = PlayerPedId()
    if bool then
        TrackedEntity = ped

        local pedPos = GetEntityCoords(ped)
        offsetStart = vector3(pedPos.x, pedPos.y, pedPos.z + (Config.CameraOffsetStart.z or 1.2))
        offsetEnd   = vector3(pedPos.x + (Config.CameraOffsetEnd.x or 0.6),
                              pedPos.y + (Config.CameraOffsetEnd.y or 1.2),
                              pedPos.z + (Config.CameraOffsetEnd.z or 1.2))
        camTime = Config.CameraTransitionTime

        FreezeEntityPosition(ped, true)

        cam  = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", offsetStart, 0.0 ,0.0, 0, 60.00, true, 0)
        cam2 = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", offsetEnd,   0.0 ,0.0, 0, 60.00, false, 0)

        local heading = GetEntityHeading(ped)
        SetCamRot(cam, 0.0, 0.0, heading, 2)
        SetCamRot(cam2, 0.0, 0.0, heading, 2)

        SetCamFov(cam2, Config.EndFOV or 60.0)
        SetCamActiveWithInterp(cam2, cam, 0, true, true)

        RenderScriptCams(true, false, 1, true, true)

        CreateThread(function()
            Wait(camTime)
            if DoesCamExist(cam) then
                DestroyCam(cam, true)
            end
        end)
    else
        if DoesCamExist(cam) then DestroyCam(cam, true) end
        if DoesCamExist(cam2) then DestroyCam(cam2, true) end
        RenderScriptCams(false, false, 1, true, true)
        FreezeEntityPosition(ped, false)
    end
    if bool then
        Wait(camTime)
    end
end


local function OpenCameraMode()
    SetNuiFocus(true, true)
    SendNUIMessage({ action = "opencam" })
    isCameraOpen = true
    renderCamMode(true)
end

RegisterNUICallback("close", function(_)
    closeCameraMode()
end)

RegisterNUICallback('getCamsData', function(_, cb)
    Wait(1000)
    local Screenshots = GetResourceKvpString('A5Screenshots')
    if Screenshots then SavedPictures = json.decode(Screenshots) end
    local data = { Settings = Config, Pictures = SavedPictures }
    print('^5[0x4A4A78.cameramode] ^7Successfully  Camera Mode')
    cb(data)
end)

RegisterNUICallback('CameraMode', function()
    isCameraOpen = true
end)

RegisterNUICallback('SetUpCameraMovement', function(_)
    TriggerScreenblurFadeOut()
    ClearTimecycleModifier("helicamfirst" , 4.2)
end)

RegisterNUICallback('Movecamera', function(_) end)

RegisterNUICallback('Blurcamera', function(data)
    if data.blur == true then TriggerScreenblurFadeIn() else TriggerScreenblurFadeOut() end
end)

RegisterNUICallback('SetFilterStrength', function(data)
    FilterStrength = json.decode(data.Strength)
    SetTimecycleModifierStrength(FilterStrength)
end)

RegisterNUICallback('SetFilter', function(data)
    CurrentFilter = data.Filter
    if data.filter == false then
        ClearTimecycleModifier("" , 4.2)
    else
        SetTransitionTimecycleModifier(data.filter, 0)
        SetTimecycleModifierStrength(FilterStrength)
    end
end)

RegisterNUICallback('SavePicture', function(data)
    SavedPictures[tostring(data.Saving.id)] = {
        id = data.Saving.id,
        image = data.Saving.image,
        name = data.Saving.name,
    }
    SetResourceKvp('A5Screenshots', json.encode(SavedPictures))
end)

RegisterNUICallback('DeletePicture', function(data)
    SavedPictures[tostring(data.SelectedId)] = nil
    SetResourceKvp('A5Screenshots', json.encode(SavedPictures))
end)

RegisterNUICallback('TakeScreenShot', function()
    local DiscordWebhook = Config.DiscordWebHook
    if DiscordWebhook == "YOUR-WEBHOOK-HERE" then
        print("You did not put a valid webhook in the config")
        return
    end

    exports['screenshot-basic']:requestScreenshotUpload(tostring(DiscordWebhook), "files[]", function(data)
        local image = json.decode(data)
        SendNUIMessage({
            action = "CopyScreenshotUrl",
            url = image.attachments[1].proxy_url
        })
    end)
end)

RegisterNUICallback('ToggleFreeCam', function(_, cb)
    if not isCameraOpen then
        if cb then cb({ ok = false }) end
        return
    end
    if isFreeCam then stopFreeCam(true) else startFreeCam() end
    if cb then cb({ ok = true }) end
end)

RegisterCommand("cammode", function()
    OpenCameraMode()
end)

RegisterNetEvent('0x4A4A78.cameramode:client:OpenCameraMode', function()
    OpenCameraMode()
end)
