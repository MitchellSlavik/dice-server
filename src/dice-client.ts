import { CompletedRollDescription, DiceClientEventMap, DiceClientMessage, DiceServerMessage, RollDescription, SupportedDiceValue } from "./types";
import { nanoid } from "nanoid";

const SUPPORTED_SERVER_VERSIONS = [1];

const DEBUG = (writeLog?: boolean, ...args: any[]) => writeLog && console.debug("[DC Debug]:", ...args);

const pongMessage: DiceClientMessage = { type: 'Pong' };

type RollRequestResult = { completedRolls: CompletedRollDescription[], cancelled: boolean };

export class DiceClient<T extends WebSocket> {
    debug?: boolean;
    webSocket?: T;
    webSocketReady = false;
    supportedDice?: SupportedDiceValue;
    pendingRollRequests: Record<string, { resolve?: (result: RollRequestResult) => void; }> = {};
    eventCallbacks: DiceClientEventMap;
    webSocketConstructor: new (...args: any) => T;

    constructor(webSocketConstructor: new (...args: any) => T, eventCallbacks: DiceClientEventMap = {}, debug = false) {
        this.debug = debug;
        this.eventCallbacks = eventCallbacks;
        this.webSocketConstructor = webSocketConstructor;
    }

    connect(url: string | URL) {
        this.disconnect();

        this.webSocket = new this.webSocketConstructor(url);

        this.webSocket.onopen = () => {
            this.webSocketReady = true;
            this.eventCallbacks.onOpen?.();
        };

        this.webSocket.onmessage = (event) => {
            let message = JSON.parse(event.data.toString()) as DiceServerMessage;
            DEBUG(this.debug, "Received message", message);
            switch(message.type) {
                case 'ServerVersion': {
                    if(!SUPPORTED_SERVER_VERSIONS.includes(message.version)) {
                        DEBUG(true, "Unsupported server version! Supported versions are", SUPPORTED_SERVER_VERSIONS, "Closing connection.");
                        this.eventCallbacks.onError?.(new Error("Unsupported server version"));
                        this.disconnect();
                    }
                    break;
                }
                case 'SupportedDice': {
                    this.supportedDice = message.dice;
                    this.eventCallbacks.onSupportedDiceUpdated?.(message.dice);
                    break;
                }
                case 'RollResponse': {
                    this.handleRollResponse(message.id, message.rolls);
                    break;
                }
                case 'Ping': {
                    this.send(pongMessage)
                    break;
                }
            }
        }

        this.webSocket.onclose = () => {
            this.webSocketReady = false;
            this.eventCallbacks.onClose?.();
            DEBUG(this.debug, 'Connection closed');
        }
    }

    disconnect() {
        if(this.webSocket){
            this.webSocketReady = false;
            this.webSocket.close();
            this.webSocket.onclose = null;
            this.webSocket.onmessage = null;
            this.webSocket.onopen = null;
            this.webSocket = undefined;
        }
    }

    requestRoll(rollDescriptions: RollDescription[]) {
        let rollId = nanoid();

        while(this.pendingRollRequests[rollId]) {
            rollId = nanoid();
        }

        this.send({
            type: 'RollRequest',
            id: rollId,
            rolls: rollDescriptions,
        });

        this.pendingRollRequests[rollId] = {};

        return rollId;
    }

    requestRollPromise(rollDescriptions: RollDescription[]) {
        let rollId = nanoid();

        while(this.pendingRollRequests[rollId]) {
            rollId = nanoid();
        }

        this.send({
            type: 'RollRequest',
            id: rollId,
            rolls: rollDescriptions,
        });

        return { rollId, promise: new Promise<RollRequestResult>((resolve) => {
            this.pendingRollRequests[rollId] = { resolve };
        })};
    }

    cancelRollRequest(rollId: string) {
        if(!this.pendingRollRequests[rollId]) {
            // Not pending, either we got this erroneously or we already cancelled it
            // Either way we trash it
            DEBUG(this.debug, `Got a cancel roll request but the roll request was not found ${rollId}`);
            return;
        }

        const pending = this.pendingRollRequests[rollId];

        if(pending.resolve) {
            pending.resolve({ completedRolls: [], cancelled: true });
        } else {
            this.eventCallbacks.onRollCancelled?.(rollId);
        }

        delete this.pendingRollRequests[rollId];

        this.send({
            type: 'CancelRollRequest',
            id: rollId,
        });
    }

    send(message: DiceClientMessage) {
        if(!this.webSocket) {
            DEBUG(this.debug, `Attempted to send a '${message.type}' message but the websocket is not connected.`);
            return;
        }

        this.webSocket.send(JSON.stringify(message));
    }

    handleRollResponse(rollId: string, completedRolls: CompletedRollDescription[]) {
        if(!this.pendingRollRequests[rollId]) {
            // Not pending, either we got this erroneously or we requested a cancel but the server sent it anyways
            // Either way we trash it
            DEBUG(this.debug, `Got a roll response that wasn't requested or was cancelled ${rollId}`);
            return;
        }

        const pending = this.pendingRollRequests[rollId];

        if(pending.resolve) {
            pending.resolve({ completedRolls, cancelled: false });
        } else {
            this.eventCallbacks.onRollResponse?.(rollId, completedRolls);
        }
        
        delete this.pendingRollRequests[rollId];
    }
}