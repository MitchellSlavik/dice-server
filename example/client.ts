import inquirer from "inquirer";
import { DiceClient } from "../src/dice-client";
import { RollDescription } from "../src/types";
import * as WebSocket from "ws";

//@ts-ignore
const diceClient = new DiceClient(WebSocket.WebSocket);

diceClient.connect("ws://localhost:3423");

let recordedDice: RollDescription[] = [];

const prompt = () => {
    inquirer.prompt(
        [
            { name: 'faces',message:"How many faces are on the die that you want to roll?", type: 'number' },
            { name: 'amount',message:"How many of these dice do you want to roll?", type: 'number' },
            {name: 'more', message:"Add more dice to request?", type: 'confirm'}
        ]
    ).then((answers) => {
        recordedDice.push({ amount: answers.amount, faces: answers.faces });
        
        if (!answers.more) {
            const {promise, rollId} = diceClient.requestRollPromise(recordedDice);
            recordedDice = [];
            console.log(`Request ${rollId} sent to server.`);

            promise.then(({ completedRolls }) => {
                console.log(`Request ${rollId} completed, results:`);
                completedRolls.forEach(({faces, amount, completedRolls: cr}) => {
                    console.log(`${amount}d${faces}: [${cr.join(", ")}]`);
                });
            });

        }

        prompt();
    })
}

prompt();