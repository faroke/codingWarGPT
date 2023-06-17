import puppeteer from 'puppeteer';
import { Configuration, OpenAIApi } from 'openai';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';

dotenvConfig();

const openAPIConf = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(openAPIConf);

async function solveProblem() {
    console.log(chalk.blue('Starting the browser...'));
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    console.log(chalk.blue('Navigating to Codewars...'));
    await page.goto('https://www.codewars.com/users/sign_in');

    console.log(chalk.blue('Logging in...'));
    await page.type('#user_email', process.env.CODINGWAR_EMAIL);
    await page.type('#user_password', process.env.CODINGWAR_PASSWORD);
    const [button] = await page.$x("//button[contains(text(), 'Sign in')]");
    if (button) {
        await button.click();
    } else {
        throw new Error("Sign in button not found");
    }

    console.log(chalk.blue('Navigating to problem...'));
    await page.waitForNavigation();
    await page.goto('https://www.codewars.com/dashboard');
    await page.click('#personal-trainer-play');

    console.log(chalk.blue('Waiting for the problem to load...'));
    await page.waitForSelector('.CodeMirror', { visible: true });


    console.log(chalk.blue('Fetching problem details...'));
    const problemDetails = await page.evaluate(() => {
        const descriptionElement = document.querySelector('#description');
        return descriptionElement ? descriptionElement.innerText : null;
    });

    console.log(chalk.blue('Generating solution...'));
    const prompt = `Solve this coding problem in JavaScript: ${problemDetails}`;
    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}]
    });
    const solution = chatCompletion.data.choices[0].message.content;

    console.log(chalk.blue('Entering solution in code editor...'));
    await page.evaluate((solution) => {
        const codeMirror = document.querySelector('.CodeMirror').CodeMirror;
        codeMirror.setValue(solution);
    }, solution);

    console.log(chalk.blue('Testing the solution...'));
    await page.click('#validate_btn');
    await page.waitForTimeout(10000);

    console.log(chalk.blue('Checking test results...'));
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
        console.log(chalk.green('All tests passed. You are so smart!'));

    } else {
        console.log(chalk.red('Not all tests passed.'));
    }

    console.log(chalk.blue('Closing the browser...'));
    await browser.close();
}

solveProblem()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(chalk.red(error))
        process.exit(1)
    });
