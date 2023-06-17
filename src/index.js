import puppeteer from 'puppeteer';
import {Configuration, OpenAIApi} from 'openai';
import {config as dotenvConfig} from 'dotenv';
import chalk from 'chalk';
import os from 'os';
import cluster from 'cluster';
import Database from 'better-sqlite3';



dotenvConfig();

let solutionsCount = 0;
let failuresCount = 0;


const openAPIConf = new Configuration({apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAIApi(openAPIConf);

const db = new Database('solutions.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS solutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        solution TEXT,
        name TEXT
    );
`);

async function solveProblem() {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();

    await page.goto('https://www.codewars.com/users/sign_in');

    await page.type('#user_email', process.env.CODINGWAR_EMAIL);
    await page.type('#user_password', process.env.CODINGWAR_PASSWORD);
    const [button] = await page.$x("//button[contains(text(), 'Sign in')]");
    if (button) {
        await button.click();
    } else {
        throw new Error("Sign in button not found");
    }

    await page.waitForNavigation();
    await page.goto('https://www.codewars.com/dashboard');
    await page.click('#personal-trainer-play');

    await page.waitForSelector('.CodeMirror', {visible: true});

    const fullTitle = await page.title();
    const name = fullTitle.split('|')[0].trim(); // Get the problem's name by splitting the title by '|' and taking the first part


    const problemDetails = await page.evaluate(() => {
        const descriptionElement = document.querySelector('#description');
        return descriptionElement ? descriptionElement.innerText : null;
    });

    const prompt = `Solve this coding problem in JavaScript: ${problemDetails}`;
    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}]
    });
    const solution = chatCompletion.data.choices[0].message.content;

    await page.evaluate((solution) => {
        const codeMirror = document.querySelector('.CodeMirror').CodeMirror;
        codeMirror.setValue(solution);
    }, solution);

    await page.click('#validate_btn');
    await page.waitForTimeout(10000);

    // Get the iframe element handle
    const frameElement = await page.$('#runner_frame');
    // Ensure the iframe was found
    if (!frameElement) {
        throw new Error('Runner iframe not found');
    }
    // Get the frame object from the element handle
    const resultFrame = await frameElement.contentFrame();
    // Now, you can interact with the iframe as if it's a page
    const testsPassed = await resultFrame.evaluate(() => {
        const messageElement = document.querySelector('.run-results__congrats');
        return messageElement && window.getComputedStyle(messageElement).display !== 'none' && messageElement.innerText.includes("You have passed all of the tests! :)");
    });

    if (testsPassed) {
        process.send({ solutionFound: true });

        const code = await page.evaluate(() => {
            const codeMirror = document.querySelector('.CodeMirror').CodeMirror;
            return codeMirror.getValue();
        });



        // Insert into the SQLite database
        const stmt = db.prepare("INSERT INTO solutions (url, solution, name) VALUES (?, ?, ?)");
        stmt.run(page.url(), solution, name);

    } else {
        process.send({ solutionFound: false });
    }

    await browser.close();
}

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    const numWorkers = 2 /*os.cpus().length*/;
    // Fork workers.
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

    cluster.on('message', (worker, message) => {
        if (message.solutionFound) {
            solutionsCount++;
            console.log(chalk.green(`Solutions found: ${solutionsCount}`));
        }
        else {
            failuresCount++;
            console.log(chalk.red(`Failures: ${failuresCount}`));
        }
    });

} else {
    console.log(`Worker ${process.pid} started`);
    solveProblem()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(chalk.red(error))
            process.exit(1)
        });
}