import type { WebSocket } from "ws";

/* Shared Types */

export interface RollDescription {
    /**
     * Number of dice, usually the first number in a normal dice notation.
     * E.g.) 4d12 would be an amount of 4
     */
    amount: number;
    /**
     * Number of faces on the die, usually the second number in a normal dice notation.
     * E.g.) 4d12 would be 12 faces
     */
    faces: number;
}

export interface CompletedRollDescription extends RollDescription {
    /**
     * The values rolled for the described dice.
     * completedRolls.length should equal `amount` for this to be a valid completed roll.
     */
    completedRolls: number[];
}

export type SupportedDiceValue = (number | 'all')[];


/* Shared Message Types */

interface Ping {
    type: 'Ping';
}

interface Pong {
    type: 'Pong'
}

export type DiceSharedMessage = Ping | Pong;

/* Messages that come from the server */

interface ServerVersion {
    type: 'ServerVersion';
    version: number;
}

interface SupportedDice {
    type: 'SupportedDice';
    dice: SupportedDiceValue;
}

interface RollResponse {
    type: 'RollResponse';
    id: string;
    rolls: CompletedRollDescription[];
}

export type DiceServerMessage = ServerVersion | SupportedDice | RollResponse | DiceSharedMessage;


/* Messages that come from the client */

interface RollRequest {
    type: 'RollRequest';
    id: string;
    rolls: RollDescription[];
}

interface CancelRollRequest {
    type: 'CancelRollRequest';
    id: string;
}

export type DiceClientMessage = RollRequest | CancelRollRequest | DiceSharedMessage;

/* Additional property added to websocket for server */

export type DiceServerWebSocket = WebSocket & { isAlive?: boolean };

/* Event Map for a DiceServer */

export type DiceServerEventMap = {
    /**
     * Fired when a new connection is established
     * Arguments: Connection Id, WebSocket
     */
    onConnection: [string, DiceServerWebSocket];
    /**
     * Fired when a connection is closed, all pending requests for the client should be cancelled
     * Arguments: Connection Id
     */
    onConnectionClose: [string];
    /**
     * Fired when the server closes
     */
    onClose: [];
    /**
     * Fired when ever there is an error.
     * Arguments: Error, Connection Id if applicable
     */
    onError: [Error, string?];
    /**
     * Fired when a roll request is made from a client
     * Arguments: Connection Id, Roll Request Id, Roll Descriptions
     */
    onRollRequest: [string, string, RollDescription[]];
    /**
     * Fired when a client cancels a roll request
     * Arguments: Connection Id, Roll Request Id
     */
    onCancelRollRequest: [string, string];
}

/* Event Map for a DiceClient */

// export type DiceClientEventMap = {
//     /**
//      * Fired when connected to the dice server.
//      */
//     onOpen: [];
//     /**
//      * Fired when connection to the dice server closes.
//      */
//     onClose: [];
//     /**
//      * Fired when ever there is an error.
//      * Arguments: Error
//      */
//     onError: [Error];
//     /**
//      * Fired when the server returns a roll response.
//      * Arguments: Roll id, Completed rolls
//      */
//     onRollResponse: [string, CompletedRollDescription[]];
//     /**
//      * Fired when the server returns a roll response.
//      * Arguments: Supported dice
//      */
//     onSupportedDiceUpdated: [SupportedDiceValue];
//     /**
//      * Fired when the server returns a roll response.
//      * Arguments: Roll id
//      */
//     onRollCancelled: [string];
// }

export type DiceClientEventMap = {
    /**
     * Fired when connected to the dice server.
     */
    onOpen?: () => void;
    /**
     * Fired when connection to the dice server closes.
     */
    onClose?: () => void;
    /**
     * Fired when ever there is an error.
     * Arguments: Error
     */
    onError?: (err: Error) => void;
    /**
     * Fired when the server returns a roll response.
     * Arguments: Roll id, Completed rolls
     */
    onRollResponse?: (rollId: string, completedRolls: CompletedRollDescription[]) => void;
    /**
     * Fired when the server returns a roll response.
     * Arguments: Supported dice
     */
    onSupportedDiceUpdated?: (supportedDice: SupportedDiceValue) => void;
    /**
     * Fired when the server returns a roll response.
     * Arguments: Roll id
     */
    onRollCancelled?: (rollId: string) => void;
}