import { nanoid } from "nanoid";
import { ServerOptions, WebSocketServer } from "ws";
import { EventEmitter } from "events";
import type { CompletedRollDescription, DiceClientMessage, DiceServerEventMap, DiceServerMessage, DiceServerWebSocket, SupportedDiceValue } from "./types";

const SERVER_VERSION = 1;

const DEBUG = (writeLog?: boolean, ...args: any[]) => writeLog && console.debug("[DS Debug]:", ...args);

const pingMessage: DiceServerMessage = { type: 'Ping' };

export class DiceServer extends EventEmitter<DiceServerEventMap> {
    debug?: boolean;
    server?: WebSocketServer;
    clients: Record<string, DiceServerWebSocket> = {}
    supportedDice: SupportedDiceValue;

    constructor(supportedDice: SupportedDiceValue = ['all'], debug = false) {
        super();
        this.debug = debug;
        this.supportedDice = supportedDice;
    }

    open(options: ServerOptions) {
        this.server = new WebSocketServer(options);

        this.server.on('connection', (ws: DiceServerWebSocket) => {
            let id = nanoid();

            while(this.clients[id]) {
                id = nanoid();
            }

            this.clients[id] = ws;
            ws.isAlive = true;

            ws.on('message', (data) => {
                DEBUG(this.debug, `Message received from ${id}`);

                try{
                    const message = JSON.parse(data.toString()) as DiceClientMessage;

                    switch(message.type) {
                        case 'Pong': {
                            ws.isAlive = true;
                            break;
                        }
                        case 'RollRequest': {
                            this.emit('onRollRequest', id, message.id, message.rolls);
                            break;
                        }
                        case 'CancelRollRequest': {
                            this.emit('onCancelRollRequest', id, message.id);
                            break;
                        }
                        default: {
                            DEBUG(true, `Unrecognized message type ${message.type} from ${id}`);
                            break;
                        }
                    }
                } catch (err) {
                    DEBUG(this.debug, err);
                    this.emit('onError', err as Error);
                }
            });

            ws.on('error', (err) => {
                DEBUG(this.debug, id, err);
                this.emit('onError', err, id);
            });

            ws.on('close', () => {
                DEBUG(this.debug, `Closing connection to client ${id}`);
                delete this.clients[id];
                this.emit('onConnectionClose', id);
            });

            this._sendRaw(ws, { type: 'ServerVersion', version: SERVER_VERSION });
            this._sendRaw(ws, { type: 'SupportedDice', dice: this.supportedDice });

            this.emit('onConnection', id, ws)
        });

        const interval = setInterval(() => {
            this.server?.clients.forEach((ws: DiceServerWebSocket) => {
                if (ws.isAlive) {
                    ws.isAlive = false;
                    this._sendRaw(ws, pingMessage);
                } else {
                    DEBUG(this.debug, "Client didn't respond to ping. Terminating connection.")
                    ws.terminate();
                }
            });
        }, 30000);

        this.server.on('listening', () => {
            DEBUG(this.debug, "Web socket server listening");
        });

        this.server.on('close', () => {
            DEBUG(this.debug, "Web socket server closed");
            clearInterval(interval);
            this.clients = {};
            this.emit('onClose');
        });
    }

    close() {
        this.server?.close();
        this.server = undefined;
    }

    sendRollResponse(connectionId: string, rollRequestId: string, completedRolls: CompletedRollDescription[]) {
        this._sendRaw(connectionId, {
            type: 'RollResponse',
            id: rollRequestId,
            rolls: completedRolls,
        });
    }

    _sendRaw(connectionId: string | DiceServerWebSocket, message: DiceServerMessage) {
        let webSocket: DiceServerWebSocket;
        if(typeof connectionId === 'string'){
            if (!this.clients[connectionId]) {
                DEBUG(this.debug, `Tried to send message '${message.type}' to client '${connectionId}' that does not exist`);
                return;
            }
            webSocket = this.clients[connectionId]
        } else {
            webSocket = connectionId;
        }
        webSocket.send(JSON.stringify(message));
    }

    setSupportedDice(dice: SupportedDiceValue) {
        this.supportedDice = dice;
        this.server?.clients.forEach((ws: DiceServerWebSocket) => {
            this._sendRaw(ws, { type: 'SupportedDice', dice });
        })
    }
}