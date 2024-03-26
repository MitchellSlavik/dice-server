import inquirer, { Answers, DistinctQuestion } from 'inquirer';
import { DiceServer } from '../src/dice-server';
import { CompletedRollDescription } from '../src/types';

const diceServer = new DiceServer([4, 6, 8, 12, 20, 100]);

diceServer.on('onConnection', (connectionId) => {
    console.log(`Client ${connectionId} connected`);
})

diceServer.on('onConnectionClose', (connectionId) => {
    console.log(`Client ${connectionId} disconnected`);
})

diceServer.on('onRollRequest', (connectionId, rollId, rollDescriptions) => {
    const questions: DistinctQuestion<Answers>[] = [];


    const diceStr = rollDescriptions.map((curr, i, arr) => (arr.length > 1 && i === arr.length - 1 ? "and " : "") + `${curr.amount}d${curr.faces}`).join(", ");
    console.log("Processing rolls for", connectionId, "with roll id", rollId, "which consists of", diceStr);

    rollDescriptions.forEach(r => {
        for(let i = 0; i < r.amount; i++) {
            questions.push({
                name: `d${r.faces} roll${i+1}`,
                type: 'number'
            })
        };
    });

    inquirer.prompt(
        questions
    ).then((answers) => {
        let rolls: CompletedRollDescription[] = [];

        Object.keys(answers).forEach((k) => {
            let [d] = k.split(" ");
            let f = parseInt(d.substring(1));

            let i = rolls.findIndex((ro) => ro.faces === f);

            if(i < 0) {
                rolls.push({ faces: f, amount: 1, completedRolls: [answers[k]] });
            } else {
                rolls[i].amount += 1;
                rolls[i].completedRolls.push(answers[k]);
            }
        })

        diceServer.sendRollResponse(connectionId, rollId, rolls);
    })
})

diceServer.open({ port: 3423 });
