const puppeteer = require('puppeteer');
const {Configuration, OpenAIApi} = require('openai');
require('dotenv').config();

const openAPIConf = new Configuration({apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAIApi(openAPIConf);

async function solveProblem() {
    // Ouvrez un nouveau navigateur et allez à Codewars
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('https://www.codewars.com/users/sign_in');

    // Connectez-vous à Codewars
    await page.type('#user_email', process.env.CODINGWAR_EMAIL);
    await page.type('#user_password', process.env.CODINGWAR_PASSWORD);
    // click on button write Sign in
    const [button] = await page.$x("//button[contains(text(), 'Sign in')]");
    if (button) {
        await button.click();
    } else {
        throw new Error("Button not found");
    }

    // Accédez à un problème
    await page.waitForNavigation();
    await page.goto('https://www.codewars.com/dashboard');
    await page.click('#personal-trainer-play')

    // Attendez que le problème se charge
    await page.waitForNavigation();

    await page.waitForTimeout(6000); // Attendre 6 secondes


// Attendez que l'élément avec l'id `description` soit rendu
    await page.waitForSelector('#description');


// Obtenez les détails du problème
    const problemDetails = await page.evaluate(() => {
        const descriptionElement = document.querySelector('#description');

        if (descriptionElement) {
            return descriptionElement.innerText;
        } else {
            throw new Error('Element with id "description" not found');
        }
    });

    console.log(problemDetails)
    // Utilisez GPT-4 pour générer une solution
    const prompt = `Solve this coding problem in javascript. Please return only the raw code without any Markdown formatting: ${problemDetails}`;
    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "user", content: prompt},
        ]
    })
    console.log(chatCompletion.data.choices[0].message)
// Entrez la solution dans l'éditeur de code
    await page.evaluate((solution) => {
        // Trouvez l'instance de l'éditeur CodeMirror sur la page
        // Adaptez ceci en fonction de la structure exacte de la page
        const codeMirror = document.querySelector('.CodeMirror').CodeMirror;
        codeMirror.setValue(solution);
    }, chatCompletion.data.choices[0].message.content);

    // Tester la solution
   await page.click('#validate_btn');


    // Fermez le navigateur
    //await browser.close();
}

solveProblem().catch(console.error);
