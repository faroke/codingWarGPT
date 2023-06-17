# CodingWarGPT
CodingWarGPT is an automated application that leverages OpenAI's GPT-3.5-turbo AI model to solve programming problems on [Codewars](https://www.codewars.com/). It uses Puppeteer to automate browser navigation and interact with the webpage.

## Setup 
Before getting started, make sure you have [Node.js](https://nodejs.org/) installed on your system.

You then need to clone the repository and install dependencies:
```bash
git clone https://github.com/faroke/codingWarGPT.git
cd codingWarGPT
npm install
```
Next, create a .env file at the root of the project with your Codewars credentials and OpenAI API key:
```env
CODINGWAR_EMAIL=your@email.com
CODINGWAR_PASSWORD=your_password
OPENAI_API_KEY=your_api_key
```

## Usage
You can start the application with the following command:
```bash
npm start
```
The application will open a new browser instance, log into Codewars, navigate to a new problem, extract the problem details, generate a solution using GPT-3.5-turbo, and input the solution into the code editor. Finally, it will click the "Test" button to test the solution.

## Customizing the AI model
You can modify the AI model used for generating solutions by editing the following line in src/index.js:
```js
model: 'gpt-3.5-turbo', // Change this to any model from https://beta.openai.com/docs/engines
```
Just replace "gpt-3.5-turbo" with the identifier of the model you wish to use. Note that different models may require different types of prompts and provide responses in different formats.

## License
This project is licensed under the ISC license. See LICENSE file for more details.

## Contributing
Contributions are welcome. Feel free to open an issue or submit a pull request.

## Contact 
If you have any questions or comments, please contact [Yann Faussette](mailto=yann.fo7@gmail.com).

## Disclaimer
This project is for educational and demonstration purposes only. It's not recommended to use this project to cheat on Codewars or any other learning platform. Learning to program requires personal practice and thought. Use this project as a resource to understand how to solve certain problems, but make sure to do the work yourself.

